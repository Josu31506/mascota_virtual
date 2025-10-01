const API_BASE_URL = "http://localhost:3000/api/pet";

const ui = {
  name: document.querySelector("#pet-name"),
  level: document.querySelector("#pet-level"),
  attributeSelector: document.querySelector("#attribute-selector"),
  attributeTitle: document.querySelector("#attribute-title"),
  attributeText: document.querySelector("#attribute-text"),
  attributeMeter: document.querySelector("#attribute-meter"),
  attributeProgress: document.querySelector("#attribute-progress"),
  attributeProgressLabel: document.querySelector("#attribute-progress-label"),
  refreshButton: document.querySelector("#refresh-status"),
  actionForm: document.querySelector("#action-form"),
  quickActionButtons: document.querySelectorAll(
    ".side-panel--actions [data-action-button], .mobile-actions [data-action-button]"
  ),
  logList: document.querySelector("#log-list"),
  logItemTemplate: document.querySelector("#log-item-template"),
  clearLogButton: document.querySelector("#clear-log"),
  chatButton: document.querySelector("#open-chat"),
  dailyExp: document.querySelector("#daily-exp"),
  dailyExpLabel: document.querySelector("#daily-exp-label"),
  sessionTimer: document.querySelector("#session-timer"),
  sheetToggles: document.querySelectorAll("[data-sheet-toggle]"),
  sheets: document.querySelectorAll("[data-sheet]"),
  sheetToggleWrapper: document.querySelector(".mobile-sheet-toggles"),
};

const sheetElements = new Map(
  Array.from(ui.sheets || []).map((sheet) => [sheet.dataset.sheet, sheet])
);

const sheetToggleButtons = new Map(
  Array.from(ui.sheetToggles || []).map((button) => [
    button.dataset.sheetToggle,
    button,
  ])
);

const sheetMediaQuery =
  typeof window !== "undefined" && typeof window.matchMedia === "function"
    ? window.matchMedia("(max-width: 840px)")
    : null;

let isSheetMode = false;

let currentStatus = {
  estadoEmocional: "Feliz",
  hambre: 60,
  felicidad: 85,
  energia: 75,
  dailyExp: {
    current: 30,
    max: 100,
  },
};

function startTimer() {
  const startTime = Date.now();
  updateTimer(startTime);
  setInterval(() => updateTimer(startTime), 1000);
}

function updateTimer(startTime) {
  if (!ui.sessionTimer) return;
  const elapsed = Math.floor((Date.now() - startTime) / 1000);
  const hours = String(Math.floor(elapsed / 3600)).padStart(2, "0");
  const minutes = String(Math.floor((elapsed % 3600) / 60)).padStart(2, "0");
  const seconds = String(elapsed % 60).padStart(2, "0");
  ui.sessionTimer.textContent = `${hours}:${minutes}:${seconds}`;
}

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
  if (!status) return;

  if (status.name && ui.name) {
    ui.name.textContent = status.name;
  }

  if (status.level && status.stage && ui.level) {
    ui.level.textContent = `Nivel ${status.level} · ${status.stage}`;
  } else if (status.level && ui.level) {
    ui.level.textContent = `Nivel ${status.level}`;
  }

  if (status.dailyExp && typeof status.dailyExp === "object") {
    currentStatus.dailyExp = {
      current: clamp(Number(status.dailyExp.current) || 0, 0, 999),
      max: Math.max(Number(status.dailyExp.max) || 1, 1),
    };
  }

  currentStatus = {
    ...currentStatus,
    ...status,
  };

  updateDailyExpDisplay();
  updateAttributeDisplay(ui.attributeSelector?.value);
}

