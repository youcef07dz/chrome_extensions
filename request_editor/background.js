var popupWindowId = null;
var popupTabId = null;

chrome.action.onClicked.addListener(function (tab) {
  if (tab.url && (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://') || tab.url.startsWith('https://chrome.google.com/webstore') || tab.url.startsWith('https://chromewebstore.google.com/'))) {
    return;
  }

  if (popupWindowId) {
    chrome.windows.update(popupWindowId, { focused: true });
    return;
  }

  chrome.debugger.attach({ tabId: tab.id }, '1.0', function () {
    if (chrome.runtime.lastError) {
      // already attached (e.g. popup was closed without cleanup) - open window anyway
    }

    chrome.windows.create({
      url: chrome.runtime.getURL('popup/index.html') + '?tabId=' + tab.id,
      type: 'popup',
      width: 860,
      height: 750
    }, function (win) {
      popupWindowId = win.id;
      popupTabId = tab.id;
    });
  });
});

chrome.windows.onRemoved.addListener(function (windowId) {
  if (windowId === popupWindowId && popupTabId) {
    chrome.debugger.detach({ tabId: popupTabId }, function () {
      popupWindowId = null;
      popupTabId = null;
    });
  }
});
