const DEFAULT_SETTINGS = {
  bgType: 'color',
  bgColor: '#1a1a2e',
  gradColor1: '#1a1a2e',
  gradColor2: '#16213e',
  gradDirection: 'to right',
  bgImageUrl: '',
  textColor: '#ffffff',
  fontSize: 16,
  userName: '',
  showTime: true,
  showDate: true,
  showGreeting: true,
  showQuote: true,
  showSearch: true,
  showWeather: true,
  showLinks: true,
  links: [
    { name: 'Gmail', url: 'https://mail.google.com' },
    { name: 'YouTube', url: 'https://youtube.com' },
    { name: 'GitHub', url: 'https://github.com' },
  ],
};

let settings = {};

const QUOTES = [
  "The only way to do great work is to love what you do. - Steve Jobs",
  "In the middle of difficulty lies opportunity. - Albert Einstein",
  "Believe you can and you're halfway there. - Theodore Roosevelt",
  "The future belongs to those who believe in the beauty of their dreams. - Eleanor Roosevelt",
  "Success is not final, failure is not fatal: it is the courage to continue that counts. - Winston Churchill",
  "The best time to plant a tree was 20 years ago. The second best time is now. - Chinese Proverb",
  "Everything you've ever wanted is on the other side of fear. - George Addair",
  "Happiness is not something ready made. It comes from your own actions. - Dalai Lama",
  "The only impossible journey is the one you never begin. - Tony Robbins",
  "What lies behind us and what lies before us are tiny matters compared to what lies within us. - Ralph Waldo Emerson",
];

function getDayPeriod() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

function updateTime() {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');
  document.getElementById('time').textContent = `${h}:${m}`;
}

function updateDate() {
  const now = new Date();
  const opts = { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' };
  document.getElementById('date').textContent = now.toLocaleDateString('en-US', opts);
}

function updateGreeting() {
  const el = document.getElementById('greeting');
  const period = getDayPeriod();
  const name = settings.userName ? `, ${settings.userName}` : '';
  el.textContent = `Good ${period}${name}`;
}

function updateQuote() {
  const idx = Math.floor(Math.random() * QUOTES.length);
  document.getElementById('quote').textContent = `"${QUOTES[idx]}"`;
}

function applyBackground() {
  const el = document.body;
  switch (settings.bgType) {
    case 'color':
      el.style.background = settings.bgColor;
      el.style.backgroundSize = '';
      break;
    case 'gradient':
      el.style.background = `linear-gradient(${settings.gradDirection}, ${settings.gradColor1}, ${settings.gradColor2})`;
      el.style.backgroundSize = '';
      break;
    case 'image':
      el.style.background = `url(${settings.bgImageUrl}) center/cover no-repeat`;
      break;
  }
}

function applyTextStyle() {
  document.body.style.color = settings.textColor;
  document.body.style.fontSize = `${settings.fontSize}px`;
}

function applyWidgetVisibility() {
  document.getElementById('time').style.display = settings.showTime ? 'block' : 'none';
  document.getElementById('date').style.display = settings.showDate ? 'block' : 'none';
  document.getElementById('greeting').style.display = settings.showGreeting ? 'block' : 'none';
  document.getElementById('quote').style.display = settings.showQuote ? 'block' : 'none';
  document.getElementById('searchContainer').style.display = settings.showSearch ? 'block' : 'none';
  document.getElementById('weather').style.display = settings.showWeather ? 'block' : 'none';
  document.getElementById('quickLinks').style.display = settings.showLinks ? 'flex' : 'none';
}

function applyAll() {
  applyBackground();
  applyTextStyle();
  applyWidgetVisibility();
  updateTime();
  updateDate();
  updateGreeting();
  if (settings.showQuote) updateQuote();
  renderLinks();
}

function syncSettingsToUI() {
  document.getElementById('bgType').value = settings.bgType;
  document.getElementById('bgColor').value = settings.bgColor;
  document.getElementById('gradColor1').value = settings.gradColor1;
  document.getElementById('gradColor2').value = settings.gradColor2;
  document.getElementById('gradDirection').value = settings.gradDirection;
  document.getElementById('bgImageUrl').value = settings.bgImageUrl;
  document.getElementById('textColor').value = settings.textColor;
  document.getElementById('fontSize').value = settings.fontSize;
  document.getElementById('userName').value = settings.userName;
  document.getElementById('showTime').checked = settings.showTime;
  document.getElementById('showDate').checked = settings.showDate;
  document.getElementById('showGreeting').checked = settings.showGreeting;
  document.getElementById('showQuote').checked = settings.showQuote;
  document.getElementById('showSearch').checked = settings.showSearch;
  document.getElementById('showWeather').checked = settings.showWeather;
  document.getElementById('showLinks').checked = settings.showLinks;

  document.getElementById('colorPickGroup').style.display = settings.bgType === 'color' ? 'block' : 'none';
  document.getElementById('gradientGroup').style.display = settings.bgType === 'gradient' ? 'block' : 'none';
  document.getElementById('imageGroup').style.display = settings.bgType === 'image' ? 'block' : 'none';
}

function renderLinks() {
  const container = document.getElementById('quickLinks');
  container.innerHTML = '';

  if (!settings.showLinks) return;

  settings.links.forEach((link, i) => {
    const letter = link.name.charAt(0).toUpperCase();
    const item = document.createElement('a');
    item.href = link.url;
    item.className = 'link-item';
    item.target = '_blank';
    item.rel = 'noopener';
    item.innerHTML = `
      <div class="link-icon">${letter}</div>
      <span class="link-name">${link.name}</span>
      <button class="link-remove" data-index="${i}">&times;</button>
    `;
    item.querySelector('.link-remove').addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      settings.links.splice(i, 1);
      saveSettings();
      renderLinks();
    });
    container.appendChild(item);
  });

  const addBtn = document.createElement('button');
  addBtn.className = 'add-link-btn';
  addBtn.textContent = '+';
  addBtn.addEventListener('click', () => {
    document.getElementById('linkModal').classList.add('show');
  });
  container.appendChild(addBtn);
}

