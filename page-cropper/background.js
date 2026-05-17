chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "captureVisibleTab") {
    chrome.tabs.captureVisibleTab(null, { format: "png" }, (dataUrl) => {
      sendResponse(dataUrl);
    });
    return true;
  }

  if (message.type === "startCrop") {
    chrome.scripting.executeScript({
      target: { tabId: sender.tab.id },
      files: ["content.js"],
    });

    chrome.tabs.sendMessage(sender.tab.id, { type: "startCrop" });
    sendResponse();
  }

  if (message.type === "cropCancelled") {
    sendResponse();
  }

  if (message.type === "cropComplete") {
    sendResponse();
  }
});
