const STORAGE_KEY = 'iptv_playlists';
const LOGO_TIMEOUT = 5000;
const CONCURRENCY = 4;
const LOGO_CACHE = 'iptv-logos-v1';

let playlists = [];
let currentPlaylistId = null;
let channels = [];
let currentChannel = null;
const $ = {};

let hlsPipeline = null;
let hlsNativeListeners = null;

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

function hexToIv(hex) {
  const bytes = new Uint8Array(16);
  for (let i = 0; i < 16 && i * 2 < hex.length; i++)
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  return bytes;
}

function sequenceToIv(seq) {
  const iv = new Uint8Array(16);
  iv[12] = (seq >> 24) & 0xff;
  iv[13] = (seq >> 16) & 0xff;
  iv[14] = (seq >> 8) & 0xff;
  iv[15] = seq & 0xff;
  return iv;
}

// --- HLS Pipeline ---

class HlsPipeline {
  constructor(url, video) {
    this.url = url;
    this.baseUrl = url.includes('/') ? url.substring(0, url.lastIndexOf('/') + 1) : url;
    this.video = video;
    this.ac = new AbortController();
    this.signal = this.ac.signal;
    this.ms = null;
    this.sb = null;
    this.blobUrl = '';
    this.segments = [];
    this.keys = new Map();
    this.loadedUrls = new Set();
    this.targetDuration = 10;
    this.endList = true;
    this.parsed = false;
    this.done = false;
    this.liveTimer = null;
    this.mapLoaded = false;
    this.lastRangeUrl = null;
    this.byteOffset = 0;
    this.onErrorFn = null;
    this.onDoneFn = null;
  }

  onError(fn) { this.onErrorFn = fn; }
  onDone(fn) { this.onDoneFn = fn; }

  async start() {
    this.ms = new MediaSource();
    this.blobUrl = URL.createObjectURL(this.ms);
    this.video.src = this.blobUrl;
    return new Promise((resolve, reject) => {
      this.ms.addEventListener('sourceopen', async () => {
        try {
          await this.loadPlaylist();
          this.setupSourceBuffer();
          this.runPipeline().then(resolve).catch(reject);
        } catch (e) { reject(e); }
      }, { once: true });
    });
  }

  async loadPlaylist() {
    const resp = await fetch(this.url, { signal: this.signal });
    if (!resp.ok) throw new Error('Playlist fetch failed');
    const text = await resp.text();

    if (/EXT-X-STREAM-INF/i.test(text)) {
      const lines = text.split('\n');
      let variant = '';
      for (let i = 0; i < lines.length; i++) {
        if (/^#EXT-X-STREAM-INF/i.test(lines[i].trim())) {
          for (let j = i + 1; j < lines.length; j++) {
            const l = lines[j].trim();
            if (l && !l.startsWith('#')) { variant = resolveUrl(this.url, l); break; }
          }
          if (variant) break;
        }
      }
      if (!variant) throw new Error('No variant found');
      this.url = variant;
      this.baseUrl = variant.includes('/') ? variant.substring(0, variant.lastIndexOf('/') + 1) : variant;
      return this.loadPlaylist();
    }

    const p = this.parsePlaylist(text);
    this.segments = this.parsed ? p.segments.filter(s => !this.loadedUrls.has(s.url)) : p.segments;
    this.parsed = true;
    this.targetDuration = p.targetDuration || 10;
    this.endList = p.endList;
  }

