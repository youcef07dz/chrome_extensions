let allVideos = [];
let currentView = 'grid';
let currentMode = 'saved';

function debounce(fn, ms) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

function formatTime(ts) {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'Just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getInitials(s) {
  return s ? s.charAt(0).toUpperCase() : '?';
}

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2500);
}

function showConfirm(title, message) {
  return new Promise((resolve) => {
    const overlay = document.getElementById('confirmModal');
    const titleEl = document.getElementById('confirmTitle');
    const msgEl = document.getElementById('confirmMessage');
    const yesBtn = document.getElementById('confirmYes');
    const noBtn = document.getElementById('confirmNo');

    titleEl.textContent = title;
    msgEl.textContent = message;
    yesBtn.textContent = 'Confirm';
    yesBtn.className = 'btn-primary';
    yesBtn.style.background = '#ff4444';
    noBtn.textContent = 'Cancel';
    noBtn.className = 'btn-cancel';
    overlay.classList.remove('hidden');

    function cleanup(answer) {
      overlay.classList.add('hidden');
      yesBtn.removeEventListener('click', onYes);
      noBtn.removeEventListener('click', onNo);
      overlay.removeEventListener('click', onOverlay);
      document.removeEventListener('keydown', onKey);
      resolve(answer);
    }
    function onYes() { cleanup(true); }
    function onNo() { cleanup(false); }
    function onOverlay(e) { if (e.target === overlay) cleanup(false); }
    function onKey(e) { if (e.key === 'Escape') cleanup(false); }

    yesBtn.addEventListener('click', onYes);
    noBtn.addEventListener('click', onNo);
    overlay.addEventListener('click', onOverlay);
    document.addEventListener('keydown', onKey);
  });
}

function showChoice(title, message, btnALabel, btnBLabel) {
  return new Promise((resolve) => {
    const overlay = document.getElementById('confirmModal');
    const titleEl = document.getElementById('confirmTitle');
    const msgEl = document.getElementById('confirmMessage');
    const yesBtn = document.getElementById('confirmYes');
    const noBtn = document.getElementById('confirmNo');

    titleEl.textContent = title;
    msgEl.textContent = message;
    yesBtn.textContent = btnALabel;
    yesBtn.className = 'btn-primary';
    yesBtn.style.background = '#3ea6ff';
    noBtn.textContent = btnBLabel;
    noBtn.className = 'btn-cancel';
    overlay.classList.remove('hidden');

    function cleanup(answer) {
      overlay.classList.add('hidden');
      yesBtn.removeEventListener('click', onA);
      noBtn.removeEventListener('click', onB);
      overlay.removeEventListener('click', onOverlay);
      document.removeEventListener('keydown', onKey);
      resolve(answer);
    }
    function onA() { cleanup(btnALabel); }
    function onB() { cleanup(btnBLabel); }
    function onOverlay(e) { if (e.target === overlay) cleanup(null); }
    function onKey(e) { if (e.key === 'Escape') cleanup(null); }

    yesBtn.addEventListener('click', onA);
    noBtn.addEventListener('click', onB);
    overlay.addEventListener('click', onOverlay);
    document.addEventListener('keydown', onKey);
  });
}

function renderVideoGrid(videos, mode) {
  const isTrash = mode === 'trash';
  return videos.map(v => `
    <div class="video-card" data-id="${v.videoId}">
      <div class="thumbnail-wrapper">
        <img src="${v.thumbnailUrl}" alt="${v.title}" loading="lazy">
        ${v.duration ? `<span class="duration-badge">${v.duration}</span>` : ''}
      </div>
      <div class="card-actions">
        ${isTrash
          ? `<button class="restore-video" title="Restore">
              <svg viewBox="0 0 24 24" width="18" height="18">
                <path fill="currentColor" d="M13 3a9 9 0 0 0-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42A8.954 8.954 0 0 0 13 21a9 9 0 0 0 0-18zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z"/>
              </svg>
            </button>`
          : `<button class="delete-video" title="Remove">
              <svg viewBox="0 0 24 24" width="18" height="18">
                <path fill="currentColor" d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
              </svg>
            </button>`
        }
      </div>
      <div class="card-info">
        <div class="card-channel-icon">${getInitials(v.channel)}</div>
        <div class="card-text">
          <div class="card-title">${v.title || 'YouTube Video'}</div>
          <div class="card-channel">${v.channel || 'YouTube'}</div>
          <div class="card-time">${isTrash ? 'Blacklisted' : 'Saved'} ${formatTime(isTrash ? v.deletedAt : v.savedAt)}</div>
        </div>
      </div>
    </div>
  `).join('');
}

