(function () {
  function createMemoryBar() {
    const bar = document.createElement("div");
    bar.id = "tab-memory-heatmap-bar";
    bar.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      height: 4px;
      z-index: 2147483647;
      pointer-events: none;
      background: linear-gradient(90deg, #efea43, #fbc02d, #ef4444);
      transition: opacity 0.3s;
    `;
    document.documentElement.appendChild(bar);
    return bar;
  }

  function updateBar(color) {
    const bar = document.getElementById("tab-memory-heatmap-bar");
    if (bar) {
      bar.style.background = color.hex;
    }
  }

  function init() {
    const bar = createMemoryBar();

    chrome.runtime.sendMessage({ type: "getSettings" }, (settings) => {
      if (settings && settings.showBar === false) {
        bar.style.display = "none";
      }
    });

    chrome.runtime.sendMessage({ type: "getHeatmap" }, (tabs) => {
      if (tabs) {
        const currentTab = tabs.find((t) => t.active);
        if (currentTab) {
          updateBar(currentTab.color);
        }
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
