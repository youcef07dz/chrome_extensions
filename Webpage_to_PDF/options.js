const fields = {
  defaultOrientation: document.getElementById("defaultOrientation"),
  defaultPaperSize: document.getElementById("defaultPaperSize"),
  defaultBackground: document.getElementById("defaultBackground"),
  defaultScale: document.getElementById("defaultScale"),
};

const statusEl = document.getElementById("status");

async function loadSettings() {
  const items = await chrome.storage.sync.get(Object.keys(fields));
  for (const [key, el] of Object.entries(fields)) {
    if (items[key] !== undefined) {
      if (el.type === "checkbox") {
        el.checked = items[key];
      } else {
        el.value = items[key];
      }
    }
  }
}

document.getElementById("saveBtn").addEventListener("click", async () => {
  const data = {};
  for (const [key, el] of Object.entries(fields)) {
    data[key] = el.type === "checkbox" ? el.checked : el.value;
  }
  await chrome.storage.sync.set(data);
  statusEl.textContent = "Settings saved!";
  statusEl.className = "success";
  setTimeout(() => { statusEl.textContent = ""; }, 2000);
});

loadSettings();
