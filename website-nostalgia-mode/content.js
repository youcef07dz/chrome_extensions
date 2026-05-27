const DEFAULTS = {
  enabled: false,
  saturation: 1,
  brightness: 1,
  contrast: 1,
  scanlines: true,
  scanlinesOpacity: 0.2,
  noise: true,
  noiseOpacity: 0.1,
  vignette: true,
  flicker: true,
  sepia: 0,
  grayscale: 0,
  hue: 0,
  blur: 0,
  sharpness: 0,
  temperature: 0,
  invert: 0,
}

let cfg = { ...DEFAULTS }
let active = false
let animId = null
let flickerInt = null
let flickerFast = null
let syncRaf = null
let domReady = false
const trackMap = new Map() // video → overlay

// ── Make overlay for a video ──────────────────────────────
function buildOverlay() {
  const wrap = document.createElement('div')
  wrap.className = '__n_overlay'
  const s = wrap.style
  s.setProperty('position', 'fixed', 'important')
  s.setProperty('pointer-events', 'none', 'important')
  s.setProperty('z-index', '2147483647', 'important')
  s.setProperty('overflow', 'hidden', 'important')

  // scanlines
  const sl = document.createElement('div')
  sl.className = '__n_sl'
  const ss = sl.style
  ss.setProperty('position', 'absolute', 'important')
  ss.setProperty('inset', '0', 'important')
  ss.setProperty('pointer-events', 'none', 'important')
  ss.setProperty('mix-blend-mode', 'overlay', 'important')
  sl.dataset.effect = 'scanlines'
  wrap.appendChild(sl)

  // vignette
  const vg = document.createElement('div')
  vg.className = '__n_vg'
  const vs = vg.style
  vs.setProperty('position', 'absolute', 'important')
  vs.setProperty('inset', '0', 'important')
  vs.setProperty('pointer-events', 'none', 'important')
  vs.setProperty('mix-blend-mode', 'multiply', 'important')
  vs.setProperty('background', 'radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.6) 100%)', 'important')
  vg.dataset.effect = 'vignette'
  wrap.appendChild(vg)

  // noise canvas
  const cvs = document.createElement('canvas')
  cvs.className = '__n_nz'
  cvs.width = 160
  cvs.height = 120
  cvs._ctx = cvs.getContext('2d')
  const cs = cvs.style
  cs.setProperty('position', 'absolute', 'important')
  cs.setProperty('inset', '0', 'important')
  cs.setProperty('width', '100%', 'important')
  cs.setProperty('height', '100%', 'important')
  cs.setProperty('image-rendering', 'pixelated', 'important')
  cs.setProperty('mix-blend-mode', 'overlay', 'important')
  cs.setProperty('pointer-events', 'none', 'important')
  cvs.dataset.effect = 'noise'
  wrap.appendChild(cvs)

  return wrap
}

// ── Track / untrack a video ───────────────────────────────
function trackVideo(video) {
  try {
    if (trackMap.has(video)) return

    const overlay = buildOverlay()
    document.documentElement.appendChild(overlay)
    trackMap.set(video, overlay)
  } catch (e) { console.error('nostalgia trackVideo', e) }
}

function untrackVideo(video) {
  try {
    video.style.removeProperty('filter')
    const overlay = trackMap.get(video)
    if (overlay) {
      overlay.remove()
      trackMap.delete(video)
    }
  } catch (e) { console.error('nostalgia untrackVideo', e) }
}

function syncOverlays() {
  if (syncRaf) cancelAnimationFrame(syncRaf)

  function frame() {
    try {
      if (!active) return
      for (const [video, overlay] of trackMap) {
        if (!video.isConnected) {
          untrackVideo(video)
          continue
        }
        const r = video.getBoundingClientRect()
        overlay.style.setProperty('left', r.left + 'px', 'important')
        overlay.style.setProperty('top', r.top + 'px', 'important')
        overlay.style.setProperty('width', r.width + 'px', 'important')
        overlay.style.setProperty('height', r.height + 'px', 'important')
      }
    } catch (e) { console.error('nostalgia sync', e) }
    syncRaf = requestAnimationFrame(frame)
  }
  syncRaf = requestAnimationFrame(frame)
}

function stopSync() {
  if (syncRaf !== null) { cancelAnimationFrame(syncRaf); syncRaf = null }
}

