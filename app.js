/*
  CONFIGURACIÓN:
  1. Crea el webhook en Make.
  2. Copia aquí la URL del webhook.
  3. Guarda el archivo y abre index.html.

  Mientras WEBHOOK_URL esté vacío, la aplicación funciona en modo DEMO
  para probar la interfaz y los cinco casos sin llamar a Make.
*/

const WEBHOOK_URL = "https://hook.us2.make.com/m4gujibygf0lkieroon8b40j3uxfhiy8";

const demoAgenda = 
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

let appointments = JSON.parse(localStorage.getItem("huellas_citas") || "[]");
let agenda = JSON.parse(localStorage.getItem("huellas_agenda") || "null") || demoAgenda;

function saveData() {
  localStorage.setItem("huellas_citas", JSON.stringify(appointments));
  localStorage.setItem("huellas_agenda", JSON.stringify(agenda));
}

document.querySelectorAll(".nav-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById(btn.dataset.view).classList.add("active");
    if (btn.dataset.view === "agenda") renderAgenda();
  });
});

const form = document.getElementById("appointmentForm");
form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const data = Object.fromEntries(new FormData(form).entries());
  const payload = {
    ...data,
    franja: `${data.fecha} ${data.hora}`,
    cuando_se_pidio: new Date().toISOString(),
  };

  if (!WEBHOOK_URL) {
    const response = processDemo(payload);
    showResult(response);
    return;
  }

  try {
    const response = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    showResult(result);
  } catch (error) {
    showResult({
      resultado: "ERROR",
      mensaje: "No fue posible comunicarse con el servicio de agendamiento."
    });
  }
});

function processDemo(data) {
  const slot = agenda.find(a => a.fecha === data.fecha && a.hora === data.hora);

  if (!slot) {
    return {
      resultado: "RESPALDO",
      mensaje: "La franja no existe en la agenda. La solicitud quedó registrada para revisión."
    };
  }

  const duplicate = appointments.some(a =>
    a.mascota.toLowerCase() === data.mascota.toLowerCase() &&
    a.fecha === data.fecha &&
    ["CONFIRMADA", "CONFIRMADA CON ALERTA"].includes(a.resultado)
  );

  if (duplicate) {
    return {
      resultado: "RECHAZADA",
      mensaje: "La mascota ya tiene una cita registrada para ese día."
    };
  }

  const libresAntes = slot.cupo - slot.ocupados;

  if (libresAntes <= 0) {
    return {
      resultado: "RECHAZADA",
      mensaje: "La franja seleccionada está llena. No se registró ninguna cita."
    };
  }

  slot.ocupados += 1;
  const libres = slot.cupo - slot.ocupados;
  const resultado = libres <= 1 ? "CONFIRMADA CON ALERTA" : "CONFIRMADA";

  appointments.push({
    id_cita: "C" + Date.now(),
    ...data,
    resultado,
    estado: "AGENDADA",
    libres
  });

  saveData();

  return {
    resultado,
    mensaje: resultado === "CONFIRMADA CON ALERTA"
      ? "La cita fue registrada y la franja quedó con 1 o 0 cupos libres. Administración debe ser notificada."
      : "La cita fue registrada correctamente.",
    libres,
    cupo: slot.cupo,
    ocupados: slot.ocupados
  };
}

function showResult(response) {
  const box = document.getElementById("result");
  box.className = "result";

  const result = String(response.resultado || "").toUpperCase();

  if (result.includes("CONFIRMADA CON ALERTA")) box.classList.add("warning");
  else if (result === "CONFIRMADA") box.classList.add("success");
  else if (result === "RECHAZADA") box.classList.add("error");
  else box.classList.add("warning");

  box.innerHTML = `
    <h3>${result || "RESPUESTA DEL SISTEMA"}</h3>
    <p>${response.mensaje || "El sistema procesó la solicitud."}</p>
    ${response.libres !== undefined ? `<p><strong>Cupos libres:</strong> ${response.libres}</p>` : ""}
  `;

  box.classList.remove("hidden");
  form.reset();
}

const agendaDate = document.getElementById("agendaDate");
agendaDate.value = "2026-10-14";

agendaDate.addEventListener("change", renderAgenda);
document.getElementById("refreshAgenda").addEventListener("click", renderAgenda);

function renderAgenda() {
  const date = agendaDate.value;
  const body = document.getElementById("agendaBody");
  const empty = document.getElementById("emptyAgenda");

  const rows = appointments
    .filter(a => a.fecha === date)
    .sort((a, b) => a.hora.localeCompare(b.hora));

  body.innerHTML = "";
  document.getElementById("appointmentCount").textContent =
    `${rows.length} registro${rows.length === 1 ? "" : "s"}`;

  rows.forEach(a => {
    const statusClass =
      a.resultado === "CONFIRMADA" ? "status-confirmada" :
      a.resultado === "CONFIRMADA CON ALERTA" ? "status-alerta" :
      "status-rechazada";

    body.innerHTML += `
      <tr>
        <td>${a.hora}</td>
        <td>${escapeHtml(a.mascota)}</td>
        <td>${escapeHtml(a.especie)}</td>
        <td>${escapeHtml(a.propietario)}</td>
        <td>${escapeHtml(a.servicio)}</td>
        <td><span class="status ${statusClass}">${escapeHtml(a.resultado)}</span></td>
      </tr>
    `;
  });

  empty.classList.toggle("hidden", rows.length !== 0);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

renderAgenda();