function renderVideoList(videos, mode) {
  const isTrash = mode === 'trash';
  return videos.map(v => `
    <div class="list-card" data-id="${v.videoId}">
      <div class="list-thumb">
        <img src="${v.thumbnailUrl}" alt="${v.title}" loading="lazy">
        ${v.duration ? `<span class="duration-badge">${v.duration}</span>` : ''}
      </div>
      <div class="list-body">
        <div class="list-title">${v.title || 'YouTube Video'}</div>
        <div class="list-meta">
          <span class="list-channel">${v.channel || 'YouTube'}</span>
          <span class="list-dot">·</span>
          <span class="list-time">${isTrash ? 'Blacklisted' : 'Saved'} ${formatTime(isTrash ? v.deletedAt : v.savedAt)}</span>
        </div>
      </div>
      ${isTrash
        ? `<button class="list-restore" title="Restore">
            <svg viewBox="0 0 24 24" width="18" height="18">
              <path fill="currentColor" d="M13 3a9 9 0 0 0-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42A8.954 8.954 0 0 0 13 21a9 9 0 0 0 0-18zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z"/>
            </svg>
          </button>`
        : `<button class="list-delete" title="Remove">
            <svg viewBox="0 0 24 24" width="18" height="18">
              <path fill="currentColor" d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
            </svg>
          </button>`
      }
    </div>
  `).join('');
}

