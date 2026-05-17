const POLL_INTERVAL = 5000;
let tabMemory = {};

function getTabMemory() {
  return chrome.processes.getProcessInfo(["tab"], true, (processes) => {
    const newTabMemory = {};
    processes.forEach((process) => {
      if (process.tabId && process.memory) {
        newTabMemory[process.tabId] = process.memory;
      }
    });
    tabMemory = newTabMemory;
    updateIcon();
    updateBadges();
  });
}

function getTabMemoryColor(bytes) {
  const mb = bytes / 1024 / 1024;
  const max = 500;
  const min = 10;
  const ratio = Math.min(1, Math.max(0, (mb - min) / (max - min)));

  if (ratio < 0.33) {
    const t = ratio / 0.33;
    const r = Math.round(239 * t);
    const g = Math.round(234 + (239 - 234) * t);
    const b = Math.round(67 - 13 * t);
    return { r, g, b, label: "Low", hex: `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}` };
  } else if (ratio < 0.66) {
    const t = (ratio - 0.33) / 0.33;
    const r = Math.round(239 + (251 - 239) * t);
    const g = Math.round(234 + (192 - 234) * t);
    const b = Math.round(67 + (45 - 67) * t);
    return { r, g, b, label: "Medium", hex: `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}` };
  } else {
    const t = (ratio - 0.66) / 0.34;
    const r = Math.round(251 + (239 - 251) * t);
    const g = Math.round(192 + (68 - 192) * t);
    const b = Math.round(45 + (68 - 45) * t);
    return { r, g, b, label: "High", hex: `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}` };
  }
}

function updateIcon() {
  let total = 0;
  Object.values(tabMemory).forEach((mem) => { total += mem; });
  const totalMB = Math.round(total / 1024 / 1024);
  chrome.action.setTitle({ title: `Total Tab Memory: ${totalMB} MB` });
}

function updateBadges() {
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach((tab) => {
      const mem = tabMemory[tab.id];
      if (mem) {
        const mb = Math.round(mem / 1024 / 1024);
        chrome.action.setBadgeText({ text: String(mb), tabId: tab.id });
        const color = getTabMemoryColor(mem);
        chrome.action.setBadgeBackgroundColor({ color: [color.r, color.g, color.b, 255], tabId: tab.id });
      } else {
        chrome.action.setBadgeText({ text: "", tabId: tab.id });
      }
    });
  });
}

chrome.alarms.create("memoryPoll", { periodInMinutes: POLL_INTERVAL / 60000 });
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "memoryPoll") {
    getTabMemory();
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "getHeatmap") {
    chrome.tabs.query({}, (tabs) => {
      const result = tabs
        .map((tab) => {
          const mem = tabMemory[tab.id] || 0;
          const mb = mem / 1024 / 1024;
          const color = getTabMemoryColor(mem);
          return {
            id: tab.id,
            title: tab.title || "Untitled",
            url: tab.url || "",
            favIconUrl: tab.favIconUrl || "",
            active: tab.active,
            audible: tab.audible,
            pinned: tab.pinned,
            memoryMB: Math.round(mb * 10) / 10,
            color,
          };
        })
        .sort((a, b) => b.memoryMB - a.memoryMB);
      sendResponse(result);
    });
    return true;
  }

  if (message.type === "getSettings") {
    chrome.storage.local.get(["settings"], (result) => {
      const defaults = {
        showBar: true,
        thresholdMB: 50,
      };
      sendResponse(result.settings ? { ...defaults, ...result.settings } : defaults);
    });
    return true;
  }

  if (message.type === "updateSettings") {
    chrome.storage.local.set({ settings: message.settings });
    sendResponse();
    return true;
  }
});

getTabMemory();
setInterval(getTabMemory, POLL_INTERVAL);