// ── Refresh effect visibility / params ────────────────────
function refreshAll() {
  try {
    for (const [video, overlay] of trackMap) {
      const f = cfg
      const filters = [
        `brightness(${f.brightness})`,
        `contrast(${f.contrast})`,
        `saturate(${f.saturation})`,
      ]

      if (f.invert > 0) filters.push(`invert(${f.invert})`)
      if (f.sepia > 0) filters.push(`sepia(${f.sepia})`)
      if (f.grayscale > 0) filters.push(`grayscale(${f.grayscale})`)
      if (f.hue > 0) filters.push(`hue-rotate(${f.hue}deg)`)
      if (f.blur > 0) filters.push(`blur(${f.blur}px)`)

      if (f.sharpness > 0) {
        filters.push(`contrast(${1 + f.sharpness * 0.15})`)
      }

      if (f.temperature !== 0) {
        if (f.temperature > 0) {
          filters.push(`sepia(${f.temperature * 0.15})`)
          filters.push(`hue-rotate(${f.temperature * -5}deg)`)
        } else {
          const cool = -f.temperature
          filters.push(`hue-rotate(${cool * 10}deg)`)
        }
      }

      video.style.setProperty('filter', filters.join(' '), 'important')
      video.style.setProperty('transition', 'none', 'important')

      const sl = overlay.querySelector('.__n_sl')
      if (sl) {
        if (cfg.scanlines && cfg.scanlinesOpacity > 0) {
          sl.style.removeProperty('display')
          sl.style.setProperty('opacity', String(cfg.scanlinesOpacity), 'important')
          sl.style.setProperty('background',
            'repeating-linear-gradient(0deg,' +
            'transparent 0px, transparent 1px,' +
            'rgba(0,0,0,0.35) 1px, rgba(0,0,0,0.35) 3px)',
            'important')
        } else {
          sl.style.setProperty('display', 'none', 'important')
        }
      }

      const vg = overlay.querySelector('.__n_vg')
      if (vg) {
        if (cfg.vignette) {
          vg.style.removeProperty('display')
        } else {
          vg.style.setProperty('display', 'none', 'important')
        }
      }

      const nz = overlay.querySelector('.__n_nz')
      if (nz) {
        if (cfg.noise && cfg.noiseOpacity > 0) {
          nz.style.removeProperty('display')
          nz.style.setProperty('opacity', String(cfg.noiseOpacity), 'important')
        } else {
          nz.style.setProperty('display', 'none', 'important')
        }
      }
    }
  } catch (e) { console.error('nostalgia refreshAll', e) }
}

// ── Noise ─────────────────────────────────────────────────
function startNoise() {
  function frame() {
    try {
      if (!cfg.noise || cfg.noiseOpacity <= 0) { animId = requestAnimationFrame(frame); return }
      for (const [, overlay] of trackMap) {
        const cvs = overlay.querySelector('.__n_nz')
        if (!cvs || !cvs._ctx) continue
        const w = cvs.width, h = cvs.height
        const img = cvs._ctx.createImageData(w, h)
        const d = img.data
        for (let i = 0; i < d.length; i += 4) {
          const v = Math.random() * 255
          d[i] = v; d[i+1] = v; d[i+2] = v; d[i+3] = 255
        }
        cvs._ctx.putImageData(img, 0, 0)
      }
    } catch (e) { console.error('nostalgia noise', e) }
    animId = requestAnimationFrame(frame)
  }
  frame()
}

function stopNoise() {
  try {
    if (animId !== null) { cancelAnimationFrame(animId); animId = null }
  } catch (e) { console.error('nostalgia stopNoise', e) }
}

// ── Flicker ───────────────────────────────────────────────
function startFlicker() {
  let tick = 0
  flickerFast = setInterval(() => {
    try {
      if (!cfg.flicker) return
      tick++
      const v = tick % 3 === 0 ? '0.97' : '1'
      for (const [, overlay] of trackMap) overlay.style.setProperty('opacity', v, 'important')
    } catch (e) { console.error('nostalgia flickerFast', e) }
  }, 80)

  flickerInt = setInterval(() => {
    try {
      if (!cfg.flicker) return
      const v = Math.random() > 0.92 ? '0.95' : '1'
      for (const [, overlay] of trackMap) overlay.style.setProperty('opacity', v, 'important')
    } catch (e) { console.error('nostalgia flickerInt', e) }
  }, 400)
}