  parsePlaylist(content) {
    const lines = content.split('\n');
    const segments = [];
    let key = null, map = null, br = null, disc = false;
    let td = 10, end = false, seqNum = 0;

    for (let i = 0; i < lines.length; i++) {
      const l = lines[i].trim();
      if (!l) continue;

      if (l.startsWith('#EXTINF:')) {
        const dm = l.match(/#EXTINF:\s*(-?\d+(?:\.\d+)?)/);
        const dur = dm ? parseFloat(dm[1]) : 0;
        let url = '';
        for (let j = i + 1; j < lines.length; j++) {
          const n = lines[j].trim();
          if (n && !n.startsWith('#')) { url = resolveUrl(this.baseUrl, n); i = j; break; }
        }
        const segKey = key ? { uri: key.uri, iv: key.iv, method: key.method } : null;
        const iv = segKey ? (segKey.iv || sequenceToIv(seqNum)) : null;
        segments.push({
          url, duration: dur, key: segKey, iv,
          map: map ? { url: map.url, byteRange: map.byteRange } : null,
          byteRange: br, discontinuity: disc
        });
        br = null; disc = false; seqNum++;

      } else if (l.startsWith('#EXT-X-KEY')) {
        const m = (l.match(/METHOD=([^\s,]+)/) || [])[1];
        if (m === 'NONE') { key = null; continue; }
        const u = (l.match(/URI="([^"]+)"/) || [])[1];
        if (!u) continue;
        const ivHex = (l.match(/IV=0x([0-9A-Fa-f]+)/) || [])[1];
        key = { method: m, uri: resolveUrl(this.baseUrl, u), iv: ivHex ? hexToIv(ivHex) : null };

      } else if (l.startsWith('#EXT-X-MAP')) {
        const u = (l.match(/URI="([^"]+)"/) || [])[1];
        const br2 = (l.match(/BYTERANGE="([^"]+)"/) || [])[1];
        map = { url: u ? resolveUrl(this.baseUrl, u) : '', byteRange: br2 || null };

      } else if (l.startsWith('#EXT-X-BYTERANGE')) {
        br = l.split(':')[1].trim();

      } else if (l.startsWith('#EXT-X-DISCONTINUITY')) {
        disc = true;

      } else if (l.startsWith('#EXT-X-MEDIA-SEQUENCE')) {
        seqNum = parseInt(l.split(':')[1], 10) || 0;

      } else if (l.startsWith('#EXT-X-TARGETDURATION')) {
        td = parseInt(l.split(':')[1], 10) || 10;

      } else if (l.startsWith('#EXT-X-ENDLIST')) {
        end = true;
      }
    }
    return { segments, targetDuration: td, endList: end };
  }

  setupSourceBuffer() {
    let mime = 'video/mp2t';
    if (this.segments.length > 0) {
      const u = this.segments[0].url;
      if (/\.(m4s|mp4)(\?|$)/i.test(u) || this.segments[0].map) mime = 'video/mp4';
    }
    try { this.sb = this.ms.addSourceBuffer(mime); } catch {
      try { this.sb = this.ms.addSourceBuffer(mime === 'video/mp2t' ? 'video/mp4' : 'video/mp2t'); } catch { throw new Error('No supported MIME'); }
    }
  }

  async fetchSegment(seg) {
    if (seg.map && !this.mapLoaded) {
      this.mapLoaded = true;
      const r = await fetch(seg.map.url, { signal: this.signal });
      if (r.ok || r.status === 206) {
        this.sb.appendBuffer(await r.arrayBuffer());
        await new Promise(res => this.sb.addEventListener('updateend', res, { once: true }));
      }
    }

    let resp;
    if (seg.byteRange) {
      if (seg.url !== this.lastRangeUrl) { this.lastRangeUrl = seg.url; this.byteOffset = 0; }
      const parts = seg.byteRange.split('@');
      const len = parseInt(parts[0], 10);
      const off = parts.length > 1 ? parseInt(parts[1], 10) : this.byteOffset;
      this.byteOffset = off + len;
      resp = await fetch(seg.url, { signal: this.signal, headers: { Range: `bytes=${off}-${off + len - 1}` } });
    } else {
      resp = await fetch(seg.url, { signal: this.signal });
    }
    if (!resp.ok && resp.status !== 206) throw new Error('Segment fetch failed');
    let data = await resp.arrayBuffer();

    if (seg.key && seg.key.method === 'AES-128') {
      let kd = this.keys.get(seg.key.uri);
      if (!kd) {
        const kr = await fetch(seg.key.uri, { signal: this.signal });
        if (!kr.ok) throw new Error('Key fetch failed');
        kd = await kr.arrayBuffer();
        this.keys.set(seg.key.uri, kd);
      }
      const key = await crypto.subtle.importKey('raw', kd, 'AES-CBC', false, ['decrypt']);
      data = await crypto.subtle.decrypt({ name: 'AES-CBC', iv: seg.iv }, key, data);
    }

    this.loadedUrls.add(seg.url);
    return data;
  }

  async runPipeline() {
    let loadIdx = 0;
    while (loadIdx < this.segments.length && !this.signal.aborted) {
      if (this.sb.updating) {
        await new Promise(res => this.sb.addEventListener('updateend', res, { once: true }));
        continue;
      }
      const seg = this.segments[loadIdx++];
      try {
        const data = await this.fetchSegment(seg);
        if (!this.signal.aborted) this.sb.appendBuffer(data);
      } catch (err) {
        if (!this.signal.aborted && this.onErrorFn) {
          this.onErrorFn(err);
          return;
        }
      }
    }
    if (!this.signal.aborted) {
      if (this.endList) this.finish();
      else this.scheduleLive();
    }
  }

  finish() {
    if (this.done || this.ms.readyState !== 'open') return;
    this.done = true;
    try { this.ms.endOfStream(); } catch {}
    if (this.onDoneFn) this.onDoneFn();
  }

  scheduleLive() {
    if (this.signal.aborted || this.done) return;
    this.liveTimer = setTimeout(async () => {
      if (this.signal.aborted) return;
      try {
        await this.loadPlaylist();
        if (this.segments.length > 0) await this.runPipeline();
        else this.scheduleLive();
      } catch { if (!this.signal.aborted) this.scheduleLive(); }
    }, this.targetDuration * 500);
  }

  destroy() {
    this.ac.abort();
    this.done = true;
    if (this.liveTimer) { clearTimeout(this.liveTimer); this.liveTimer = null; }
    if (this.sb && this.ms && this.ms.readyState === 'open') {
      try { this.sb.abort(); } catch {}
      try { this.ms.endOfStream(); } catch {}
    }
    this.sb = null;
    this.ms = null;
  }
}

// --- DOM refs ---

function cacheDom() {
  const ids = ['playlistSelect', 'channelList', 'emptyState', 'searchEmpty', 'playlistBar',
    'playlistName', 'playlistUrl', 'togglePanelBtn', 'loadUrlBtn', 'cancelPlaylistBtn',
    'fileInput', 'channelName', 'videoPlayer', 'loadingOverlay', 'errorOverlay',
    'errorMessage', 'retryBtn', 'addPlaylistBtn', 'removePlaylistBtn', 'searchInput'];
  for (const id of ids) $[id] = document.getElementById(id);
}

// --- M3U ---

function parseM3U(content) {
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
      cur.url = line;
      result.push(cur);
      cur = null;
    }
  }
  return result;
}

