const DEFAULT_TIMEOUT = 900;
const CHECK_INTERVAL_IN_SECONDS = 10;

let settings = {
  timeoutSeconds: DEFAULT_TIMEOUT,
  enabled: true,
  whitelist: [],
  skipPinned: true,
  skipAudio: true,
};

let tabLastActive = {};

chrome.storage.local.get(['settings', 'tabLastActive'], (result) => {
  if (result.settings) {
    if (result.settings.timeoutMinutes && !result.settings.timeoutSeconds) {
      result.settings.timeoutSeconds = result.settings.timeoutMinutes * 60;
      delete result.settings.timeoutMinutes;
      chrome.storage.local.set({ settings: result.settings });
    }
    settings = { ...settings, ...result.settings };
  }
  if (result.tabLastActive) {
    tabLastActive = result.tabLastActive;
  }
  chrome.alarms.create('checkTabs', { periodInMinutes: CHECK_INTERVAL_IN_SECONDS / 60 });
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'checkTabs') {
    checkTabs();
  }
});

chrome.tabs.onActivated.addListener((activeInfo) => {
  tabLastActive[activeInfo.tabId] = Date.now();
  saveTabLastActive();
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    tabLastActive[tabId] = Date.now();
    saveTabLastActive();
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  delete tabLastActive[tabId];
  saveTabLastActive();
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'unsuspend') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.update(tabs[0].id, { url: message.url });
      }
    });
  }

  if (message.type === 'getSettings') {
    sendResponse(settings);
  }

  if (message.type === 'updateSettings') {
    settings = { ...settings, ...message.settings };
    chrome.storage.local.set({ settings });
    sendResponse(settings);
  }

  if (message.type === 'toggleEnabled') {
    settings.enabled = message.enabled;
    chrome.storage.local.set({ settings });
    sendResponse(settings);
  }

  if (message.type === 'suspendTab') {
    suspendTab(message.tabId);
    sendResponse();
  }

  if (message.type === 'unsuspendTab') {
    unsuspendTab(message.tabId);
    sendResponse();
  }

  if (message.type === 'getTabs') {
    getTabs(sendResponse);
    return true;
  }

  if (message.type === 'toggleWhitelist') {
    const url = message.url;
    const idx = settings.whitelist.indexOf(url);
    if (idx > -1) {
      settings.whitelist.splice(idx, 1);
    } else {
      settings.whitelist.push(url);
    }
    chrome.storage.local.set({ settings });
    sendResponse(settings.whitelist);
  }
});

function saveTabLastActive() {
  chrome.storage.local.set({ tabLastActive });
}

function checkTabs() {
  if (!settings.enabled) return;

  const now = Date.now();
    const threshold = settings.timeoutSeconds * 1000;

  chrome.tabs.query({}, (tabs) => {
    tabs.forEach((tab) => {
      if (shouldSkip(tab)) return;

      const lastActive = tabLastActive[tab.id] || now;
      if (now - lastActive > threshold) {
        suspendTab(tab.id);
      }
    });
  });
}

function shouldSkip(tab) {
  if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://') || tab.url.startsWith('devtools://')) {
    return true;
  }

  if (tab.url.startsWith('chrome://newtab') || tab.url.startsWith('chrome://extensions')) {
    return true;
  }

  const hostname = getHostname(tab.url);
  if (settings.whitelist.some((w) => hostname.includes(w) || w.includes(hostname))) {
    return true;
  }

  if (settings.skipPinned && tab.pinned) {
    return true;
  }

  if (settings.skipAudio && tab.audible) {
    return true;
  }

  return false;
}

function getHostname(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

function suspendTab(tabId) {
  chrome.tabs.get(tabId, (tab) => {
    if (!tab || shouldSkip(tab)) return;

    const suspendedUrl = `chrome-extension://${chrome.runtime.id}/suspended.html?url=${encodeURIComponent(tab.url)}&title=${encodeURIComponent(tab.title || 'Suspended Tab')}&fav=${encodeURIComponent(tab.favIconUrl || '')}`;

    chrome.tabs.update(tabId, { url: suspendedUrl });
  });
}

function unsuspendTab(tabId) {
  chrome.tabs.get(tabId, (tab) => {
    if (!tab) return;
    const url = new URL(tab.url);
    const originalUrl = url.searchParams.get('url');
    if (originalUrl) {
      chrome.tabs.update(tabId, { url: originalUrl });
    }
  });
}

function getTabs(callback) {
  chrome.tabs.query({}, (tabs) => {
    const result = tabs.map((tab) => {
      const isSuspended = tab.url && tab.url.startsWith(`chrome-extension://${chrome.runtime.id}/suspended.html`);
      let title = tab.title;
      let favIconUrl = tab.favIconUrl;
      if (isSuspended) {
        try {
          const params = new URL(tab.url).searchParams;
          title = params.get('title') || title;
          favIconUrl = params.get('fav') || favIconUrl;
        } catch { }
      }
      return {
        id: tab.id,
        title,
        url: tab.url,
        favIconUrl,
        active: tab.active,
        audible: tab.audible,
        pinned: tab.pinned,
        suspended: isSuspended,
        lastActive: tabLastActive[tab.id] || null,
      };
    });
    callback({ tabs: result, timeoutSeconds: settings.timeoutSeconds });
  });
}
