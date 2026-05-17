const PAPER_SIZES = {
  letter: { paperWidth: 8.27, paperHeight: 11.69 },
  legal: { paperWidth: 8.27, paperHeight: 14 },
  a4: { paperWidth: 8.27, paperHeight: 11.69 },
};

let currentMode = "normal";
const btn = document.getElementById("convertBtn");
const statusEl = document.getElementById("status");
const modeNote = document.getElementById("modeNote");
const orientation = document.getElementById("orientation");
const paperSize = document.getElementById("paperSize");
const background = document.getElementById("background");
const scale = document.getElementById("scale");

const modeNormal = document.getElementById("modeNormal");
const modeScreenshot = document.getElementById("modeScreenshot");

document.getElementById("optionsLink").addEventListener("click", (e) => {
  e.preventDefault();
  chrome.runtime.openOptionsPage();
});

function setMode(mode) {
  currentMode = mode;
  modeNormal.classList.toggle("active", mode === "normal");
  modeScreenshot.classList.toggle("active", mode === "screenshot");
  modeNote.textContent =
    mode === "normal"
      ? "Text-based PDF with selectable text"
      : "Full-page screenshot rendered as image PDF";
  orientation.disabled = mode === "screenshot";
  background.disabled = false;
}

modeNormal.addEventListener("click", () => setMode("normal"));
modeScreenshot.addEventListener("click", () => setMode("screenshot"));

(async function loadDefaults() {
  const items = await chrome.storage.sync.get([
    "defaultOrientation",
    "defaultPaperSize",
    "defaultBackground",
    "defaultScale",
  ]);
  if (items.defaultOrientation) orientation.value = items.defaultOrientation;
  if (items.defaultPaperSize) paperSize.value = items.defaultPaperSize;
  if (items.defaultBackground !== undefined)
    background.checked = items.defaultBackground;
  if (items.defaultScale) scale.value = items.defaultScale;
})();

btn.addEventListener("click", async () => {
  btn.disabled = true;
  statusEl.textContent = "Converting...";
  statusEl.className = "";

  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    if (!tab) throw new Error("No active tab found");

    if (
      tab.url?.startsWith("chrome://") ||
      tab.url?.startsWith("chrome-extension://")
    ) {
      throw new Error("Cannot convert browser internal pages");
    }

    const size = PAPER_SIZES[paperSize.value] || PAPER_SIZES.letter;

    const result = await chrome.runtime.sendMessage({
      action: "convertToPdf",
      tabId: tab.id,
      options: {
        mode: currentMode,
        landscape: orientation.value === "landscape",
        paperWidth: size.paperWidth,
        paperHeight: size.paperHeight,
        paperSize: paperSize.value,
        printBackground: background.checked,
        scale: parseInt(scale.value, 10) || 100,
      },
    });

    if (result?.success) {
      statusEl.textContent = "PDF downloaded successfully!";
      setTimeout(() => window.close(), 1000);
    } else {
      throw new Error(result?.error || "Conversion failed");
    }
  } catch (err) {
    statusEl.textContent = `Error: ${err.message}`;
    statusEl.className = "error";
    btn.disabled = false;
  }
});