function updateDailyExpDisplay() {
  if (!ui.dailyExp || !ui.dailyExpLabel) return;
  const { current, max } = currentStatus.dailyExp;
  ui.dailyExp.value = clamp(current, 0, max);
  ui.dailyExp.max = max;
  ui.dailyExpLabel.textContent = `${current}/${max}`;
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

  if (ui.attributeTitle) {
    ui.attributeTitle.textContent = title;
  }
  if (ui.attributeText) {
    ui.attributeText.textContent = description;
  }

  if (
    typeof numericValue === "number" &&
    !Number.isNaN(numericValue) &&
    ui.attributeMeter &&
    ui.attributeProgress &&
    ui.attributeProgressLabel
  ) {
    const clampedValue = clamp(numericValue, 0, 100);
    ui.attributeProgress.value = clampedValue;
    ui.attributeProgressLabel.textContent = `${clampedValue}%`;
    ui.attributeMeter.hidden = false;
  } else if (ui.attributeMeter) {
    ui.attributeMeter.hidden = true;
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
  if (!ui.logItemTemplate || !ui.logList) return;
  const logItem = ui.logItemTemplate.content.cloneNode(true);
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
  ui.logList.prepend(logItem);
}

function initializeSheets() {
  if (!sheetElements.size) {
    return;
  }

  if (ui.sheetToggleWrapper) {
    ui.sheetToggleWrapper.hidden = true;
  }

  sheetToggleButtons.forEach((button) => {
    button.hidden = true;
  });

  if (!sheetMediaQuery) {
    return;
  }

  handleSheetMode(sheetMediaQuery.matches);

  const handleChange = (event) => {
    handleSheetMode(event.matches);
  };

  if (typeof sheetMediaQuery.addEventListener === "function") {
    sheetMediaQuery.addEventListener("change", handleChange);
  } else if (typeof sheetMediaQuery.addListener === "function") {
    sheetMediaQuery.addListener(handleChange);
  }
}

function handleSheetMode(matches) {
  isSheetMode = matches;

  if (ui.sheetToggleWrapper) {
    ui.sheetToggleWrapper.hidden = !matches;
  }

  sheetToggleButtons.forEach((button) => {
    button.hidden = !matches;
    button.setAttribute("aria-expanded", "false");
  });

  sheetElements.forEach((sheet, key) => {
    if (matches) {
      sheet.classList.add("as-sheet");
      closeSheet(key);
    } else {
      sheet.classList.remove("as-sheet", "is-open");
      sheet.removeAttribute("aria-hidden");
    }
  });
}

function openSheet(sheetName) {
  const sheet = sheetElements.get(sheetName);
  if (!sheet) return;

  sheet.classList.add("is-open");
  sheet.setAttribute("aria-hidden", "false");

  const toggle = sheetToggleButtons.get(sheetName);
  toggle?.setAttribute("aria-expanded", "true");
}

function closeSheet(sheetName) {
  const sheet = sheetElements.get(sheetName);
  if (!sheet) return;

  sheet.classList.remove("is-open");

  if (isSheetMode) {
    sheet.setAttribute("aria-hidden", "true");
  } else {
    sheet.removeAttribute("aria-hidden");
  }

  const toggle = sheetToggleButtons.get(sheetName);
  toggle?.setAttribute("aria-expanded", "false");
}

function toggleSheet(sheetName) {
  if (!isSheetMode) return;

  const sheet = sheetElements.get(sheetName);
  if (!sheet) return;

  const shouldOpen = !sheet.classList.contains("is-open");

  sheetElements.forEach((_, key) => {
    if (key !== sheetName) {
      closeSheet(key);
    }
  });

  if (shouldOpen) {
    openSheet(sheetName);
  } else {
    closeSheet(sheetName);
  }
}

function bindEvents() {
  ui.attributeSelector?.addEventListener("change", (event) => {
    updateAttributeDisplay(event.target.value);
  });

  ui.refreshButton?.addEventListener("click", () => {
    appendToLog(new Date().toISOString(), "Consultando estado de la mascota...");
    fetchPetStatus();
  });

  ui.actionForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(ui.actionForm);
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
    ui.actionForm.reset();
  });

  ui.quickActionButtons?.forEach((button) => {
    button.addEventListener("click", () => {
      const action = button.dataset.action;
      if (!action) return;
      appendToLog(
        new Date().toISOString(),
        `Acción rápida: ${action}`
      );
      performAction(action, "");
    });
  });

  ui.sheetToggles?.forEach((button) => {
    const sheetName = button.dataset.sheetToggle;
    if (!sheetName) return;

    button.addEventListener("click", () => {
      toggleSheet(sheetName);
    });
  });

  ui.clearLogButton?.addEventListener("click", () => {
    if (!ui.logList) return;
    ui.logList.innerHTML = "";
  });

  ui.chatButton?.addEventListener("click", () => {
    appendToLog(new Date().toISOString(), "Abriste el chat con tu mascota.");
  });
}

initializeSheets();
bindEvents();
startTimer();
updateAttributeDisplay(ui.attributeSelector?.value || "estadoEmocional");
updateDailyExpDisplay();