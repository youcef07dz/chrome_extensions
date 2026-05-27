// URL resolver for relative paths in playlists

function resolveUrl(base, relative) {
  if (!relative) return '';
  if (/^[a-z][a-z0-9+.-]*:/i.test(relative)) return relative;
  if (relative.startsWith('//')) {
    try { return new URL(relative, 'https:').href; } catch { return 'https:' + relative; }
  }
  if (relative.startsWith('/')) {
    try { return new URL(relative, base).href; } catch { return relative; }
  }
  try { return new URL(relative, base).href; } catch { return relative; }
}

function resolvePlaylistUrls(content, baseUrl) {
  return content.split('\n').map(line => {
    const t = line.trim();
    if (!t || t.startsWith('#') || /^[a-z][a-z0-9+.-]*:/i.test(t)) return line;
    const r = resolveUrl(baseUrl, t);
    return r !== t ? line.replace(t, r) : line;
  }).join('\n');
}

async function proxyFetch(url, options = {}) {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), options.timeout || 15000);
  try {
    const resp = await fetch(url, { signal: ac.signal, redirect: 'follow' });
    const text = await resp.text();
    return { ok: resp.ok, status: resp.status, text: resolvePlaylistUrls(text, url) };
  } catch (e) {
    return { ok: false, error: e.message };
  } finally {
    clearTimeout(timer);
  }
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'proxyFetch') { proxyFetch(msg.url, msg.options).then(sendResponse); return true; }
});

chrome.action.onClicked.addListener(() => {
  chrome.tabs.create({ url: chrome.runtime.getURL('player.html'), active: true });
});