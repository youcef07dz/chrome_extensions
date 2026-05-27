const STORAGE_KEY = 'iptv_playlists';
const LOGO_TIMEOUT = 5000;
const CONCURRENCY = 4;
const LOGO_CACHE = 'iptv-logos-v1';

let playlists = [];
let currentPlaylistId = null;
let channels = [];
let currentChannel = null;
const $ = {};

function qs(sel, ctx) { return (ctx || document).querySelector(sel); }
function qsa(sel, ctx) { return (ctx || document).querySelectorAll(sel); }

function queue(limit) {
  const q = []; let r = 0;
  return {
    run(fn) {
      return new Promise((res, rej) => {
        const task = async () => { r++; try { res(await fn()); } catch (e) { rej(e); } finally { r--; if (q.length) q.shift()(); } };
        r < limit ? task() : q.push(task);
      });
    }
  };
}

const logoLimiter = queue(CONCURRENCY);

function raceTimeout(p, ms) {
  return Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('Timeout')), ms))]);
}

function debounce(fn, ms) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

function resolveUrl(base, relative) {
  if (!relative) return '';
  if (/^[a-z][a-z0-9+.-]*:/i.test(relative)) return relative;
  if (relative.startsWith('//')) return 'https:' + relative;
  try { return new URL(relative, base).href; } catch { return relative; }
}

function parseM3U(content, baseUrl) {
  const lines = content.split('\n');
  const result = [];
  let cur = null;
  for (let line of lines) {
    line = line.trim();
    if (!line) continue;
    if (line.startsWith('#EXTINF:')) {
      cur = { name: 'Unknown', logo: '', group: '' };
      const m = line.match(/tvg-logo="([^"]*)"/); if (m) cur.logo = m[1];
      const g = line.match(/group-title="([^"]*)"/); if (g) cur.group = g[1];
      const n = line.match(/,(.+)$/); if (n) cur.name = n[1].trim();
    } else if (!line.startsWith('#') && cur) {
      cur.url = resolveUrl(baseUrl, line);
      result.push(cur);
      cur = null;
    }
  }
  return result;
}

function renderPlaylistSelect() {
  const sel = $.playlistSelect;
  sel.innerHTML = '';
  for (let i = 0; i < playlists.length; i++)
    sel.add(new Option(playlists[i].name || `Playlist ${i + 1}`, playlists[i].id));
  sel.value = currentPlaylistId || '';
}

function selectPlaylist(id) {
  currentPlaylistId = id;
  $.playlistSelect.value = id;
  const pl = playlists.find(p => p.id === id);
  if (pl) {
    channels = pl.channels || [];
    renderChannels(channels);
    showEmpty(channels.length === 0);
  }
}

function showEmpty(show) {
  $.emptyState.style.display = show ? 'flex' : 'none';
  $.channelList.style.display = show ? 'none' : 'block';
}

async function addPlaylist(name, chs) {
  const pl = { id: Date.now().toString(), name, channels: chs };
  playlists.push(pl);
  await chrome.storage.local.set({ [STORAGE_KEY]: playlists });
  renderPlaylistSelect();
  selectPlaylist(pl.id);
  return pl;
}

async function loadCachedLogo(img, url) {
  try {
    const cache = await caches.open(LOGO_CACHE);
    let resp = await cache.match(url);
    if (!resp) {
      resp = await fetch(url);
      if (resp.ok) cache.put(url, resp.clone());
    }
    if (resp && resp.ok) {
      const blob = await resp.blob();
      const blobUrl = URL.createObjectURL(blob);
      img.onload = () => URL.revokeObjectURL(blobUrl);
      img.src = blobUrl;
      return;
    }
  } catch {}
  img.src = url;
}

let renderToken = 0;
const BATCH_SIZE = 25;
const channelData = new WeakMap();

function lazyLogo(img, url) {
  logoLimiter.run(() => raceTimeout(loadCachedLogo(img, url), LOGO_TIMEOUT)).catch(() => { img.src = url; });
}

function makeItem(ch) {
  const el = document.createElement('div');
  el.className = 'channel-item';
  el.dataset.url = ch.url;
  channelData.set(el, ch);
  const hasLogo = !!ch.logo;
  el.innerHTML = `<div class="channel-logo"></div><div class="channel-info"><span class="channel-name"></span></div><div class="channel-play-btn">\u25B6</div>`;
  el.querySelector('.channel-name').textContent = ch.name;
  const logo = el.querySelector('.channel-logo');
  if (hasLogo) {
    const img = document.createElement('img');
    img.alt = '';
    logo.appendChild(img);
  } else {
    logo.textContent = '\uD83D\uDCFA';
  }
  if (ch.group) {
    const span = document.createElement('span');
    span.className = 'channel-group';
    span.textContent = ch.group;
    el.querySelector('.channel-info').appendChild(span);
  }
  return el;
}