// Search form handler
document.getElementById('searchForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const query = document.getElementById('searchInput').value.trim();
  if (!query) return;
  if (query.includes('.') && !query.includes(' ')) {
    window.location.href = query.startsWith('http') ? query : `https://${query}`;
  } else {
    window.location.href = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
  }
});

// Sidebar
document.getElementById('openSidebar').addEventListener('click', () => {
  document.getElementById('sidebar').classList.add('open');
});
document.getElementById('closeSidebar').addEventListener('click', () => {
  document.getElementById('sidebar').classList.remove('open');
});

// Background type switch
document.getElementById('bgType').addEventListener('change', (e) => {
  settings.bgType = e.target.value;
  document.getElementById('colorPickGroup').style.display = e.target.value === 'color' ? 'block' : 'none';
  document.getElementById('gradientGroup').style.display = e.target.value === 'gradient' ? 'block' : 'none';
  document.getElementById('imageGroup').style.display = e.target.value === 'image' ? 'block' : 'none';
  applyBackground();
  saveSettings();
});

document.getElementById('bgColor').addEventListener('input', (e) => {
  settings.bgColor = e.target.value;
  applyBackground();
  saveSettings();
});

document.getElementById('gradColor1').addEventListener('input', (e) => {
  settings.gradColor1 = e.target.value;
  applyBackground();
  saveSettings();
});

document.getElementById('gradColor2').addEventListener('input', (e) => {
  settings.gradColor2 = e.target.value;
  applyBackground();
  saveSettings();
});

document.getElementById('gradDirection').addEventListener('change', (e) => {
  settings.gradDirection = e.target.value;
  applyBackground();
  saveSettings();
});

