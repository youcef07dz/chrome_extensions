document.addEventListener("DOMContentLoaded", () => {
  const encodingBtns = document.querySelectorAll(".encoding-btn");
  const customEncodingInput = document.getElementById("customEncoding");
  const applyCustomBtn = document.getElementById("applyCustom");
  const resetBtn = document.getElementById("resetBtn");
  const currentEncodingDisplay = document.getElementById("currentEncoding");

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0];
    if (!tab) return;

    chrome.tabs.sendMessage(tab.id, { action: "getEncoding" }, (response) => {
      if (chrome.runtime.lastError || !response) {
        currentEncodingDisplay.textContent = "Unknown";
        return;
      }
      currentEncodingDisplay.textContent = response.encoding || "Unknown";
      highlightActiveEncoding(response.encoding);
    });

    chrome.storage.local.get([`encoding_${tab.url}`], (result) => {
      const savedEncoding = result[`encoding_${tab.url}`];
      if (savedEncoding) {
        highlightActiveEncoding(savedEncoding);
      }
    });
  });

  encodingBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const encoding = btn.getAttribute("data-encoding");
      applyEncoding(encoding);
    });
  });

  applyCustomBtn.addEventListener("click", () => {
    const encoding = customEncodingInput.value.trim().toUpperCase();
    if (encoding) {
      applyEncoding(encoding);
    }
  });

  customEncodingInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      applyCustomBtn.click();
    }
  });

  resetBtn.addEventListener("click", () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (!tab) return;

      chrome.storage.local.remove(`encoding_${tab.url}`);
      chrome.tabs.sendMessage(tab.id, { action: "resetEncoding" }, () => {
        if (!chrome.runtime.lastError) {
          chrome.tabs.reload(tab.id);
        }
      });
    });
  });

  function highlightActiveEncoding(encoding) {
    if (!encoding) return;
    const upperEncoding = encoding.toUpperCase();
    encodingBtns.forEach((btn) => {
      if (btn.getAttribute("data-encoding").toUpperCase() === upperEncoding) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    });
  }

  function applyEncoding(encoding) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (!tab) return;

      chrome.storage.local.set({ [`encoding_${tab.url}`]: encoding });
      chrome.tabs.sendMessage(tab.id, { action: "setEncoding", encoding }, () => {
        if (!chrome.runtime.lastError) {
          chrome.tabs.reload(tab.id);
        } else {
          injectContentScriptAndReload(tab, encoding);
        }
      });
    });

    window.close();
  }

  function injectContentScriptAndReload(tab, encoding) {
    chrome.scripting.executeScript(
      {
        target: { tabId: tab.id },
        files: ["content.js"],
      },
      () => {
        chrome.tabs.sendMessage(tab.id, { action: "setEncoding", encoding }, () => {
          chrome.tabs.reload(tab.id);
        });
      }
    );
  }
});
