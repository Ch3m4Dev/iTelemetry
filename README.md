# iTelemetry Overlay

Overlay ligero para iRacing que muestra gráficas en tiempo real de **Throttle**, **Brake** y **Clutch**. Diseñado para ser totalmente transparente, movable y compatible con grabadores de pantalla como OBS.

---

## 🚀 Características principales

- Overlay transparente siempre por encima del juego.
- Gráfica de acelerador, freno y embrague.
- Auto-ocultación cuando iRacing no envía telemetría.
- Modo interactivo para mover y redimensionar.
- Icono en la bandeja del sistema (Windows Tray).
- Atajos globales de teclado.

---

## ⌨️ Shortcuts disponibles

### **CTRL + SHIFT + O** — Modo interactivo
Esta funcionalidad NO funciona en Windows 10, para redimensionar y ajustar posicion podran hacerlo desde el icono en la bandeja del sistema, haciendo click derecho en el icono del programa y clicando en "Overlay Settings".
Alterna entre:

- **Modo Overlay** (clic-through, no interactivo, no mueve ni redimensiona)
- **Modo Interactivo** (puedes mover y redimensionar el overlay)

### **CTRL + SHIFT + S** — Mostrar/Ocultar manualmente
- Solo funciona cuando iRacing *no está enviando telemetría*.
- Permite mostrar/ocultar el overlay manualmente.
- Cuando iRacing comience a enviar datos, el modo manual **se desactiva automáticamente**.

### **CTRL + SHIFT + Q** — Salir del overlay
Cierra completamente el programa.

---

## 🪟 Icono en la bandeja (Tray Icon)

Cuando el programa está abierto, aparece un icono en la bandeja del sistema.  
Click derecho → **Cerrar Overlay**

---

## 📦 Instalación

1. Descarga el archivo **iTelemetry_Setup.exe** desde la sección de *Releases*.
2. Ejecuta el instalador.
3. El overlay se iniciará automáticamente.

> ⚠️ Al no estar firmado, Windows puede mostrar un aviso de seguridad. Es normal.

---

## 🔄 Actualización

Cada vez que el programa se abre, se ejecuta un AutoUpdate para actualizarse automaticamente a la ultima version estable (Disponible a partir de la version 1.0.2, cualquier version anterior no contiene esta funcionalidad)

---

## 🧪 Compatibilidad

- Windows 10 — ✔️ (Ver sección de Shortcuts en detalle para entender funcionamiento)
- Windows 11 — ✔️

OBS / Streamlabs → Funciona con *Display Capture*.  
NVIDIA ShadowPlay → No captura overlays externos.
