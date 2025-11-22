import asyncio
import json
import websockets
import irsdk
import traceback

ir = irsdk.IRSDK()

def safe_read(name, default=0):
    """Lectura simple (solo tu coche, en vivo o replay)."""
    try:
        v = ir[name]
        return float(v) if v is not None else default
    except:
        return default

async def telemetry_loop(ws):
    print("[bridge] telemetry_loop start")

    try:
        # Intentar startup hasta que iRacing esté disponible
        while not ir.is_initialized or not getattr(ir, "is_connected", False):
            try:
                print("[bridge] trying startup()…")
                ir.startup()
            except Exception:
                print("[bridge] startup() failed:")
                traceback.print_exc()

            await asyncio.sleep(0.5)

        print("[bridge] iRacing detected, starting data loop")

        while True:
            try:
                ir.freeze_var_buffer_latest()

                # Si se pierde la conexión
                if not getattr(ir, "is_connected", False):
                    print("[bridge] iRacing disconnected -> closing websocket")
                    try:
                        await ws.close()
                    except:
                        pass
                    return

                # ---- Lectura de TU coche, válida en vivo y replay ----
                throttle = safe_read("Throttle", 0.0)
                brake    = safe_read("Brake", 0.0)

                # clutch invertido, como usas tú
                clutch_raw = safe_read("ClutchRaw", 0.0)
                clutchNorm = 1.0 - clutch_raw

                payload = {
                    "ts": int(asyncio.get_event_loop().time() * 1000),
                    "throttle": throttle,
                    "brake": brake,
                    "clutch": clutchNorm,
                    "speed": safe_read("Speed", 0.0),
                    "gear": int(safe_read("Gear", 0)),
                }

                await ws.send(json.dumps(payload))

            except Exception:
                print("\n[bridge] ERROR EN LOOP:")
                traceback.print_exc()

            await asyncio.sleep(0.016)  # ~60 Hz

    except Exception:
        print("[bridge] ERROR FATAL telemetry_loop:")
        traceback.print_exc()

async def handler(ws):
    print("[bridge] client connected")
    try:
        await telemetry_loop(ws)
    except Exception:
        print("[bridge] handler error:")
        traceback.print_exc()

async def main():
    print("Starting IR bridge WS on ws://localhost:3030")
    async with websockets.serve(handler, "localhost", 3030):
        await asyncio.Future()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except Exception:
        print("[bridge] OUTER ERROR:")
        traceback.print_exc()
