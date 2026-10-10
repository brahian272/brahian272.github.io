// ======================================================
// HUELLAS DEL VALLE - APP.JS
// Conexión: Página Web -> Make Webhook
// ======================================================

// URL DEL WEBHOOK DE MAKE
const WEBHOOK_URL = "https://hook.us2.make.com/yl76dg8e14ihpszcjmjosb3nrlyrjgri";

// ======================================================
// AGENDA DE DEMOSTRACIÓN
// ======================================================

const DEMO_AGENDA = [
  {
    franja: "2026-10-14 08:00",
    fecha: "2026-10-14",
    hora: "08:00",
    cupo: 3,
    ocupados: 0
  },
  {
    franja: "2026-10-14 09:00",
    fecha: "2026-10-14",
    hora: "09:00",
    cupo: 3,
    ocupados: 1
  },
  {
    franja: "2026-10-14 10:00",
    fecha: "2026-10-14",
    hora: "10:00",
    cupo: 3,
    ocupados: 2
  },
  {
    franja: "2026-10-14 11:00",
    fecha: "2026-10-14",
    hora: "11:00",
    cupo: 3,
    ocupados: 3
  },
  {
    franja: "2026-10-15 08:00",
    fecha: "2026-10-15",
    hora: "08:00",
    cupo: 3,
    ocupados: 0
  },
  {
    franja: "2026-10-15 09:00",
    fecha: "2026-10-15",
    hora: "09:00",
    cupo: 3,
    ocupados: 1
  },
  {
    franja: "2026-10-15 10:00",
    fecha: "2026-10-15",
    hora: "10:00",
    cupo: 3,
    ocupados: 2
  },
  {
    franja: "2026-10-15 11:00",
    fecha: "2026-10-15",
    hora: "11:00",
    cupo: 3,
    ocupados: 3
  }
];

// ======================================================
// VARIABLES
// ======================================================

let agenda = JSON.parse(
  localStorage.getItem("huellas_agenda")
) || DEMO_AGENDA;

let citas = JSON.parse(
  localStorage.getItem("huellas_citas")
) || [];

// ======================================================
// ELEMENTOS HTML
// ======================================================

const form = document.getElementById("appointmentForm");
const mensaje = document.getElementById("mensaje");
const agendaBody = document.getElementById("agendaBody");

// ======================================================
// MOSTRAR MENSAJES
// ======================================================

function mostrarMensaje(texto, tipo = "info") {
  if (!mensaje) {
    alert(texto);
    return;
  }

  mensaje.textContent = texto;
  mensaje.className = "mensaje " + tipo;
}

// ======================================================
// GUARDAR DATOS
// ======================================================

function guardarDatos() {
  localStorage.setItem(
    "huellas_agenda",
    JSON.stringify(agenda)
  );

  localStorage.setItem(
    "huellas_citas",
    JSON.stringify(citas)
  );
}

// ======================================================
// BUSCAR FRANJA
// ======================================================

function buscarFranja(fecha, hora) {
  return agenda.find(function (item) {
    return item.fecha === fecha && item.hora === hora;
  });
}

// ======================================================
// VALIDAR CITA DUPLICADA
// ======================================================

function citaDuplicada(mascota, fecha) {
  return citas.some(function (cita) {
    return (
      cita.mascota.toLowerCase() === mascota.toLowerCase() &&
      cita.fecha === fecha &&
      (
        cita.estado === "CONFIRMADA" ||
        cita.estado === "CONFIRMADA CON ALERTA"
      )
    );
  });
}

// ======================================================
// MOSTRAR AGENDA
// ======================================================

function mostrarAgenda() {

  if (!agendaBody) {
    return;
  }

  agendaBody.innerHTML = "";

  agenda.forEach(function (item) {

    const fila = document.createElement("tr");

    const libres = item.cupo - item.ocupados;

    fila.innerHTML = `
      <td>${item.fecha}</td>
      <td>${item.hora}</td>
      <td>${item.cupo}</td>
      <td>${item.ocupados}</td>
      <td>${libres}</td>
    `;

    agendaBody.appendChild(fila);
  });
}

