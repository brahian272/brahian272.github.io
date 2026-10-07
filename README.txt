# Clínica Veterinaria Huellas del Valle

Interfaz propia para el parcial de automatización de agendamiento.

## Archivos

- index.html: interfaz principal.
- styles.css: diseño.
- app.js: lógica de interfaz y modo DEMO.

## Probar sin Make

1. Abre `index.html` en Chrome.
2. Usa fecha `2026-10-14`.
3. Prueba:
   - C1: Luna / Perro / Consulta general / 08:00.
   - C2: Michi / Gato / Vacunación / 10:00.
   - C3: Rocky / Perro / Baño / 11:00.
   - C4: Pelusa / Gato / Consulta general / 2026-10-20 / 08:00.
   - C5: Luna / Perro / Baño / 09:00 después de ejecutar C1.

La versión DEMO guarda temporalmente las citas en localStorage del navegador.

## Conectar con Make

En `app.js`, cambia:

const WEBHOOK_URL = "";

por la URL del webhook del escenario 1 de Make.

El navegador enviará JSON con:

- propietario
- correo
- mascota
- especie
- servicio
- fecha
- hora
- franja
- cuando_se_pidio

Make debe responder JSON mediante Webhook Response. Por ejemplo:

{
  "resultado": "CONFIRMADA",
  "mensaje": "La cita fue registrada correctamente.",
  "libres": 2
}