document.getElementById('applyBgImage').addEventListener('click', () => {
  const url = document.getElementById('bgImageUrl').value.trim();
  if (url) {
    settings.bgImageUrl = url;
    applyBackground();
    saveSettings();
  }
});

document.getElementById('textColor').addEventListener('input', (e) => {
  settings.textColor = e.target.value;
  applyTextStyle();
  saveSettings();
});

document.getElementById('fontSize').addEventListener('input', (e) => {
  settings.fontSize = parseInt(e.target.value);
  applyTextStyle();
  saveSettings();
});

document.getElementById('userName').addEventListener('change', (e) => {
  settings.userName = e.target.value.trim();
  updateGreeting();
  saveSettings();
});

document.querySelectorAll('.widget-toggles input[type="checkbox"]').forEach((cb) => {
  cb.addEventListener('change', (e) => {
    settings[e.target.id] = e.target.checked;
    applyWidgetVisibility();
    saveSettings();
  });
});

document.getElementById('saveLink').addEventListener('click', () => {
  const name = document.getElementById('linkName').value.trim();
  const url = document.getElementById('linkUrl').value.trim();
  if (name && url) {
    const fullUrl = url.startsWith('http') ? url : `https://${url}`;
    settings.links.push({ name, url: fullUrl });
    document.getElementById('linkName').value = '';
    document.getElementById('linkUrl').value = '';
    document.getElementById('linkModal').classList.remove('show');
    saveSettings();
    renderLinks();
  }
});

document.querySelector('.modal-close').addEventListener('click', () => {
  document.getElementById('linkModal').classList.remove('show');
});

document.getElementById('linkModal').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) {
    document.getElementById('linkModal').classList.remove('show');
  }
});

document.getElementById('resetDefaults').addEventListener('click', () => {
  settings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
  syncSettingsToUI();
  applyAll();
  saveSettings();
});

// Clock update every second
setInterval(() => {
  updateTime();
  updateDate();
  updateGreeting();
}, 1000);

// Rotate quote every 30 seconds
setInterval(() => {
  if (settings.showQuote) updateQuote();
}, 30000);

// Storage helpers
function saveSettings() {
  const toStore = JSON.parse(JSON.stringify(settings));
  chrome.storage.sync.set({ newTabSettings: toStore });
}

function loadSettings(callback) {
  chrome.storage.sync.get('newTabSettings', (result) => {
    if (result.newTabSettings) {
      settings = { ...DEFAULT_SETTINGS, ...result.newTabSettings };
    } else {
      settings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
    }
    if (callback) callback();
  });
}

// Weather
function fetchWeather() {
  if (!navigator.geolocation) return;
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const { latitude, longitude } = pos.coords;
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true&timezone=auto`;
      fetch(url)
        .then((r) => r.json())
        .then((data) => {
          if (data.current_weather) {
            const temp = Math.round(data.current_weather.temperature);
            const code = data.current_weather.weathercode;
            const desc = weatherCodeToDesc(code);
            const icon = weatherCodeToIcon(code);
            document.getElementById('weather').innerHTML = `${icon} ${temp}°C ${desc}`;
          }
        })
        .catch(() => {});
    },
    () => {},
    { timeout: 5000 }
  );
}

function weatherCodeToDesc(code) {
  if (code === 0) return 'Clear';
  if (code <= 3) return 'Cloudy';
  if (code <= 48) return 'Foggy';
  if (code <= 57) return 'Drizzle';
  if (code <= 67) return 'Rain';
  if (code <= 77) return 'Snow';
  if (code <= 82) return 'Showers';
  return 'Storm';
}

function weatherCodeToIcon(code) {
  if (code === 0) return '☀️';
  if (code <= 3) return '☁️';
  if (code <= 48) return '🌫️';
  if (code <= 57) return '🌦️';
  if (code <= 67) return '🌧️';
  if (code <= 77) return '❄️';
  if (code <= 82) return '🌦️';
  return '⛈️';
}

// Init
loadSettings(() => {
  syncSettingsToUI();
  applyAll();
  fetchWeather();
});