// --- Playlist state ---

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

// --- Logo cache ---

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

// --- Channel rendering ---

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

// --- Responsive ---

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

// --- Video player ---

function cleanupNativeListeners() {
  if (hlsNativeListeners) {
    const v = $.videoPlayer;
    for (const [ev, fn] of hlsNativeListeners) v.removeEventListener(ev, fn);
    hlsNativeListeners = null;
  }
}

function stopPlayback() {
  const video = $.videoPlayer;
  if (hlsPipeline) { hlsPipeline.destroy(); hlsPipeline = null; }
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
  hlsNativeListeners = [['playing', onPlaying], ['waiting', onWaiting], ['error', onError]];
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

  const url = ch.url;
  const isHls = /\.m3u8?(:?\?|$)/i.test(url);
  const hasNativeHls = video.canPlayType('application/x-mpegURL') || video.canPlayType('application/vnd.apple.mpegURL');

  autoCollapsePanel();

  if (!isHls || hasNativeHls) {
    video.src = url;
    setupNativeEvents();
    return;
  }

  hlsPipeline = new HlsPipeline(url, video);
  hlsPipeline.onError(() => {
    if (!hlsPipeline || hlsPipeline.signal.aborted) return;
    const fallbackUrl = hlsPipeline.url;
    stopPlayback();
    video.src = fallbackUrl;
    setupNativeEvents();
  });

  try {
    await hlsPipeline.start();
    setupNativeEvents();
  } catch {
    if (!hlsPipeline || !hlsPipeline.signal.aborted) {
      stopPlayback();
      video.src = url;
      setupNativeEvents();
    }
  }
}

// --- Events ---

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
    $.loadUrlBtn.textContent = '...';
    $.loadUrlBtn.disabled = true;
    try {
      const result = await chrome.runtime.sendMessage({ type: 'proxyFetch', url });
      if (!result.ok) throw new Error();
      const name = $.playlistName.value.trim() || url.split('/').pop().replace(/\.m3u8?$/, '') || 'Remote';
      addPlaylist(name, parseM3U(result.text));
      $.playlistBar.classList.add('hidden');
      $.playlistName.value = '';
      $.playlistUrl.value = '';
    } catch { alert('Failed to load playlist'); }
    $.loadUrlBtn.textContent = 'Load URL';
    $.loadUrlBtn.disabled = false;
  });

  $.fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      addPlaylist(file.name.replace(/\.m3u8?$/, ''), parseM3U(await file.text()));
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
    const filtered = q ? all.filter(ch => {
      if (ch.name.toLowerCase().includes(q)) return true;
      return ch.group && ch.group.toLowerCase().includes(q);
    }) : all;
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

// --- Init ---

async function init() {
  cacheDom();
  const data = await chrome.storage.local.get(STORAGE_KEY);
  playlists = data[STORAGE_KEY] || [];
  bootstrap();
  renderPlaylistSelect();
  if (playlists.length) { selectPlaylist(playlists[0].id); } else { showEmpty(true); }
}

init();
