const DEFAULTS = { maxVideos: 1000, saveFilter: 'all', theme: 'system' };

function saveAll(data) {
  return new Promise(resolve => chrome.storage.local.set(data, resolve));
}
function loadAll(keys) {
  return new Promise(resolve => chrome.storage.local.get(keys, resolve));
}

function handle(fn) {
  return (message, sender, sendResponse) => {
    fn(message, sender, sendResponse).catch(err => {
      console.error('bg error:', err);
      try { sendResponse({ error: err.message }); } catch (e) {}
    });
    return true;
  };
}

const batchBuffer = [];
let batchTimer = null;
const BATCH_INTERVAL = 3000;
const MAX_BATCH_SIZE = 50;

function flushBatch() {
  if (batchTimer) { clearTimeout(batchTimer); batchTimer = null; }
  if (batchBuffer.length === 0) return;
  const batch = batchBuffer.splice(0);
  processSaveBatch(batch).catch(console.error);
}

function queueSaveBatch(videos) {
  batchBuffer.push(...videos);
  if (batchTimer) clearTimeout(batchTimer);
  if (batchBuffer.length >= MAX_BATCH_SIZE) {
    flushBatch();
  } else {
    batchTimer = setTimeout(flushBatch, BATCH_INTERVAL);
  }
}

async function processSaveBatch(videos) {
  const { savedVideos = [], deletedVideos = [], settings } = await loadAll(['savedVideos', 'deletedVideos', 'settings']);
  const deletedIds = new Set(deletedVideos.map(v => v.videoId));
  const max = (settings && settings.maxVideos) || DEFAULTS.maxVideos;
  const existing = new Map(savedVideos.map(v => [v.videoId, v]));
  let changed = false;
  const newEntries = [];

  const saveFilter = (settings && settings.saveFilter) || DEFAULTS.saveFilter;

  for (const video of videos) {
    if (deletedIds.has(video.videoId)) continue;
    if (saveFilter === 'videos' && video.type === 'shorts') continue;
    if (saveFilter === 'shorts' && (!video.type || video.type === 'video')) continue;

    const entry = {
      videoId: video.videoId,
      title: video.title || 'Unknown Title',
      channel: video.channel || '',
      duration: video.duration || '',
      thumbnailUrl: `https://img.youtube.com/vi/${video.videoId}/mqdefault.jpg`,
      savedAt: Date.now()
    };

    if (existing.has(video.videoId)) {
      const old = existing.get(video.videoId);
      if (/^\d/.test(entry.title)) entry.title = old.title;
      if (!entry.channel) entry.channel = old.channel;
      if (!entry.duration) entry.duration = old.duration;
      existing.delete(video.videoId);
    }

    newEntries.push(entry);
    changed = true;
  }

  if (!changed) return;

  const all = [...existing.values(), ...newEntries];
  const trimmed = all.length > max ? all.slice(all.length - max) : all;
  await saveAll({ savedVideos: trimmed });
}

chrome.action.onClicked.addListener(() => {
  chrome.tabs.create({ url: chrome.runtime.getURL('history.html') });
});

chrome.runtime.onMessage.addListener(handle(async (message, sender, sendResponse) => {
  switch (message.type) {
    case 'SAVE_VIDEOS':
      queueSaveBatch(message.videos);
      break;

    case 'DELETE_VIDEO': {
      const { savedVideos = [], deletedVideos = [] } = await loadAll(['savedVideos', 'deletedVideos']);
      const video = savedVideos.find(v => v.videoId === message.videoId);
      if (video) {
        await saveAll({
          savedVideos: savedVideos.filter(v => v.videoId !== message.videoId),
          deletedVideos: [...deletedVideos, { ...video, deletedAt: Date.now() }]
        });
      }
      break;
    }

    case 'DELETE_ALL': {
      const { savedVideos = [], deletedVideos = [] } = await loadAll(['savedVideos', 'deletedVideos']);
      await saveAll({
        savedVideos: [],
        deletedVideos: [...deletedVideos, ...savedVideos.map(v => ({ ...v, deletedAt: Date.now() }))]
      });
      break;
    }

    case 'GET_VIDEOS': {
      const { savedVideos = [] } = await loadAll('savedVideos');
      sendResponse({ videos: savedVideos });
      break;
    }

    case 'GET_DELETED_VIDEOS': {
      const { deletedVideos = [] } = await loadAll('deletedVideos');
      sendResponse({ videos: deletedVideos });
      break;
    }

    case 'RESTORE_VIDEO': {
      const { savedVideos = [], deletedVideos = [] } = await loadAll(['savedVideos', 'deletedVideos']);
      const video = deletedVideos.find(v => v.videoId === message.videoId);
      if (video) {
        await saveAll({
          savedVideos: [...savedVideos, { ...video, savedAt: Date.now() }],
          deletedVideos: deletedVideos.filter(v => v.videoId !== message.videoId)
        });
      }
      sendResponse({ ok: true });
      break;
    }

    case 'RESTORE_ALL': {
      const { savedVideos = [], deletedVideos = [] } = await loadAll(['savedVideos', 'deletedVideos']);
      await saveAll({
        savedVideos: [...savedVideos, ...deletedVideos.map(v => ({ ...v, savedAt: Date.now() }))],
        deletedVideos: []
      });
      sendResponse({ ok: true });
      break;
    }

    case 'EMPTY_TRASH': {
      await saveAll({ deletedVideos: [] });
      sendResponse({ ok: true });
      break;
    }

    case 'IMPORT_DATA': {
      const { savedVideos = [], deletedVideos = [], settings } = message.data || {};
      if (message.mode === 'replace') {
        const toSave = savedVideos.map(v => ({ ...v, savedAt: Date.now() }));
        await saveAll({
          savedVideos: toSave,
          deletedVideos: deletedVideos.map(v => ({ ...v, deletedAt: v.deletedAt || Date.now() })),
          settings: { ...DEFAULTS, ...settings }
        });
      } else {
        const existing = await loadAll(['savedVideos', 'deletedVideos', 'settings']);
        const existingIds = new Set((existing.savedVideos || []).map(v => v.videoId));
        const merged = [...(existing.savedVideos || [])];
        for (const v of savedVideos) {
          if (!existingIds.has(v.videoId)) {
            merged.push(v);
            existingIds.add(v.videoId);
          }
        }
        await saveAll({
          savedVideos: merged,
          deletedVideos: [...(existing.deletedVideos || []), ...deletedVideos],
          settings: { ...(existing.settings || DEFAULTS), ...settings }
        });
      }
      sendResponse({ ok: true });
      break;
    }

    case 'GET_SETTINGS': {
      const { settings } = await loadAll('settings');
      sendResponse({ settings: settings || DEFAULTS });
      break;
    }

    case 'SAVE_SETTINGS': {
      const { settings } = await loadAll('settings');
      await saveAll({ settings: { ...DEFAULTS, ...settings, ...message.settings } });
      sendResponse({ ok: true });
      break;
    }
  }
}));
