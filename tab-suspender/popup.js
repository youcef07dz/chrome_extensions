const enabledToggle = document.getElementById('enabled-toggle');
const timeoutSelect = document.getElementById('timeout-select');
const timeoutCustomRow = document.getElementById('timeout-custom-row');
const timeoutInput = document.getElementById('timeout-input');
const skipPinned = document.getElementById('skip-pinned');
const skipAudio = document.getElementById('skip-audio');
const tabList = document.getElementById('tab-list');
const suspendAllBtn = document.getElementById('suspend-all-btn');

function loadSettings(settings) {
  enabledToggle.checked = settings.enabled;
  skipPinned.checked = settings.skipPinned;
  skipAudio.checked = settings.skipAudio;

  const minutes = settings.timeoutSeconds / 60;
  const presetOptions = ['5', '10', '15', '30', '60', '120'];

  if (presetOptions.includes(String(minutes))) {
    timeoutSelect.value = String(minutes);
    timeoutCustomRow.style.display = 'none';
  } else {
    timeoutSelect.value = 'custom';
    timeoutCustomRow.style.display = 'flex';
    timeoutInput.value = minutes;
  }
}

enabledToggle.addEventListener('change', () => {
  chrome.runtime.sendMessage({ type: 'toggleEnabled', enabled: enabledToggle.checked });
});

timeoutSelect.addEventListener('change', () => {
  if (timeoutSelect.value === 'custom') {
    timeoutCustomRow.style.display = 'flex';
    timeoutInput.focus();
  } else {
    timeoutCustomRow.style.display = 'none';
    const val = parseFloat(timeoutSelect.value);
    chrome.runtime.sendMessage({
      type: 'updateSettings',
      settings: { timeoutSeconds: Math.round(val * 60) },
    });
  }
});

timeoutInput.addEventListener('change', () => {
  const val = parseFloat(timeoutInput.value);
  if (val > 0) {
    chrome.runtime.sendMessage({
      type: 'updateSettings',
      settings: { timeoutSeconds: Math.round(val * 60) },
    });
  }
});

skipPinned.addEventListener('change', () => {
  chrome.runtime.sendMessage({
    type: 'updateSettings',
    settings: { skipPinned: skipPinned.checked },
  });
});

skipAudio.addEventListener('change', () => {
  chrome.runtime.sendMessage({
    type: 'updateSettings',
    settings: { skipAudio: skipAudio.checked },
  });
});

suspendAllBtn.addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'getTabs' }, (response) => {
    response.tabs.forEach((tab) => {
      if (!tab.suspended && !tab.active && !tab.audible && !tab.pinned) {
        chrome.runtime.sendMessage({ type: 'suspendTab', tabId: tab.id });
      }
    });
    setTimeout(refreshTabs, 500);
  });
});

let currentTabs = [];
let currentTimeoutSeconds = 0;
let timerInterval = null;

function refreshTabs() {
  chrome.runtime.sendMessage({ type: 'getTabs' }, (response) => {
    const tabs = response.tabs;
    currentTimeoutSeconds = response.timeoutSeconds;
    currentTabs = tabs;

    tabList.innerHTML = '';
    tabs.forEach((tab) => {
      const el = document.createElement('div');
      el.className = 'tab-item';

      const fav = tab.favIconUrl ? `<img src="${tab.favIconUrl}" onerror="this.style.display='none'">` : '';

      let badges = '';
      if (tab.suspended) badges += '<span class="tab-badge suspended">Suspended</span>';
      if (tab.audible) badges += '<span class="tab-badge audible">Audio</span>';
      if (tab.pinned) badges += '<span class="tab-badge pinned">Pinned</span>';

      const displayTitle = tab.suspended ? `${tab.title || 'Untitled'} (Suspended)` : (tab.title || 'Untitled');
      const actionLabel = tab.suspended ? 'Restore' : 'Suspend';

      let timerHtml = '';
      if (!tab.suspended && tab.lastActive) {
        timerHtml = `<span class="tab-timer" data-tab-id="${tab.id}"></span>`;
      }

      el.innerHTML = `
        ${fav}
        <span class="tab-title" title="${displayTitle}">${displayTitle}</span>
        ${badges}
        ${timerHtml}
        <button class="tab-action" data-id="${tab.id}" data-suspended="${tab.suspended}">${actionLabel}</button>
      `;

      el.querySelector('.tab-action').addEventListener('click', (e) => {
        const tabId = parseInt(e.target.dataset.id);
        const isSuspended = e.target.dataset.suspended === 'true';
        if (isSuspended) {
          chrome.runtime.sendMessage({ type: 'unsuspendTab', tabId });
        } else {
          chrome.runtime.sendMessage({ type: 'suspendTab', tabId });
        }
        setTimeout(refreshTabs, 500);
      });

      tabList.appendChild(el);
    });

    updateTimers();
    startTimerInterval();
  });
}

function updateTimers() {
  const now = Date.now();
  document.querySelectorAll('.tab-timer').forEach((el) => {
    const tabId = parseInt(el.dataset.tabId);
    const tab = currentTabs.find(t => t.id === tabId);
    if (tab && tab.lastActive) {
      const remaining = (tab.lastActive + currentTimeoutSeconds * 1000) - now;
      el.textContent = remaining > 0 ? formatTime(remaining) : '0:00';
    }
  });
}

function startTimerInterval() {
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(updateTimers, 1000);
}

function formatTime(ms) {
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

window.addEventListener('unload', () => {
  if (timerInterval) clearInterval(timerInterval);
});

chrome.runtime.sendMessage({ type: 'getSettings' }, loadSettings);
refreshTabs();
