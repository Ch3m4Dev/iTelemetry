import asyncio
import json
import websockets
import irsdk
import traceback
import sys
import traceback

def safe_print(*a, **k):
   print(*a, **k, file=sys.stderr)

ir = irsdk.IRSDK()
safe_print("[BRIDGE] archivo cargado")

def safe_read(name, default=0):
    """Lectura simple (solo tu coche, en vivo o replay)."""
    try:
        v = ir[name]
        return float(v) if v is not None else default
    except:
        return default

async def telemetry_loop(ws):
    safe_print("[bridge] telemetry_loop start")

    try:
        # Intentar startup hasta que iRacing esté disponible
        while not ir.is_initialized or not getattr(ir, "is_connected", False):
            try:
                safe_print("[bridge] trying startup()…")
                ir.startup()
            except Exception:
                safe_print("[bridge] startup() failed:")
                traceback.print_exc()

            await asyncio.sleep(0.5)

        safe_print("[bridge] iRacing detected, starting data loop")

        while True:
            try:
                ir.freeze_var_buffer_latest()

                # Si se pierde la conexión
                if not getattr(ir, "is_connected", False):
                    safe_print("[bridge] iRacing disconnected -> closing websocket")
                    try:
                        await ws.close()
                    except:
                        pass
                    return
                # ---- Lectura de TU coche ----
                throttle = safe_read("Throttle", 0.0)
                brake    = safe_read("Brake", 0.0)
                clutch_raw = safe_read("ClutchRaw", 0.0)
                clutchNorm = 1.0 - clutch_raw

                lap_dist_pct      = safe_read("LapDistPct", None)
                lap_current_time  = safe_read("LapCurrentLapTime", None)
                lap_best          = safe_read("LapBestLapTime", None)
                sectorNum         = int(safe_read("SectorNum", 0))
                playerTrackSurface = safe_read("PlayerTrackSurface", "Unknown")
                isOnTrack         = safe_read("IsOnTrack", 0)
                playerCarLap      = safe_read("Lap", None)
                sessionState      = safe_read("SessionState", None)
                sessionTime       = safe_read("SessionTime", None)

                # DELTA OFICIAL
                lap_delta_best = safe_read("LapDeltaToSessionBestLap", None)


                payload = {
                    "ts": int(asyncio.get_event_loop().time() * 1000),

                    # Inputs (otro overlay)
                    "throttle": throttle,
                    "brake": brake,
                    "clutch": clutchNorm,
                    "speed": safe_read("Speed", 0.0),
                    "gear": int(safe_read("Gear", 0)),

                    # Datos para delta + microsectores
                    "LapDistPct": lap_dist_pct,
                    "LapCurrentLapTime": lap_current_time,
                    "LapBestLapTime": lap_best,
                    "LapDeltaToSessionBestLap": lap_delta_best,
                    "PlayerCarLap": playerCarLap,

                    # Sectores
                    "SectorNum": sectorNum,

                    # Estado del coche
                    "PlayerTrackSurface": playerTrackSurface,
                    "IsOnTrack": isOnTrack,

                    # Estado sesión
                    "SessionState": sessionState,
                    "SessionTime": sessionTime,
                }

                await ws.send(json.dumps(payload))

            except Exception:
                safe_print("\n[bridge] ERROR EN LOOP:")
                traceback.print_exc()

            await asyncio.sleep(0.016)  # ~60 Hz

    except Exception:
        safe_print("[bridge] ERROR FATAL telemetry_loop:")
        traceback.print_exc()

async def handler(ws):
    safe_print("[bridge] client connected")
    try:
        await telemetry_loop(ws)
    except Exception:
        safe_print("[bridge] handler error:")
        traceback.print_exc()

async def main():
    safe_print("Starting IR bridge WS on ws://localhost:3030")
    async with websockets.serve(handler, "localhost", 3030):
        await asyncio.Future()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except Exception:
        safe_print("[bridge] OUTER ERROR:")
        traceback.print_exc()
