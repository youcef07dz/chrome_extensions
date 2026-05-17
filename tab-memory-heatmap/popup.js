const tabList = document.getElementById("tab-list");
const totalMemoryEl = document.getElementById("total-memory");
const showBarToggle = document.getElementById("show-bar-toggle");

function formatMemory(mb) {
  if (mb >= 1000) {
    return `${(mb / 1024).toFixed(1)} GB`;
  }
  return `${Math.round(mb)} MB`;
}

function renderHeatmap(tabs) {
  tabList.innerHTML = "";
  let total = 0;

  tabs.forEach((tab) => {
    total += tab.memoryMB;
    const el = document.createElement("div");
    el.className = "tab-item";
    el.dataset.tabId = tab.id;

    const bar = `<div class="tab-bar" style="background: ${tab.color.hex}"></div>`;

    const fav = tab.favIconUrl
      ? `<img src="${tab.favIconUrl}" onerror="this.style.display='none'">`
      : `<div class="tab-icon-placeholder"></div>`;

    let badges = "";
    if (tab.active) badges += '<span class="badge active">Active</span>';
    if (tab.audible) badges += '<span class="badge audio">Audio</span>';
    if (tab.pinned) badges += '<span class="badge pinned">Pinned</span>';

    el.innerHTML = `
      ${bar}
      <div class="tab-content">
        ${fav}
        <div class="tab-info">
          <span class="tab-title" title="${tab.title}">${tab.title}</span>
          <div class="tab-meta">${badges}</div>
        </div>
        <div class="tab-memory" style="color: ${tab.color.hex}">
          <span class="memory-value">${formatMemory(tab.memoryMB)}</span>
          <span class="memory-label">${tab.color.label}</span>
        </div>
      </div>
    `;

    el.addEventListener("click", () => {
      chrome.tabs.update(tab.id, { active: true });
      window.close();
    });

    el.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      chrome.tabs.remove(tab.id);
      setTimeout(refresh, 500);
    });

    tabList.appendChild(el);
  });

  totalMemoryEl.textContent = formatMemory(total);
}

function refresh() {
  chrome.runtime.sendMessage({ type: "getHeatmap" }, (tabs) => {
    if (tabs) {
      renderHeatmap(tabs);
    }
  });
}

chrome.runtime.sendMessage({ type: "getSettings" }, (settings) => {
  if (settings) {
    showBarToggle.checked = settings.showBar !== false;
  }
});

showBarToggle.addEventListener("change", () => {
  chrome.runtime.sendMessage({
    type: "updateSettings",
    settings: { showBar: showBarToggle.checked },
  });
});

refresh();
setInterval(refresh, 5000);