// ======================================================
// ENVIAR DATOS A MAKE
// ======================================================

async function enviarWebhook(datos) {

  try {

    const respuesta = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(datos)
    });

    if (!respuesta.ok) {
      throw new Error(
        "El Webhook respondió con estado " + respuesta.status
      );
    }

    let resultado;

    try {
      resultado = await respuesta.json();
    } catch (error) {
      resultado = {
        resultado: "RECIBIDO",
        mensaje: "Make recibió los datos correctamente."
      };
    }

    return resultado;

  } catch (error) {

    console.error("Error enviando a Make:", error);

    throw error;
  }
}

// ======================================================
// PROCESAR CITA
// ======================================================

async function procesarCita(datos) {

  // ----------------------------------------------------
  // 1. BUSCAR FRANJA
  // ----------------------------------------------------

  const slot = buscarFranja(
    datos.fecha,
    datos.hora
  );

  // ----------------------------------------------------
  // 2. SI NO EXISTE LA FRANJA
  // ----------------------------------------------------

  if (!slot) {

    const incidencia = {
      id_incidencia: "INC-" + Date.now(),
      fecha_hora: new Date().toISOString(),
      mascota: datos.mascota,
      propietario: datos.propietario,
      fecha: datos.fecha,
      hora: datos.hora,
      tipo: "FRANJA_NO_EXISTE",
      resultado: "RUTA DE RESPALDO",
      observacion: "La franja solicitada no existe en la agenda."
    };

    console.warn("Ruta de respaldo:", incidencia);

    mostrarMensaje(
      "La franja solicitada no está disponible en la agenda. La solicitud fue enviada a revisión.",
      "advertencia"
    );

    try {
      await enviarWebhook({
        ...datos,
        resultado: "RUTA DE RESPALDO",
        observacion: "La franja no existe en la agenda."
      });
    } catch (error) {
      console.warn("No fue posible enviar la incidencia a Make.");
    }

    return;
  }

  // ----------------------------------------------------
  // 3. VALIDAR DUPLICADO
  // ----------------------------------------------------

  if (citaDuplicada(datos.mascota, datos.fecha)) {

    mostrarMensaje(
      "La mascota ya tiene una cita confirmada para ese día.",
      "error"
    );

    return;
  }

  // ----------------------------------------------------
  // 4. CALCULAR CUPOS
  // ----------------------------------------------------

  const libresAntes = slot.cupo - slot.ocupados;

  // ----------------------------------------------------
  // 5. VALIDAR SI ESTÁ LLENO
  // ----------------------------------------------------

  if (libresAntes <= 0) {

    mostrarMensaje(
      "Lo sentimos. Esta franja ya está llena. No se registró ninguna cita.",
      "error"
    );

    return;
  }

  // ----------------------------------------------------
  // 6. PREPARAR ESTADO
  // ----------------------------------------------------

  const nuevosOcupados = slot.ocupados + 1;
  const libresDespues = slot.cupo - nuevosOcupados;

  let resultado;

  if (libresDespues <= 1) {
    resultado = "CONFIRMADA CON ALERTA";
  } else {
    resultado = "CONFIRMADA";
  }

  // ----------------------------------------------------
  // 7. DATOS DE LA CITA
  // ----------------------------------------------------

  const cita = {
    id_cita: "CIT-" + Date.now(),
    propietario: datos.propietario,
    correo: datos.correo,
    mascota: datos.mascota,
    especie: datos.especie,
    servicio: datos.servicio,
    fecha: datos.fecha,
    hora: datos.hora,
    franja: datos.franja,
    cuando_se_pidio: datos.cuando_se_pidio,
    resultado: resultado,
    estado: resultado,
    observacion:
      resultado === "CONFIRMADA CON ALERTA"
        ? "Queda un solo cupo disponible."
        : "Cita registrada correctamente."
  };

  // ----------------------------------------------------
  // 8. ACTUALIZAR AGENDA
  // ----------------------------------------------------

  slot.ocupados = nuevosOcupados;

  // ----------------------------------------------------
  // 9. GUARDAR CITA
  // ----------------------------------------------------

  citas.push(cita);

  guardarDatos();

  mostrarAgenda();

  // ----------------------------------------------------
  // 10. ENVIAR A MAKE
  // ----------------------------------------------------

  try {

    const respuestaMake = await enviarWebhook({
      ...datos,
      resultado: resultado,
      libres: libresDespues,
      id_cita: cita.id_cita
    });

    console.log(
      "Respuesta de Make:",
      respuestaMake
    );

  } catch (error) {

    console.error(
      "La cita fue guardada localmente, pero Make no respondió."
    );

    mostrarMensaje(
      "La cita fue registrada, pero hubo un problema al comunicar con Make.",
      "advertencia"
    );

    return;
  }

  // ----------------------------------------------------
  // 11. MENSAJE FINAL
  // ----------------------------------------------------

  if (resultado === "CONFIRMADA CON ALERTA") {

    mostrarMensaje(
      "Cita confirmada. Atención: queda un solo cupo disponible en esta franja.",
      "advertencia"
    );

  } else {

    mostrarMensaje(
      "Cita confirmada correctamente. Cupos disponibles: " +
      libresDespues,
      "exito"
    );
  }

  // ----------------------------------------------------
  // 12. LIMPIAR FORMULARIO
  // ----------------------------------------------------

  if (form) {
    form.reset();
  }
}

