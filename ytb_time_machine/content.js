function idFromHref(href) {
  const m = href.match(/[?&]v=([\w-]{11})/);
  return m ? m[1] : null;
}

function extractAllVideoIds() {
  const ids = new Map();

  const watchLinks = document.querySelectorAll('a[href*="/watch?v="]');
  for (const a of watchLinks) {
    const id = idFromHref(a.href);
    if (!id || ids.has(id)) continue;
    ids.set(id, { videoId: id, title: '', channel: '', duration: '' });
  }

  const shortsLinks = document.querySelectorAll('a[href*="/shorts/"]');
  for (const a of shortsLinks) {
    const m = a.href.match(/\/shorts\/([\w-]{11})/);
    if (m && !ids.has(m[1])) ids.set(m[1], { videoId: m[1], title: '', channel: '' });
  }

  const thumbnails = document.querySelectorAll('img[src*="/vi/"]');
  for (const img of thumbnails) {
    const m = img.src.match(/\/vi\/([\w-]{11})\//);
    if (m && !ids.has(m[1])) ids.set(m[1], { videoId: m[1], title: '', channel: '' });
  }

  for (const [id, entry] of ids) {
    const refs = document.querySelectorAll(`a[href*="/watch?v=${id}"]`);
    for (const a of refs) {
      if (a.hasAttribute('aria-label')) {
        const label = a.getAttribute('aria-label').replace(/\s*-\s*YouTube\s*$/, '').split(' - ')[0].trim();
        if (label) entry.title = label;
      }
      if (!entry.title && a.title) entry.title = a.title.trim();
      if (!entry.title && a.textContent.trim()) entry.title = a.textContent.trim();
    }

    if (!entry.title) {
      const lockup = document.querySelector(`yt-lockup-view-model a[href*="/watch?v=${id}"]`);
      if (lockup) {
        const card = lockup.closest('yt-lockup-view-model');
        if (card) {
          const titleEl = card.querySelector('yt-lockup-metadata-view-model h3 a');
          if (titleEl) {
            const span = titleEl.querySelector('span');
            entry.title = (span ? span.textContent.trim() : titleEl.textContent.trim());
          }
        }
      }
    }

    if (!entry.title) {
      const anyTitle = document.querySelector(`[href*="/watch?v=${id}"] #video-title, [href*="/watch?v=${id}"] [id*="video-title"]`);
      if (anyTitle) entry.title = anyTitle.textContent.trim();
    }

    if (!entry.title) {
      const url = new URL(location.href);
      if (url.pathname === '/watch' && url.searchParams.get('v') === id) {
        const metaTitle = document.querySelector('meta[property="og:title"]');
        const titleEl = document.querySelector('h1.ytd-watch-metadata, #title h1');
        entry.title = titleEl ? titleEl.textContent.trim()
                    : metaTitle ? metaTitle.content
                    : document.title.replace(' - YouTube', '').trim();
      }
    }
  }

  for (const [id, entry] of ids) {
    if (entry.channel) continue;
    const lockup = document.querySelector(`yt-lockup-view-model a[href*="/watch?v=${id}"]`);
    if (lockup) {
      const card = lockup.closest('yt-lockup-view-model');
      if (card) {
        const ch = card.querySelector('yt-channel-name, yt-lockup-metadata-view-model a[href*="/@"], a[href*="/@"][title]');
        if (ch) entry.channel = ch.textContent.trim();
      }
    }
    if (!entry.channel) {
      const renderer = document.querySelector(`ytd-video-renderer a[href*="/watch?v=${id}"], ytd-rich-item-renderer a[href*="/watch?v=${id}"]`);
      if (renderer) {
        const card = renderer.closest('ytd-video-renderer, ytd-rich-item-renderer');
        if (card) {
          const ch = card.querySelector('#channel-name yt-formatted-string a');
          if (ch) entry.channel = ch.textContent.trim();
        }
      }
    }
    if (!entry.channel && id === new URL(location.href).searchParams.get('v')) {
      const ch = document.querySelector('#owner #channel-name yt-formatted-string a, ytd-channel-name yt-formatted-string a');
      if (ch) entry.channel = ch.textContent.trim();
    }
  }

  for (const [id, entry] of ids) {
    if (entry.duration) continue;
    const lockup = document.querySelector(`yt-lockup-view-model a[href*="/watch?v=${id}"]`);
    if (lockup) {
      const card = lockup.closest('yt-lockup-view-model');
      if (card) {
        const badge = card.querySelector('yt-thumbnail-bottom-overlay-view-model yt-thumbnail-badge-view-model badge-shape div, yt-thumbnail-overlay-time-status-renderer');
        if (badge) entry.duration = badge.textContent.trim();
      }
    }
    if (!entry.duration) {
      const renderer = document.querySelector(`ytd-video-renderer a[href*="/watch?v=${id}"], ytd-rich-item-renderer a[href*="/watch?v=${id}"]`);
      if (renderer) {
        const card = renderer.closest('ytd-video-renderer, ytd-rich-item-renderer');
        if (card) {
          const badge = card.querySelector('ytd-thumbnail-overlay-time-status-renderer span');
          if (badge) entry.duration = badge.textContent.trim();
        }
      }
    }
  }

  return [...ids.values()];
}

const savedVideoIds = new Set();

function savePageVideos() {
  const all = extractAllVideoIds();
  const newOnes = all.filter(v => !savedVideoIds.has(v.videoId));
  if (newOnes.length === 0) return;
  for (const v of newOnes) savedVideoIds.add(v.videoId);
  chrome.runtime.sendMessage({ type: 'SAVE_VIDEOS', videos: newOnes });
}

let debounceTimer = null;
function debouncedSave() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(savePageVideos, 800);
}

const observer = new MutationObserver(() => debouncedSave());
observer.observe(document.body, { childList: true, subtree: true });

window.addEventListener('yt-navigate-finish', () => debouncedSave());

savePageVideos();
