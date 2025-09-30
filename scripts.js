const API_BASE_URL = "http://localhost:3000/api/pet";

const statusElements = {
  name: document.querySelector("#pet-name"),
  level: document.querySelector("#pet-level"),
  attributeSelector: document.querySelector("#attribute-selector"),
  attributeTitle: document.querySelector("#attribute-title"),
  attributeText: document.querySelector("#attribute-text"),
  attributeMeter: document.querySelector("#attribute-meter"),
  attributeProgress: document.querySelector("#attribute-progress"),
  attributeProgressLabel: document.querySelector("#attribute-progress-label"),
};

let currentStatus = {
  estadoEmocional: "Feliz",
  hambre: 60,
  felicidad: 85,
  energia: 75,
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

  currentStatus = {
    ...currentStatus,
    ...status,
  };

  updateAttributeDisplay(statusElements.attributeSelector.value);
}

function updateAttributeDisplay(attributeKey) {
  if (!attributeKey) return;

  let title = "";
  let description = "";
  let numericValue = null;

  switch (attributeKey) {
    case "estadoEmocional":
      title = "Estado emocional";
      description =
        currentStatus.estadoEmocional || "Sin información disponible";
      break;
    case "hambre":
      title = "Nivel de hambre";
      numericValue = currentStatus.hambre;
      description = `Nivel actual: ${formatPercentage(numericValue)}`;
      break;
    case "felicidad":
      title = "Nivel de felicidad";
      numericValue = currentStatus.felicidad;
      description = `Nivel actual: ${formatPercentage(numericValue)}`;
      break;
    case "energia":
      title = "Nivel de energía";
      numericValue = currentStatus.energia;
      description = `Nivel actual: ${formatPercentage(numericValue)}`;
      break;
    default:
      title = attributeKey;
      description = "Sin información disponible";
  }

  statusElements.attributeTitle.textContent = title;
  statusElements.attributeText.textContent = description;

  if (typeof numericValue === "number" && !Number.isNaN(numericValue)) {
    const clampedValue = clamp(numericValue, 0, 100);
    statusElements.attributeProgress.value = clampedValue;
    statusElements.attributeProgressLabel.textContent = `${clampedValue}%`;
    statusElements.attributeMeter.hidden = false;
  } else {
    statusElements.attributeMeter.hidden = true;
  }
}

function formatPercentage(value) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "N/D";
  }
  const clampedValue = clamp(value, 0, 100);
  return `${clampedValue}%`;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(value, max));
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

if (statusElements.attributeSelector) {
  statusElements.attributeSelector.addEventListener("change", (event) => {
    updateAttributeDisplay(event.target.value);
  });

  updateAttributeDisplay(statusElements.attributeSelector.value);
}

// Carga inicial
appendToLog(new Date().toISOString(), "Bienvenido. Crea tu backend y comienza a jugar.");
