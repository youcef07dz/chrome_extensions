const enabledToggle = document.getElementById("enabled-toggle");
const canvasToggle = document.getElementById("canvas-toggle");
const fontsToggle = document.getElementById("fonts-toggle");
const webglToggle = document.getElementById("webgl-toggle");
const audioToggle = document.getElementById("audio-toggle");

function loadSettings(settings) {
  enabledToggle.checked = settings.enabled;
  canvasToggle.checked = settings.canvas;
  fontsToggle.checked = settings.fonts;
  webglToggle.checked = settings.webgl;
  audioToggle.checked = settings.audio;
}

function saveSettings() {
  chrome.runtime.sendMessage({
    type: "updateSettings",
    settings: {
      enabled: enabledToggle.checked,
      canvas: canvasToggle.checked,
      fonts: fontsToggle.checked,
      webgl: webglToggle.checked,
      audio: audioToggle.checked,
    },
  });
}

enabledToggle.addEventListener("change", saveSettings);
canvasToggle.addEventListener("change", saveSettings);
fontsToggle.addEventListener("change", saveSettings);
webglToggle.addEventListener("change", saveSettings);
audioToggle.addEventListener("change", saveSettings);

chrome.runtime.sendMessage({ type: "getSettings" }, loadSettings);
