const API_BASE_URL = "http://localhost:3000/api/pet";

const statusElements = {
  name: document.querySelector("#pet-name"),
  level: document.querySelector("#pet-level"),

};

const logList = document.querySelector("#log-list");
const logItemTemplate = document.querySelector("#log-item-template");
const refreshButton = document.querySelector("#refresh-status");
const actionForm = document.querySelector("#action-form");

async function fetchPetStatus() {
  try {
    const response = await fetch(`${API_BASE_URL}/status`);
    if (!response.ok) {
      throw new Error(`Error ${response.status}: no se pudo obtener el estado`);
    }

    const data = await response.json();
    renderStatus(data);
    appendToLog(
      "Estado",
      data.message || "Estado actualizado desde el backend."
    );
  } catch (error) {
    console.error(error);
    appendToLog(
      "Error",
      "No se pudo conectar con el backend. Revisa la consola para más detalles."
    );
  }
}

function renderStatus(status) {
  if (status.name) {
    statusElements.name.textContent = status.name;
  }

  if (status.level && status.stage) {
    statusElements.level.textContent = `Nivel ${status.level} · ${status.stage}`;
  } else if (status.level) {
    statusElements.level.textContent = `Nivel ${status.level}`;
  }

}

async function performAction(action, message) {
  try {
    const response = await fetch(`${API_BASE_URL}/interactions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ action, message }),
    });

    if (!response.ok) {
      throw new Error(`Error ${response.status}: no se pudo completar la acción`);
    }

    const data = await response.json();

    if (data.status) {
      renderStatus(data.status);
    }

    appendToLog(
      data.timestamp || new Date().toISOString(),
      data.message || "La mascota ha respondido a tu acción."
    );
  } catch (error) {
    console.error(error);
    appendToLog(
      "Error",
      "No se pudo completar la acción. Verifica tu servidor backend."
    );
  }
}

function appendToLog(timestamp, message) {
  const logItem = logItemTemplate.content.cloneNode(true);
  const timeElement = logItem.querySelector("time");
  const messageElement = logItem.querySelector("p");

  const date = new Date(timestamp);
  if (!Number.isNaN(date.getTime())) {
    timeElement.dateTime = date.toISOString();
    timeElement.textContent = date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  } else {
    timeElement.textContent = timestamp;
  }

  messageElement.textContent = message;
  logList.prepend(logItem);
}

refreshButton.addEventListener("click", () => {
  appendToLog(new Date().toISOString(), "Consultando estado de la mascota...");
  fetchPetStatus();
});

actionForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(actionForm);
  const action = formData.get("action");
  const message = formData.get("message");

  if (!action) {
    return;
  }

  appendToLog(
    new Date().toISOString(),
    `Acción enviada: ${action}${message ? ` · Nota: ${message}` : ""}`
  );

  performAction(action, message);
  actionForm.reset();
});


// Carga inicial
appendToLog(new Date().toISOString(), "Bienvenido. Crea tu backend y comienza a jugar.");