function stopFlicker() {
  try {
    if (flickerFast !== null) { clearInterval(flickerFast); flickerFast = null }
    if (flickerInt !== null) { clearInterval(flickerInt); flickerInt = null }
    for (const [, overlay] of trackMap) overlay.style.removeProperty('opacity')
  } catch (e) { console.error('nostalgia stopFlicker', e) }
}

// ── Find videos (including inside shadow DOM) ────────────
function findVideos() {
  try {
    const videos = []
    const walk = (root) => {
      root.querySelectorAll('video').forEach((v) => videos.push(v))
      root.querySelectorAll('*').forEach((el) => {
        if (el.shadowRoot) walk(el.shadowRoot)
      })
    }
    walk(document)
    return videos
  } catch (e) { console.error('nostalgia findVideos', e); return [] }
}

// ── Observer ──────────────────────────────────────────────
let observer = null

function scanVideos() {
  try { findVideos().forEach(trackVideo) } catch (e) { console.error('nostalgia scanVideos', e) }
}

function startObserver() {
  try {
    if (observer) return
    observer = new MutationObserver(() => {
      try {
        if (!active) return
        findVideos().forEach((v) => {
          if (!trackMap.has(v)) trackVideo(v)
        })
      } catch (e) { console.error('nostalgia mutation', e) }
    })
    const target = document.body || document.documentElement
    if (target) observer.observe(target, { childList: true, subtree: true })
  } catch (e) { console.error('nostalgia startObserver', e) }
}

function stopObserver() {
  try { if (observer) { observer.disconnect(); observer = null } } catch (e) { console.error('nostalgia stopObserver', e) }
}

// ── Apply / remove ────────────────────────────────────────
function apply() {
  try {
    if (active) return
    active = true
    scanVideos()
    startObserver()
    syncOverlays()
    refreshAll()
    startFlicker()
    startNoise()
  } catch (e) { console.error('nostalgia apply', e) }
}

function remove() {
  try {
    active = false
    stopNoise()
    stopFlicker()
    stopSync()
    stopObserver()
    for (const [video] of trackMap) untrackVideo(video)
    trackMap.clear()
  } catch (e) { console.error('nostalgia remove', e) }
}

// ── Config ────────────────────────────────────────────────
function applyConfig(changed) {
  try {
    if (!active && cfg.enabled) { apply(); return }
    if (active && !cfg.enabled) { remove(); return }
    if (!active) return

    refreshAll()

    if ('flicker' in changed) {
      stopFlicker()
      if (cfg.flicker) startFlicker()
    }
  } catch (e) { console.error('nostalgia applyConfig', e) }
}

function loadConfig(items) {
  try {
    for (const k of Object.keys(DEFAULTS)) {
      if (k in items) cfg[k] = items[k]
    }
    if (cfg.enabled) {
      if (domReady) apply()
      else document.addEventListener('DOMContentLoaded', apply, { once: true })
    }
  } catch (e) { console.error('nostalgia loadConfig', e) }
}

// ── Storage & messaging ───────────────────────────────────
chrome.storage.onChanged.addListener((changes) => {
  try {
    const payload = {}
    for (const [k, v] of Object.entries(changes)) {
      if (k in DEFAULTS) cfg[k] = v.newValue, payload[k] = v.newValue
    }
    if (Object.keys(payload).length) applyConfig(payload)
  } catch (e) { console.error('nostalgia storage', e) }
})

chrome.runtime.onMessage.addListener((msg) => {
  try {
    if (msg.type === 'nostalgia-toggle') {
      cfg.enabled = msg.enabled
      if (msg.enabled) apply()
      else remove()
    }
    if (msg.type === 'nostalgia-update') {
      if (msg.key in DEFAULTS) {
        cfg[msg.key] = msg.value
        applyConfig({ [msg.key]: msg.value })
      }
    }
  } catch (e) { console.error('nostalgia message', e) }
})

domReady = document.readyState !== 'loading'
try { chrome.storage.sync.get(Object.keys(DEFAULTS), (r) => loadConfig(r)) } catch (e) { console.error('nostalgia init', e) }
