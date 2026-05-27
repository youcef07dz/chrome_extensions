function getVideoId(url) {
  try {
    const u = new URL(url);
    if (u.hostname === 'www.youtube.com' || u.hostname === 'm.youtube.com') {
      if (u.pathname === '/watch') return u.searchParams.get('v');
    }
    if (u.hostname === 'youtu.be' || u.hostname === 'www.youtu.be') {
      return u.pathname.slice(1).split('/')[0];
    }
  } catch (_) {}
  return null;
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'loading' || !tab.url) return;
  chrome.storage.sync.get('enabled', (data) => {
    if (data.enabled === false) return;
    const videoId = getVideoId(tab.url);
    if (videoId) {
      chrome.tabs.update(tabId, {
        url: 'https://youcef07dz.github.io/youtube-lite/?v=' + videoId
      });
    }
  });
});