function loadChannelFromClick(el) {
  const ch = channelData.get(el);
  if (ch) loadChannel(ch);
}

function renderChannels(chs) {
  const list = $.channelList;
  list.innerHTML = '';
  if (!chs.length) return;
  const token = ++renderToken;
  let i = 0;

  function batch() {
    if (token !== renderToken) return;
    const end = Math.min(i + BATCH_SIZE, chs.length);
    const frag = document.createDocumentFragment();
    const batchLogos = [];
    for (; i < end; i++) {
      const el = makeItem(chs[i]);
      frag.appendChild(el);
      if (chs[i].logo) {
        const img = el.querySelector('.channel-logo img');
        if (img) batchLogos.push({ img, url: chs[i].logo });
      }
    }
    list.appendChild(frag);
    if (i < chs.length) {
      setTimeout(batch, 0);
    } else {
      for (const { img, url } of batchLogos) lazyLogo(img, url);
      updateSelection();
    }
  }
  setTimeout(batch, 0);
}

function updateSelection() {
  const cur = currentChannel && currentChannel.url;
  for (const el of qsa('.channel-item')) el.classList.toggle('active', el.dataset.url === cur);
}

const BREAKPOINT = 768;

function isSmallScreen() {
  return window.innerWidth <= BREAKPOINT;
}

function collapsePanel() {
  document.querySelector('.panel').classList.add('collapsed');
  localStorage.setItem('panelCollapsed', 'true');
}

function expandPanel() {
  document.querySelector('.panel').classList.remove('collapsed');
  localStorage.setItem('panelCollapsed', 'false');
}

function autoCollapsePanel() {
  if (isSmallScreen()) collapsePanel();
}

function togglePanel() {
  const panel = document.querySelector('.panel');
  const collapsed = panel.classList.contains('collapsed');
  if (collapsed) expandPanel(); else collapsePanel();
}

let nativeListeners = null;

function cleanupNativeListeners() {
  if (nativeListeners) {
    const v = $.videoPlayer;
    for (const [ev, fn] of nativeListeners) v.removeEventListener(ev, fn);
    nativeListeners = null;
  }
}

function stopPlayback() {
  const video = $.videoPlayer;
  cleanupNativeListeners();
  video.removeAttribute('src');
  video.load();
}

function setupNativeEvents() {
  cleanupNativeListeners();
  const video = $.videoPlayer;
  const onPlaying = () => { $.loadingOverlay.classList.add('hidden'); };
  const onWaiting = () => { if (currentChannel) $.loadingOverlay.classList.remove('hidden'); };
  const onError = () => { triggerPlaybackError(); };
  video.addEventListener('playing', onPlaying);
  video.addEventListener('waiting', onWaiting);
  video.addEventListener('error', onError);
  nativeListeners = [['playing', onPlaying], ['waiting', onWaiting], ['error', onError]];
}

function triggerPlaybackError(msg) {
  $.loadingOverlay.classList.add('hidden');
  $.errorMessage.textContent = msg || 'Failed to load stream. Format unsupported or blocked.';
  $.errorOverlay.classList.remove('hidden');
}

async function loadChannel(ch) {
  if (!ch || !ch.url) return;
  currentChannel = ch;
  $.channelName.textContent = ch.name;
  const video = $.videoPlayer;
  video.poster = ch.logo || '';
  $.errorOverlay.classList.add('hidden');
  $.loadingOverlay.classList.remove('hidden');
  updateSelection();
  stopPlayback();

  autoCollapsePanel();
  video.src = ch.url;
  setupNativeEvents();
}

