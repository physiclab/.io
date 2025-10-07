// Gravity Simulator - Enhanced Version with Fixes (Sound Removed)

const planets = {
  mercury: 3.7,
  venus: 8.87,
  earth: 9.81,
  moon: 1.62,
  mars: 3.71,
  jupiter: 24.79,
  saturn: 10.44,
  uranus: 8.69,
  neptune: 11.15,
};

const objects = {
  ball: "⚽",
  stone: "🪨",
  paper: "📄",
  feather: "🪶",
  pen: "🖊️",
  book: "📚",
  leaf: "🍃",
};

let settings = {
  airResistanceEnabled: false,
  darkMode: false,
  simulationSpeed: 2,
  mass: 1,
  windSpeed: 0,
  windDirection: 'none'
};

function updateUIValues() {
  ["object1", "object2", "object3"].forEach((id) => {
    updateIcon(id, `falling-${id}`);
  });

  ["planet1", "planet2", "planet3"].forEach((id, idx) => {
    updateGravity(id, `gravity-field-meter${idx ? idx + 1 : ""}`, `custom-gravity${idx + 1}`);
  });

  ["height-slider", "height-slider2", "height-slider3"].forEach((id, idx) => {
    updateHeightLabel(id, `height-value${idx ? idx + 1 : ""}`);
  });
}

function updateIcon(selectId, targetId) {
  const selectEl = document.getElementById(selectId);
  const targetEl = document.getElementById(targetId);
  if (!selectEl || !targetEl) return;

  const selected = selectEl.value;
  const icon = objects[selected] || "❓";
  targetEl.textContent = icon;
}

function updateGravity(selectId, targetId, customInputId) {
  const selectEl = document.getElementById(selectId);
  const targetEl = document.getElementById(targetId);
  const customInput = document.getElementById(customInputId);
  if (!selectEl || !targetEl || !customInput) return;

  const selected = selectEl.value.toLowerCase();
  let gravity;

  if (selected === "none") {
    customInput.style.display = "inline-block";
    gravity = parseFloat(customInput.value) || 9.81;
  } else {
    customInput.style.display = "none";
    gravity = planets[selected] || 9.81;
  }

  targetEl.textContent = `Gravity: ${gravity.toFixed(2)} m/s²`;
  updateBackgroundTheme(selected);
}

function updateHeightLabel(sliderId, labelId) {
  const slider = document.getElementById(sliderId);
  const label = document.getElementById(labelId);
  if (!slider || !label) return;
  label.textContent = `Height: ${slider.value} ft`;
}

function getFallTime(heightFt, gravity, airResist) {
  const h = heightFt * 0.3048;
  let t = Math.sqrt((2 * h) / gravity);
  return airResist ? t * 1.5 : t;
}

function animateDrop(objectId, timerId, heightFt, gravity) {
  const icon = document.getElementById(objectId);
  const timer = document.getElementById(timerId);
  if (!icon || !timer) return;

  icon.style.transition = "none";
  icon.style.top = "0px";
  icon.style.left = "50%";
  icon.style.transform = "translateX(-50%)";

  const time = getFallTime(heightFt, gravity, settings.airResistanceEnabled) / settings.simulationSpeed;

  setTimeout(() => {
    const container = icon.parentElement;
    const containerHeight = container.offsetHeight;
    const maxDrop = containerHeight - icon.offsetHeight;

    const dropInMeters = heightFt * 0.3048;
    const pixelsPerMeter = maxDrop / dropInMeters;
    let dropPixels = dropInMeters * pixelsPerMeter;

    dropPixels = Math.min(dropPixels, maxDrop);

    icon.style.transition = `top ${time}s ease-in`;
    icon.style.top = `${dropPixels}px`;

    if (settings.windDirection !== 'none' && settings.windSpeed > 0) {
      simulateWindEffect(icon, settings.windDirection);
    }
  }, 50);

  let remaining = time;
  timer.textContent = `Time: ${remaining.toFixed(2)}s`;
  const interval = setInterval(() => {
    remaining -= 0.1;
    if (remaining <= 0) {
      clearInterval(interval);
      timer.textContent = `Time: ${time.toFixed(2)}s`;
      drawGraph(heightFt, time);
    } else {
      timer.textContent = `Time: ${remaining.toFixed(2)}s`;
    }
  }, 100);
}

function simulateWindEffect(icon, windDirection) {
  icon.style.transition += ", left 2s ease-in-out";
  if (windDirection === 'left') {
    icon.style.left = "calc(50% - 50px)";
  } else if (windDirection === 'right') {
    icon.style.left = "calc(50% + 50px)";
  }
}

function getGravityValue(selectId, customInputId) {
  const selectEl = document.getElementById(selectId);
  const customInput = document.getElementById(customInputId);
  if (!selectEl) return 9.81;
  const selected = selectEl.value.toLowerCase();
  if (selected === "none" && customInput) {
    const customVal = parseFloat(customInput.value);
    return isNaN(customVal) ? 9.81 : customVal;
  } else {
    return planets[selected] || 9.81;
  }
}

