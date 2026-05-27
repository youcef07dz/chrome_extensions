const toggle = document.getElementById('toggle');
const statusEl = document.getElementById('status');

chrome.storage.sync.get('enabled', (data) => {
  const enabled = data.enabled !== false;
  toggle.checked = enabled;
  statusEl.textContent = enabled ? 'Redirecting YouTube to Lite' : 'Disabled';
});

toggle.addEventListener('change', () => {
  const enabled = toggle.checked;
  chrome.storage.sync.set({ enabled });
  statusEl.textContent = enabled ? 'Redirecting YouTube to Lite' : 'Disabled';
});
