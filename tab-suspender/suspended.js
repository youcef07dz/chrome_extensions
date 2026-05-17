const params = new URLSearchParams(window.location.search);
const originalUrl = params.get('url');
const title = params.get('title');

document.getElementById('tab-title').textContent = title || 'Suspended Tab';
document.getElementById('url-preview').textContent = originalUrl;

document.getElementById('restore-btn').addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'unsuspend', url: originalUrl });
});