function dropObject() {
  const heightSlider = document.getElementById("height-slider");
  if (!heightSlider) return;
  const height = +heightSlider.value;
  const gravity = getGravityValue("planet1", "custom-gravity1");
  animateDrop("falling-object1", "timer1", height, gravity);
  lastDrop = { height, gravity };
  addToHistory(`Dropped ${document.getElementById("object1")?.value} from ${height} ft`);
}

function dropBothObjects() {
  const height2 = +document.getElementById("height-slider2")?.value || 10;
  const height3 = +document.getElementById("height-slider3")?.value || 10;
  const gravity2 = getGravityValue("planet2", "custom-gravity2");
  const gravity3 = getGravityValue("planet3", "custom-gravity3");

  animateDrop("falling-object2", "timer2", height2, gravity2);
  animateDrop("falling-object3", "timer3", height3, gravity3);

  addToHistory(`Compared drop: ${document.getElementById("object2")?.value} vs ${document.getElementById("object3")?.value}`);
}

function toggleDarkMode() {
  // Use global dark mode function if available, otherwise use local
  if (typeof toggleGlobalDarkMode === 'function') {
    toggleGlobalDarkMode();
  } else {
    settings.darkMode = !settings.darkMode;
    document.body.classList.toggle("dark-mode", settings.darkMode);
    const darkModeBtn = document.getElementById("gravityDarkMode");
    if (darkModeBtn) {
      darkModeBtn.textContent = settings.darkMode ? "Switch to Light Mode" : "Switch to Dark Mode";
    }
  }
}

function addToHistory(text) {
  const li = document.createElement("li");
  li.textContent = text;
  document.getElementById("history-list")?.appendChild(li);
}

function updateBackgroundTheme(planet) {
  const body = document.body;
  body.className = body.className.replace(/bg-.*/g, '');
  if (planet !== 'none') {
    body.classList.add(`bg-${planet}`);
  }
}

let lastDrop = null;
function replayLastDrop() {
  if (lastDrop) {
    animateDrop("falling-object1", "timer1", lastDrop.height, lastDrop.gravity);
  }
}

function drawGraph(height, time) {
  const canvas = document.getElementById("graph-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.beginPath();
  ctx.moveTo(0, canvas.height);
  ctx.lineTo(canvas.width, 0);
  ctx.strokeStyle = "blue";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillText(`Time: ${time.toFixed(2)}s`, 10, 20);
  ctx.fillText(`Height: ${height} ft`, 10, 40);
}

window.addEventListener("DOMContentLoaded", () => {
  ["planet1", "planet2", "planet3"].forEach((id, idx) => {
    const parent = document.getElementById(id)?.parentElement;
    if (parent) {
      const input = document.createElement("input");
      input.type = "number";
      input.step = "0.01";
      input.min = "0";
      input.placeholder = "Enter gravity";
      input.id = `custom-gravity${idx + 1}`;
      input.style.display = "none";
      parent.appendChild(input);
    }
  });

  updateUIValues();

  ["object1", "object2", "object3"].forEach(id => {
    document.getElementById(id)?.addEventListener("change", () => updateIcon(id, `falling-${id}`));
  });
  ["planet1", "planet2", "planet3"].forEach((id, idx) => {
    document.getElementById(id)?.addEventListener("change", () => updateGravity(id, `gravity-field-meter${idx ? idx + 1 : ""}`, `custom-gravity${idx + 1}`));
    document.getElementById(`custom-gravity${idx + 1}`)?.addEventListener("input", () => updateGravity(id, `gravity-field-meter${idx ? idx + 1 : ""}`, `custom-gravity${idx + 1}`));
  });
  ["height-slider", "height-slider2", "height-slider3"].forEach((id, idx) => {
    document.getElementById(id)?.addEventListener("input", () => updateHeightLabel(id, `height-value${idx ? idx + 1 : ""}`));
  });

  document.getElementById("drop-button")?.addEventListener("click", dropObject);
  document.getElementById("drop-compare")?.addEventListener("click", dropBothObjects);
  document.getElementById("replay-button")?.addEventListener("click", replayLastDrop);

  document.getElementById("toggle-air-resistance")?.addEventListener("change", e => settings.airResistanceEnabled = e.target.checked);
  document.getElementById("gravityDarkMode")?.addEventListener("click", toggleDarkMode);
  document.getElementById("compare-toggle")?.addEventListener("click", () => {
    const section = document.getElementById("compare-section");
    if (section) section.style.display = section.style.display === "none" ? "block" : "none";
  });
  document.getElementById("mass-slider")?.addEventListener("input", e => settings.mass = parseFloat(e.target.value));
  document.getElementById("speed-slider")?.addEventListener("input", e => settings.simulationSpeed = parseFloat(e.target.value));
  document.getElementById("wind-strength")?.addEventListener("input", e => settings.windSpeed = parseFloat(e.target.value));
  document.getElementById("wind-direction")?.addEventListener("change", e => settings.windDirection = e.target.value);
});


