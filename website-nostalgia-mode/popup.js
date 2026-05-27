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
  invert: 0,
  sepia: 0,
  grayscale: 0,
  hue: 0,
  blur: 0,
  sharpness: 0,
  temperature: 0,
}

const $ = (id) => document.getElementById(id)
const master = $('masterToggle')
const controls = $('controls')
const saveBtn = $('saveBtn')

const fields = [
  { id: 'scanlines', slider: 'scanlinesOpacity', val: 'scanlinesVal' },
  { id: 'noise', slider: 'noiseOpacity', val: 'noiseVal' },
  { id: 'vignette' },
  { id: 'flicker' },
]

const sliders = [
  { id: 'saturation', val: 'saturationVal' },
  { id: 'brightness', val: 'brightnessVal' },
  { id: 'contrast', val: 'contrastVal' },
  { id: 'invert', val: 'invertVal' },
  { id: 'sepia', val: 'sepiaVal' },
  { id: 'grayscale', val: 'grayscaleVal' },
  { id: 'hue', val: 'hueVal' },
  { id: 'blur', val: 'blurVal' },
  { id: 'sharpness', val: 'sharpnessVal' },
  { id: 'temperature', val: 'temperatureVal' },
]

let dirty = {}

function sendUpdate(key, value) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) chrome.tabs.sendMessage(tabs[0].id, { type: 'nostalgia-update', key, value })
  })
}

function markDirty(key, value) {
  dirty[key] = value
  saveBtn.disabled = Object.keys(dirty).length === 0
  saveBtn.textContent = 'Save'
  sendUpdate(key, value)
}

function flushSave() {
  if (Object.keys(dirty).length === 0) return
  chrome.storage.sync.set(dirty)
  dirty = {}
  saveBtn.disabled = true
  saveBtn.textContent = 'Saved'
}

chrome.storage.sync.get(Object.keys(DEFAULTS), (result) => {
  for (const k of Object.keys(DEFAULTS)) {
    if (result[k] === undefined) result[k] = DEFAULTS[k]
  }

  master.checked = result.enabled
  setControlsEnabled(result.enabled)

  for (const f of fields) {
    const cb = $(f.id)
    if (cb) cb.checked = result[f.id]
    if (f.slider) {
      const sl = $(f.slider)
      sl.value = String(result[f.slider])
      $(f.val).textContent = sl.value
    }
  }

  for (const s of sliders) {
    const sl = $(s.id)
    sl.value = String(result[s.id])
    $(s.val).textContent = sl.value
  }
})

master.addEventListener('change', () => {
  const on = master.checked
  markDirty('enabled', on)
  setControlsEnabled(on)

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) chrome.tabs.sendMessage(tabs[0].id, { type: 'nostalgia-toggle', enabled: on })
  })
})

function setControlsEnabled(on) {
  controls.style.opacity = on ? '1' : '0.4'
  controls.style.pointerEvents = on ? 'auto' : 'none'
}

for (const f of fields) {
  const cb = $(f.id)
  cb.addEventListener('change', () => {
    markDirty(f.id, cb.checked)
  })

  if (f.slider) {
    const sl = $(f.slider)
    sl.addEventListener('input', () => {
      $(f.val).textContent = sl.value
      sendUpdate(f.slider, Number(sl.value))
    })
    sl.addEventListener('change', () => {
      sendUpdate(f.slider, Number(sl.value))
      markDirty(f.slider, Number(sl.value))
    })
  }
}

for (const s of sliders) {
  const sl = $(s.id)
  sl.addEventListener('input', () => {
    $(s.val).textContent = sl.value
    sendUpdate(s.id, Number(sl.value))
  })
  sl.addEventListener('change', () => {
    sendUpdate(s.id, Number(sl.value))
    markDirty(s.id, Number(sl.value))
  })
}

document.querySelectorAll('.rst-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    const key = btn.dataset.key
    const sk = btn.dataset.skey
    const sd = sliders.find((s) => s.id === key)
    const fd = sk ? fields.find((f) => f.slider === sk) : null

    if (sd) {
      const sl = $(key)
      sl.value = String(DEFAULTS[key])
      $(sd.val).textContent = sl.value
      markDirty(key, DEFAULTS[key])
    } else {
      const cb = $(key)
      cb.checked = DEFAULTS[key]
      markDirty(key, DEFAULTS[key])
      if (sk && fd) {
        const sl = $(sk)
        sl.value = String(DEFAULTS[sk])
        $(fd.val).textContent = sl.value
        markDirty(sk, DEFAULTS[sk])
      }
    }
  })
})

saveBtn.addEventListener('click', flushSave)
