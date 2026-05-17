chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "getSettings") {
    chrome.storage.local.get(["settings"], (result) => {
      const defaults = {
        enabled: true,
        canvas: true,
        fonts: true,
        webgl: true,
        audio: true,
      };
      sendResponse(result.settings ? { ...defaults, ...result.settings } : defaults);
    });
    return true;
  }

  if (message.type === "updateSettings") {
    chrome.storage.local.set({ settings: message.settings });
    sendResponse();
  }
});