function renderVideos(videos) {
  const container = document.getElementById('videoContainer');
  const empty = document.getElementById('emptyState');
  const count = document.getElementById('videoCount');
  const emptyTitle = document.getElementById('emptyTitle');
  const emptyDesc = document.getElementById('emptyDesc');

  count.textContent = `${videos.length} video${videos.length !== 1 ? 's' : ''}`;

  if (videos.length === 0) {
    container.innerHTML = '';
    empty.style.display = 'flex';
    if (currentMode === 'trash') {
      emptyTitle.textContent = 'Blacklist is empty';
      emptyDesc.textContent = 'Blacklisted videos will appear here.';
    } else {
      emptyTitle.textContent = 'No videos saved yet';
      emptyDesc.textContent = 'Browse YouTube and videos will be saved automatically.';
    }
    return;
  }
  empty.style.display = 'none';

  container.className = currentView === 'grid' ? 'video-grid' : 'video-list';
  container.innerHTML = currentView === 'grid' ? renderVideoGrid(videos, currentMode) : renderVideoList(videos, currentMode);

  container.querySelectorAll('img').forEach(img => {
    img.addEventListener('error', () => {
      const id = img.closest('[data-id]')?.dataset.id;
      if (id) img.src = `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
    });
  });
}

function setView(view) {
  currentView = view;
  document.getElementById('gridViewBtn').classList.toggle('active', view === 'grid');
  document.getElementById('listViewBtn').classList.toggle('active', view === 'list');
  chrome.storage.local.set({ viewPref: view });
  renderVideos(allVideos);
}

function openVideo(id) {
  window.open(`https://www.youtube.com/watch?v=${id}`, '_blank');
}

function deleteVideo(id) {
  allVideos = allVideos.filter(v => v.videoId !== id);
  renderVideos(allVideos);
  showToast('Video blacklisted');
  chrome.runtime.sendMessage({ type: 'DELETE_VIDEO', videoId: id });
}

function restoreVideo(id) {
  allVideos = allVideos.filter(v => v.videoId !== id);
  renderVideos(allVideos);
  showToast('Video restored');
  chrome.runtime.sendMessage({ type: 'RESTORE_VIDEO', videoId: id });
}

function setMode(mode) {
  currentMode = mode;
  document.getElementById('trashBtn').classList.toggle('active', mode === 'trash');
  updateActionButtons();
  loadVideos();
}

function updateActionButtons() {
  const group = document.getElementById('actionBtnGroup');
  if (currentMode === 'trash') {
    group.innerHTML = `
      <button id="restoreAllBtn" class="icon-btn trash-action" title="Restore all">
        <svg viewBox="0 0 24 24" width="20" height="20">
          <path fill="currentColor" d="M13 3a9 9 0 0 0-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42A8.954 8.954 0 0 0 13 21a9 9 0 0 0 0-18z"/>
        </svg>
      </button>
      <button id="emptyTrashBtn" class="icon-btn delete-all-btn" title="Clear blacklist">
        <svg viewBox="0 0 24 24" width="20" height="20">
          <path fill="currentColor" d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
        </svg>
      </button>`;
    document.getElementById('restoreAllBtn').addEventListener('click', async () => {
      if (!allVideos.length) return;
      if (await showConfirm('Restore all?', 'Restore all blacklisted videos?')) {
        allVideos = [];
        renderVideos(allVideos);
        showToast('All videos restored from blacklist');
        chrome.runtime.sendMessage({ type: 'RESTORE_ALL' });
      }
    });
    document.getElementById('emptyTrashBtn').addEventListener('click', async () => {
      if (!allVideos.length) return;
      if (await showConfirm('Clear blacklist?', 'Permanently clear the blacklist?')) {
        allVideos = [];
        renderVideos(allVideos);
        showToast('Blacklist cleared');
        chrome.runtime.sendMessage({ type: 'EMPTY_TRASH' });
      }
    });
  } else {
    group.innerHTML = `
      <button id="deleteAllBtn" class="icon-btn delete-all-btn" title="Blacklist all">
        <svg viewBox="0 0 24 24" width="20" height="20">
          <path fill="currentColor" d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
        </svg>
      </button>`;
    document.getElementById('deleteAllBtn').addEventListener('click', async () => {
      if (!allVideos.length) return;
      if (await showConfirm('Delete all?', 'Blacklist all saved videos?')) {
        allVideos = [];
        renderVideos(allVideos);
        showToast('All videos blacklisted');
        chrome.runtime.sendMessage({ type: 'DELETE_ALL' });
      }
    });
  }
}

function loadVideos() {
  const msgType = currentMode === 'trash' ? 'GET_DELETED_VIDEOS' : 'GET_VIDEOS';
  chrome.storage.local.get(['viewPref'], (pref) => {
    if (pref.viewPref) currentView = pref.viewPref;
    document.getElementById('gridViewBtn').classList.toggle('active', currentView === 'grid');
    document.getElementById('listViewBtn').classList.toggle('active', currentView === 'list');
  });
  chrome.runtime.sendMessage({ type: msgType }, (res) => {
    allVideos = (res.videos || []).reverse();
    renderVideos(allVideos);
  });
}

async function exportData() {
  try {
    const [saved, deleted, settings] = await Promise.all([
      chrome.runtime.sendMessage({ type: 'GET_VIDEOS' }),
      chrome.runtime.sendMessage({ type: 'GET_DELETED_VIDEOS' }),
      chrome.runtime.sendMessage({ type: 'GET_SETTINGS' })
    ]);

    const data = {
      version: 1,
      exportedAt: Date.now(),
      savedVideos: saved.videos || [],
      deletedVideos: deleted.videos || [],
      settings: settings.settings || { maxVideos: 1000 }
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `yt-history-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Exported ${data.savedVideos.length} videos`);
  } catch (err) {
    showToast('Export failed: ' + err.message);
  }
}

async function importData() {
  const mode = await showChoice(
    'Import mode',
    'Merge adds new videos only (skips duplicates). Replace clears everything and uses the backup.',
    'Merge', 'Replace'
  );
  if (!mode) return;

  const input = document.getElementById('importFileInput');
  input.dataset.importMode = mode.toLowerCase();
  input.click();
}

document.getElementById('importFileInput').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  try {
    const text = await file.text();
    const data = JSON.parse(text);

    if (!data.version || !Array.isArray(data.savedVideos)) {
      showToast('Invalid backup file');
      return;
    }

    const res = await chrome.runtime.sendMessage({
      type: 'IMPORT_DATA',
      mode: e.target.dataset.importMode || 'merge',
      data: {
        savedVideos: data.savedVideos,
        deletedVideos: data.deletedVideos || [],
        settings: data.settings || { maxVideos: 1000 }
      }
    });

    if (res && res.ok) {
      showToast(`Imported ${data.savedVideos.length} videos`);
      loadVideos();
    }
  } catch (err) {
    showToast('Import failed: ' + err.message);
  }

  e.target.value = '';
});

document.getElementById('exportBtn').addEventListener('click', exportData);
document.getElementById('importBtn').addEventListener('click', importData);

const doSearch = debounce((q) => {
  if (!q) return renderVideos(allVideos);
  renderVideos(allVideos.filter(v =>
    v.title.toLowerCase().includes(q) || v.channel.toLowerCase().includes(q)
  ));
}, 250);

document.getElementById('searchInput').addEventListener('input', (e) => {
  doSearch(e.target.value.toLowerCase().trim());
});

document.getElementById('searchBtn').addEventListener('click', () => {
  document.getElementById('searchInput').dispatchEvent(new Event('input'));
});

document.getElementById('gridViewBtn').addEventListener('click', () => setView('grid'));
document.getElementById('listViewBtn').addEventListener('click', () => setView('list'));

document.getElementById('trashBtn').addEventListener('click', () => {
  setMode(currentMode === 'trash' ? 'saved' : 'trash');
});

function applyTheme(theme) {
  if (theme === 'system') {
    document.documentElement.removeAttribute('data-theme');
  } else {
    document.documentElement.setAttribute('data-theme', theme);
  }
}

document.getElementById('settingsBtn').addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'GET_SETTINGS' }, (res) => {
    document.getElementById('maxVideosInput').value = res.settings.maxVideos;
    document.getElementById('saveFilterSelect').value = res.settings.saveFilter || 'all';
    document.getElementById('themeSelect').value = res.settings.theme || 'system';
    document.getElementById('settingsModal').classList.remove('hidden');
  });
});

