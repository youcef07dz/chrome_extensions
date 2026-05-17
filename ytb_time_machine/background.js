const DEFAULTS = { maxVideos: 1000 };

function saveAll(data) {
  return new Promise(resolve => chrome.storage.local.set(data, resolve));
}
function loadAll(keys) {
  return new Promise(resolve => chrome.storage.local.get(keys, resolve));
}

chrome.action.onClicked.addListener(() => {
  chrome.tabs.create({ url: chrome.runtime.getURL('history.html') });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SAVE_VIDEOS') {
    (async () => {
      const { savedVideos = [], deletedVideos = [], settings } = await loadAll(['savedVideos', 'deletedVideos', 'settings']);
      const deletedIds = new Set(deletedVideos.map(v => v.videoId));
      const max = (settings && settings.maxVideos) || DEFAULTS.maxVideos;
      const idIndex = new Map(savedVideos.map((v, i) => [v.videoId, i]));
      let changed = false;

      for (const video of message.videos) {
        if (deletedIds.has(video.videoId)) continue;

        const entry = {
          videoId: video.videoId,
          title: video.title || 'Unknown Title',
          channel: video.channel || '',
          duration: video.duration || '',
          thumbnailUrl: `https://img.youtube.com/vi/${video.videoId}/mqdefault.jpg`,
          savedAt: Date.now()
        };

        if (idIndex.has(video.videoId)) {
          savedVideos.splice(idIndex.get(video.videoId), 1);
          for (const [k, v] of idIndex.entries()) {
            if (v > idIndex.get(video.videoId)) idIndex.set(k, v - 1);
          }
        }

        savedVideos.push(entry);
        idIndex.set(video.videoId, savedVideos.length - 1);
        changed = true;
      }

      if (savedVideos.length > max) {
        const remove = savedVideos.length - max;
        savedVideos.splice(0, remove);
        idIndex.clear();
        savedVideos.forEach((v, i) => idIndex.set(v.videoId, i));
      }

      if (changed) await saveAll({ savedVideos });
    })();
    return true;
  }

  if (message.type === 'DELETE_VIDEO') {
    (async () => {
      const { savedVideos = [], deletedVideos = [] } = await loadAll(['savedVideos', 'deletedVideos']);
      const video = savedVideos.find(v => v.videoId === message.videoId);
      if (video) {
        await saveAll({
          savedVideos: savedVideos.filter(v => v.videoId !== message.videoId),
          deletedVideos: [...deletedVideos, { ...video, deletedAt: Date.now() }]
        });
      }
    })();
    return true;
  }

  if (message.type === 'DELETE_ALL') {
    (async () => {
      const { savedVideos = [], deletedVideos = [] } = await loadAll(['savedVideos', 'deletedVideos']);
      await saveAll({
        savedVideos: [],
        deletedVideos: [...deletedVideos, ...savedVideos.map(v => ({ ...v, deletedAt: Date.now() }))]
      });
    })();
  }

  if (message.type === 'GET_VIDEOS') {
    (async () => {
      const { savedVideos = [] } = await loadAll('savedVideos');
      sendResponse({ videos: savedVideos });
    })();
    return true;
  }

  if (message.type === 'GET_DELETED_VIDEOS') {
    (async () => {
      const { deletedVideos = [] } = await loadAll('deletedVideos');
      sendResponse({ videos: deletedVideos });
    })();
    return true;
  }

  if (message.type === 'RESTORE_VIDEO') {
    (async () => {
      const { savedVideos = [], deletedVideos = [] } = await loadAll(['savedVideos', 'deletedVideos']);
      const video = deletedVideos.find(v => v.videoId === message.videoId);
      if (video) {
        await saveAll({
          savedVideos: [...savedVideos, { ...video, savedAt: Date.now() }],
          deletedVideos: deletedVideos.filter(v => v.videoId !== message.videoId)
        });
      }
      sendResponse({ ok: true });
    })();
    return true;
  }

  if (message.type === 'RESTORE_ALL') {
    (async () => {
      const { savedVideos = [], deletedVideos = [] } = await loadAll(['savedVideos', 'deletedVideos']);
      await saveAll({
        savedVideos: [...savedVideos, ...deletedVideos.map(v => ({ ...v, savedAt: Date.now() }))],
        deletedVideos: []
      });
      sendResponse({ ok: true });
    })();
    return true;
  }

  if (message.type === 'EMPTY_TRASH') {
    (async () => {
      await saveAll({ deletedVideos: [] });
      sendResponse({ ok: true });
    })();
    return true;
  }

  if (message.type === 'GET_SETTINGS') {
    (async () => {
      const { settings } = await loadAll('settings');
      sendResponse({ settings: settings || DEFAULTS });
    })();
    return true;
  }

  if (message.type === 'SAVE_SETTINGS') {
    (async () => {
      const { settings } = await loadAll('settings');
      await saveAll({ settings: { ...DEFAULTS, ...settings, ...message.settings } });
      sendResponse({ ok: true });
    })();
    return true;
  }
});