// ======================================================
// EVENTO DEL FORMULARIO
// ======================================================

if (form) {

  form.addEventListener("submit", async function (event) {

    event.preventDefault();

    const propietario =
      document.getElementById("propietario")?.value.trim();

    const correo =
      document.getElementById("correo")?.value.trim();

    const mascota =
      document.getElementById("mascota")?.value.trim();

    const especie =
      document.getElementById("especie")?.value;

    const servicio =
      document.getElementById("servicio")?.value;

    const fecha =
      document.getElementById("fecha")?.value;

    const hora =
      document.getElementById("hora")?.value;

    // --------------------------------------------------
    // VALIDACIÓN
    // --------------------------------------------------

    if (
      !propietario ||
      !correo ||
      !mascota ||
      !especie ||
      !servicio ||
      !fecha ||
      !hora
    ) {

      mostrarMensaje(
        "Por favor completa todos los campos.",
        "error"
      );

      return;
    }

    // --------------------------------------------------
    // DATOS PARA MAKE
    // --------------------------------------------------

    const datos = {

      propietario: propietario,

      correo: correo,

      mascota: mascota,

      especie: especie,

      servicio: servicio,

      fecha: fecha,

      hora: hora,

      franja: fecha + " " + hora,

      cuando_se_pidio:
        new Date().toISOString()
    };

    console.log(
      "Datos que se enviarán a Make:",
      datos
    );

    // --------------------------------------------------
    // DESHABILITAR BOTÓN
    // --------------------------------------------------

    const boton =
      form.querySelector("button[type='submit']");

    if (boton) {
      boton.disabled = true;
      boton.textContent = "Procesando...";
    }

    try {

      await procesarCita(datos);

    } catch (error) {

      console.error(
        "Error procesando la cita:",
        error
      );

      mostrarMensaje(
        "Ocurrió un error al procesar la cita.",
        "error"
      );

    } finally {

      if (boton) {
        boton.disabled = false;
        boton.textContent = "Agendar cita";
      }
    }

  });
}

// ======================================================
// INICIALIZAR PÁGINA
// ======================================================

mostrarAgenda();

console.log(
  "Huellas del Valle - app.js cargado correctamente."
);

console.log(
  "Webhook configurado:",
  WEBHOOK_URL
);