document.getElementById('closeSettingsBtn').addEventListener('click', () => {
  document.getElementById('settingsModal').classList.add('hidden');
});

document.getElementById('saveSettingsBtn').addEventListener('click', () => {
  const max = parseInt(document.getElementById('maxVideosInput').value, 10);
  if (isNaN(max) || max < 1) return showToast('Enter a valid number');
  const saveFilter = document.getElementById('saveFilterSelect').value;
  const theme = document.getElementById('themeSelect').value;
  applyTheme(theme);
  chrome.runtime.sendMessage({ type: 'SAVE_SETTINGS', settings: { maxVideos: max, saveFilter, theme } }, () => {
    document.getElementById('settingsModal').classList.add('hidden');
    showToast('Settings saved');
  });
});

document.getElementById('settingsModal').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) {
    document.getElementById('settingsModal').classList.add('hidden');
  }
});

document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.key === 'f') {
    e.preventDefault();
    document.getElementById('searchInput').focus();
  }
  if (e.key === 'Escape') {
    document.getElementById('settingsModal').classList.add('hidden');
    document.getElementById('confirmModal').classList.add('hidden');
  }
});

document.getElementById('videoContainer').addEventListener('click', (e) => {
  const delBtn = e.target.closest('.delete-video');
  if (delBtn) {
    const card = delBtn.closest('[data-id]');
    if (card) deleteVideo(card.dataset.id);
    return;
  }
  const restoreBtn = e.target.closest('.restore-video, .list-restore');
  if (restoreBtn) {
    const card = restoreBtn.closest('[data-id]');
    if (card) restoreVideo(card.dataset.id);
    return;
  }
  const listDelBtn = e.target.closest('.list-delete');
  if (listDelBtn) {
    const card = listDelBtn.closest('[data-id]');
    if (card) deleteVideo(card.dataset.id);
    return;
  }
  const card = e.target.closest('.video-card, .list-card');
  if (card) openVideo(card.dataset.id);
});

updateActionButtons();
chrome.runtime.sendMessage({ type: 'GET_SETTINGS' }, (res) => {
  applyTheme(res.settings.theme || 'system');
});
loadVideos();