function bootstrap() {
  $.addPlaylistBtn.addEventListener('click', () => $.playlistBar.classList.toggle('hidden'));
  $.cancelPlaylistBtn.addEventListener('click', () => {
    $.playlistBar.classList.add('hidden');
    $.playlistName.value = '';
    $.playlistUrl.value = '';
  });

  $.loadUrlBtn.addEventListener('click', async () => {
    const url = $.playlistUrl.value.trim();
    if (!url) return;
    try { new URL(url); } catch { alert('Invalid URL'); return; }

    try {
      let resp = await fetch(url).catch(() => null);
      if (!resp || !resp.ok) {
        resp = await fetch(`https://corsproxy.io/?${encodeURIComponent(url)}`);
      }
      if (!resp.ok) { alert('Failed to load playlist'); return; }
      const text = await resp.text();
      const name = $.playlistName.value.trim() || new URL(url).hostname;
      await addPlaylist(name, parseM3U(text, url));
      $.playlistBar.classList.add('hidden');
      $.playlistName.value = '';
      $.playlistUrl.value = '';
    } catch (e) {
      alert('Failed to load: ' + e.message);
    }
  });

  $.fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      addPlaylist(file.name.replace(/\.m3u8?$/, ''), parseM3U(text, ''));
      $.playlistBar.classList.add('hidden');
    } catch { alert('Failed to read file'); }
    e.target.value = '';
  });

  $.playlistSelect.addEventListener('change', (e) => selectPlaylist(e.target.value));

  $.removePlaylistBtn.addEventListener('click', async () => {
    if (!currentPlaylistId || !confirm('Remove?')) return;
    playlists = playlists.filter(p => p.id !== currentPlaylistId);
    await chrome.storage.local.set({ [STORAGE_KEY]: playlists });
    currentPlaylistId = null;
    renderPlaylistSelect();
    if (playlists.length) { selectPlaylist(playlists[0].id); } else { channels = []; renderChannels(channels); showEmpty(true); }
  });

  const onSearch = debounce((e) => {
    const q = e.target.value.toLowerCase().trim();
    const all = (playlists.find(p => p.id === currentPlaylistId) || {}).channels || [];
    const filtered = q ? all.filter(ch => ch.name.toLowerCase().includes(q) || (ch.group && ch.group.toLowerCase().includes(q))) : all;
    renderChannels(filtered);
    if ($.searchEmpty) $.searchEmpty.style.display = (q && filtered.length === 0) ? 'flex' : 'none';
    if ($.emptyState) $.emptyState.style.display = (!q && filtered.length === 0) ? 'flex' : 'none';
  }, 150);

  $.searchInput.addEventListener('input', onSearch);

  $.retryBtn.addEventListener('click', () => { if (currentChannel) loadChannel(currentChannel); });

  $.channelList.addEventListener('click', (e) => {
    const item = e.target.closest('.channel-item');
    if (item) loadChannelFromClick(item);
  });

  $.channelList.addEventListener('keydown', (e) => {
    const items = $.channelList.querySelectorAll('.channel-item');
    if (!items.length) return;
    let idx = [...items].findIndex(el => el.classList.contains('focused'));
    if (idx === -1) idx = [...items].findIndex(el => el.classList.contains('active'));
    if (idx === -1) idx = 0;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = Math.min(idx + 1, items.length - 1);
      items.forEach(el => el.classList.remove('focused'));
      items[next].classList.add('focused');
      items[next].scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prev = Math.max(idx - 1, 0);
      items.forEach(el => el.classList.remove('focused'));
      items[prev].classList.add('focused');
      items[prev].scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const target = items[idx];
      if (target) loadChannelFromClick(target);
    }
  });

  $.togglePanelBtn.addEventListener('click', togglePanel);

  if (localStorage.getItem('panelCollapsed') === 'true' || isSmallScreen()) {
    document.querySelector('.panel').classList.add('collapsed');
  }

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (isSmallScreen()) collapsePanel();
    }, 200);
  });
}

async function init() {
  cacheDom();
  const data = await chrome.storage.local.get(STORAGE_KEY);
  playlists = data[STORAGE_KEY] || [];
  bootstrap();
  renderPlaylistSelect();
  if (playlists.length) { selectPlaylist(playlists[0].id); } else { showEmpty(true); }
}

function cacheDom() {
  const ids = ['playlistSelect', 'channelList', 'emptyState', 'searchEmpty', 'playlistBar',
    'playlistName', 'playlistUrl', 'togglePanelBtn', 'loadUrlBtn', 'cancelPlaylistBtn',
    'fileInput', 'channelName', 'videoPlayer', 'loadingOverlay', 'errorOverlay',
    'errorMessage', 'retryBtn', 'addPlaylistBtn', 'removePlaylistBtn', 'searchInput'];
  for (const id of ids) $[id] = document.getElementById(id);
}

init();