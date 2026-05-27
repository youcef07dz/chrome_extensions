

  // === App Data ===
  const apps = [
    { name: 'Gmail', url: 'https://mail.google.com', icon: 'fas fa-envelope', color: '#EA4335', badge: null },
    { name: 'Google Drive', url: 'https://drive.google.com', icon: 'fas fa-hard-drive', color: '#4285F4', badge: null },
    { name: 'Calendar', url: 'https://calendar.google.com', icon: 'fas fa-calendar-days', color: '#4285F4', badge: null },
    { name: 'YouTube', url: 'https://youtube.com', icon: 'fab fa-youtube', color: '#FF0000', badge: null },
    { name: 'ChatGPT', url: 'https://chat.openai.com', icon: 'fas fa-robot', color: '#10a37f', badge: null },
    { name: 'GitHub', url: 'https://github.com', icon: 'fab fa-github', color: '#6e5494', badge: null },
    { name: 'Maps', url: 'https://maps.google.com', icon: 'fas fa-map-location-dot', color: '#34A853', badge: null },
    { name: 'Translate', url: 'https://translate.google.com', icon: 'fas fa-language', color: '#4285F4', badge: null },
    { name: 'Spotify', url: 'https://open.spotify.com', icon: 'fab fa-spotify', color: '#1DB954', badge: null },
    { name: 'Twitter / X', url: 'https://x.com', icon: 'fab fa-x-twitter', color: '#1a1a1a', badge: null },
    { name: 'Reddit', url: 'https://reddit.com', icon: 'fab fa-reddit-alien', color: '#FF4500', badge: null },
    { name: 'Notion', url: 'https://notion.so', icon: 'fas fa-n', color: '#191919', badge: null },
    { name: 'Figma', url: 'https://figma.com', icon: 'fab fa-figma', color: '#F24E1E', badge: null },
    { name: 'WhatsApp', url: 'https://web.whatsapp.com', icon: 'fab fa-whatsapp', color: '#25D366', badge: null },
    { name: 'LinkedIn', url: 'https://linkedin.com', icon: 'fab fa-linkedin-in', color: '#0A66C2', badge: null },
    { name: 'Amazon', url: 'https://amazon.com', icon: 'fab fa-amazon', color: '#FF9900', badge: null },
  ];

  // Dock apps
  const dockApps = [
    { name: 'Gmail', url: 'https://mail.google.com', icon: 'fas fa-envelope', color: '#EA4335' },
    { name: 'ChatGPT', url: 'https://chat.openai.com', icon: 'fas fa-robot', color: '#10a37f' },
    { name: 'YouTube', url: 'https://youtube.com', icon: 'fab fa-youtube', color: '#FF0000' },
    { name: 'GitHub', url: 'https://github.com', icon: 'fab fa-github', color: '#6e5494' },
    { name: 'Spotify', url: 'https://open.spotify.com', icon: 'fab fa-spotify', color: '#1DB954' },
    { name: 'Twitter / X', url: 'https://x.com', icon: 'fab fa-x-twitter', color: '#333' },
    { name: 'Notion', url: 'https://notion.so', icon: 'fas fa-n', color: '#191919' },
    { name: 'Figma', url: 'https://figma.com', icon: 'fab fa-figma', color: '#F24E1E' },
    { name: 'Settings', url: '#settings', icon: 'fas fa-gear', color: '#555', isSettings: true },
  ];

  // Themes
  const themes = [
    { name: 'Sunset', bg: 'radial-gradient(ellipse 120% 80% at 20% 80%, #c2185b 0%, transparent 50%), radial-gradient(ellipse 100% 70% at 80% 20%, #ff6f00 0%, transparent 50%), radial-gradient(ellipse 80% 60% at 50% 50%, #ad1457 0%, transparent 60%), linear-gradient(160deg, #1a0a2e 0%, #2d1b4e 30%, #1a0a2e 100%)', orbs: ['#ff6f00','#c2185b','#ff8f00'] },
    { name: 'Ocean', bg: 'radial-gradient(ellipse 120% 80% at 30% 70%, #00695c 0%, transparent 50%), radial-gradient(ellipse 100% 70% at 70% 30%, #004d40 0%, transparent 50%), radial-gradient(ellipse 80% 60% at 50% 50%, #00897b 0%, transparent 60%), linear-gradient(160deg, #0a1a1e 0%, #0d2b2a 30%, #0a1a1e 100%)', orbs: ['#00897b','#004d40','#00bcd4'] },
    { name: 'Aurora', bg: 'radial-gradient(ellipse 120% 80% at 20% 80%, #1b5e20 0%, transparent 50%), radial-gradient(ellipse 100% 70% at 80% 20%, #006064 0%, transparent 50%), radial-gradient(ellipse 80% 60% at 50% 50%, #2e7d32 0%, transparent 60%), linear-gradient(160deg, #0a1a0e 0%, #1a2e1e 30%, #0a1a0e 100%)', orbs: ['#2e7d32','#006064','#4caf50'] },
    { name: 'Ember', bg: 'radial-gradient(ellipse 120% 80% at 20% 80%, #bf360c 0%, transparent 50%), radial-gradient(ellipse 100% 70% at 80% 20%, #e65100 0%, transparent 50%), radial-gradient(ellipse 80% 60% at 50% 50%, #d84315 0%, transparent 60%), linear-gradient(160deg, #1a0e0a 0%, #2e1a10 30%, #1a0e0a 100%)', orbs: ['#e65100','#bf360c','#ff6d00'] },
    { name: 'Midnight', bg: 'radial-gradient(ellipse 120% 80% at 20% 80%, #1a237e 0%, transparent 50%), radial-gradient(ellipse 100% 70% at 80% 20%, #283593 0%, transparent 50%), radial-gradient(ellipse 80% 60% at 50% 50%, #1a237e 0%, transparent 60%), linear-gradient(160deg, #0a0a1e 0%, #141432 30%, #0a0a1e 100%)', orbs: ['#283593','#1a237e','#3949ab'] },
    { name: 'Rose', bg: 'radial-gradient(ellipse 120% 80% at 20% 80%, #880e4f 0%, transparent 50%), radial-gradient(ellipse 100% 70% at 80% 20%, #ad1457 0%, transparent 50%), radial-gradient(ellipse 80% 60% at 50% 50%, #c2185b 0%, transparent 60%), linear-gradient(160deg, #1a0a14 0%, #2e1028 30%, #1a0a14 100%)', orbs: ['#ad1457','#880e4f','#e91e63'] },
  ];

  // === State ===
  let focusRunning = false;
  let focusSeconds = 25 * 60;
  let focusInterval = null;
  let currentTheme = 0;

  // === Load saved data ===
  function loadState() {
    const saved = localStorage.getItem('newtab_state');
    if (saved) {
      try {
        const state = JSON.parse(saved);
        if (state.theme !== undefined) currentTheme = state.theme;
        if (state.name) document.getElementById('nameInput').value = state.name;
        if (state.notes) document.getElementById('notesArea').value = state.notes;
      } catch(e) {}
    }
  }

  function saveState() {
    localStorage.setItem('newtab_state', JSON.stringify({
      theme: currentTheme,
      name: document.getElementById('nameInput').value,
      notes: document.getElementById('notesArea').value,
    }));
  }

  // === Render Apps Grid ===
  function renderApps() {
    const grid = document.getElementById('appsGrid');
    grid.innerHTML = apps.map(app => `
      <a class="app-item" href="${app.url}" target="_self" rel="noopener" aria-label="${app.name}">
        <div class="app-icon" style="background:${app.color}">
          <i class="${app.icon}"></i>
          ${app.badge ? '<span class="app-badge">${app.badge}</span>' : ''}
        </div>
        <span class="app-name">${app.name}</span>
      </a>
    `).join('');
  }

  // === Render Dock ===
  function renderDock() {
    const dock = document.getElementById('dock');
    let html = '';
    dockApps.forEach((app, i) => {
      if (i === dockApps.length - 2) html += '<div class="dock-divider"></div>';
      html += `
        <a class="dock-item" href="${app.isSettings ? '#' : app.url}" 
           ${app.isSettings ? 'id="dockSettingsBtn"' : 'target="_self"'} 
           rel="noopener" aria-label="${app.name}"
           style="background:${app.color}">
          <i class="${app.icon}"></i>
          <span class="dock-tooltip">${app.name}</span>
          <span class="dock-dot"></span>
        </a>
      `;
    });
    dock.innerHTML = html;

    // Wire settings button
    document.getElementById('dockSettingsBtn').addEventListener('click', (e) => {
      e.preventDefault();
      document.getElementById('settingsOverlay').classList.add('active');
    });
  }

  // === Render Theme Options ===
  function renderThemes() {
    const container = document.getElementById('themeOptions');
    container.innerHTML = themes.map((t, i) => `
      <button class="theme-btn ${i === currentTheme ? 'active' : ''}" 
              data-theme="${i}" 
              style="background:${t.bg}"
              aria-label="Theme: ${t.name}"
              title="${t.name}"></button>
    `).join('');

    container.querySelectorAll('.theme-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        currentTheme = parseInt(btn.dataset.theme);
        applyTheme();
        renderThemes();
        saveState();
        showToast(`Theme: ${themes[currentTheme].name}`);
      });
    });
  }

  function applyTheme() {
    const theme = themes[currentTheme];
    const wallpaper = document.getElementById('wallpaper');
    wallpaper.style.background = theme.bg;
    // Update orbs
    const orbs = document.querySelectorAll('.orb');
    theme.orbs.forEach((color, i) => {
      if (orbs[i]) orbs[i].style.background = color;
    });
  }

  // === Clock ===
  function updateClock() {
    const now = new Date();
    const hours = now.getHours();
    const mins = String(now.getMinutes()).padStart(2, '0');
    const h = String(hours).padStart(2, '0');
    document.getElementById('clockTime').textContent = `${h}:${mins}`;

    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('clockDate').textContent = now.toLocaleDateString('en-US', options);

    const name = document.getElementById('nameInput').value.trim();
    let greeting;
    if (hours < 6) greeting = 'Good night';
    else if (hours < 12) greeting = 'Good morning';
    else if (hours < 18) greeting = 'Good afternoon';
    else greeting = 'Good evening';
    document.getElementById('clockGreeting').textContent = name ? `${greeting}, ${name}` : greeting;

    // Top bar time
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    document.getElementById('topBarTime').textContent = timeStr;

    // Day progress
    const totalMinutes = hours * 60 + now.getMinutes();
    const pct = Math.round((totalMinutes / 1440) * 100);
    document.getElementById('dayProgress').textContent = `${pct}%`;
    const remaining = 1440 - totalMinutes;
    const remH = Math.floor(remaining / 60);
    const remM = remaining % 60;
    document.getElementById('dayRemaining').textContent = `${remH}h ${remM}m of day remaining`;
  }

  // === Focus Timer ===
  function updateFocusDisplay() {
    const m = Math.floor(focusSeconds / 60);
    const s = focusSeconds % 60;
    document.getElementById('focusTimer').textContent = `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  }

  function toggleFocus() {
    if (focusRunning) {
      clearInterval(focusInterval);
      focusRunning = false;
      document.getElementById('focusLabel').textContent = 'Paused · Click to resume';
    } else {
      focusRunning = true;
      document.getElementById('focusLabel').textContent = 'Running · Click to pause';
      focusInterval = setInterval(() => {
        focusSeconds--;
        if (focusSeconds <= 0) {
          clearInterval(focusInterval);
          focusRunning = false;
          focusSeconds = 25 * 60;
          document.getElementById('focusLabel').textContent = 'Done! Click to restart';
          showToast('Focus session complete!');
        }
        updateFocusDisplay();
      }, 1000);
    }
  }

  // === Toast ===
  function showToast(msg) {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2200);
  }

  // === Dock magnification on mousemove ===
  function setupDockMagnification() {
    const dock = document.getElementById('dock');
    const items = () => dock.querySelectorAll('.dock-item');
    const baseSize = 56;
    const maxSize = 76;

    dock.addEventListener('mousemove', (e) => {
      const dockItems = items();
      dockItems.forEach(item => {
        const rect = item.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const dist = Math.abs(e.clientX - cx);
        const maxDist = 100;
        const scale = dist < maxDist
          ? maxSize / baseSize + (1 - dist / maxDist) * 0.3
          : 1;
        item.style.transform = `translateY(${-12 * Math.max(0, 1 - dist / maxDist)}px) scale(${scale})`;
      });
    });

    dock.addEventListener('mouseleave', () => {
      items().forEach(item => {
        item.style.transform = '';
      });
    });
  }

  // === Solid animation engine (uses performance.now() — immune to tab throttling) ===
  function startAnimationEngine() {
    const wallpaper = document.getElementById('wallpaper');
    const orbs = document.querySelectorAll('.orb');
    const start = performance.now();

    const orbConfigs = [
      { dur: 18, delay: 0 },
      { dur: 22, delay: -5 },
      { dur: 16, delay: -8 },
    ];

    const easeInOut = (t) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    const lerp = (a, b, t) => a + (b - a) * t;

    function tick() {
      const elapsed = (performance.now() - start) / 1000;

      // Wallpaper shift: 20s forward + 20s reverse (40s full cycle)
      const wpCycle = 40;
      const wpRaw = ((elapsed % wpCycle) / wpCycle) * 2;
      const wpProg = wpRaw <= 1 ? wpRaw : 2 - wpRaw;
      const wpEased = easeInOut(wpProg);
      const hue = wpEased < 0.5
        ? (wpEased / 0.5) * 15
        : 15 + ((wpEased - 0.5) / 0.5) * -25;
      const bright = wpEased < 0.5
        ? 1 + (wpEased / 0.5) * 0.05
        : 1.05 + ((wpEased - 0.5) / 0.5) * -0.1;
      wallpaper.style.filter = `hue-rotate(${hue}deg) brightness(${bright})`;

      // Orb float
      orbs.forEach((orb, i) => {
        const { dur, delay } = orbConfigs[i];
        const period = dur * 2;
        let t = ((elapsed + delay) % period + period) % period / period;
        const prog = t * 2;
        const dirProg = prog <= 1 ? prog : 2 - prog;
        const eased = easeInOut(dirProg);

        let x, y, s;
        if (eased < 1/3) {
          const p = eased * 3;
          x = lerp(0, 30, p);
          y = lerp(0, -20, p);
          s = lerp(1, 1.1, p);
        } else if (eased < 2/3) {
          const p = (eased - 1/3) * 3;
          x = lerp(30, -20, p);
          y = lerp(-20, 30, p);
          s = lerp(1.1, 0.95, p);
        } else {
          const p = (eased - 2/3) * 3;
          x = lerp(-20, 15, p);
          y = lerp(30, 15, p);
          s = lerp(0.95, 1.05, p);
        }
        orb.style.transform = `translate(${x}px, ${y}px) scale(${s})`;
      });

      requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
  }

  // === Init ===
  function init() {
    loadState();
    applyTheme();
    renderApps();
    renderDock();
    renderThemes();
    updateClock();
    updateFocusDisplay();
    setupDockMagnification();
    startAnimationEngine();

    // Update clock every second
    setInterval(updateClock, 1000);

    // Focus timer click
    document.getElementById('focusLabel').addEventListener('click', toggleFocus);
    document.getElementById('focusLabel').addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleFocus(); }
    });

    // Auto-save notes
    document.getElementById('notesArea').addEventListener('input', saveState);
    document.getElementById('nameInput').addEventListener('input', () => {
      saveState();
      updateClock();
    });

    // Settings close
    document.getElementById('closeSettings').addEventListener('click', () => {
      document.getElementById('settingsOverlay').classList.remove('active');
    });
    document.getElementById('settingsOverlay').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) {
        e.currentTarget.classList.remove('active');
      }
    });

    // Keyboard: Escape closes settings
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        document.getElementById('settingsOverlay').classList.remove('active');
      }
    });

    // Search form - focus on /
    document.addEventListener('keydown', (e) => {
      if (e.key === '/' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
        e.preventDefault();
        document.querySelector('.search-bar').focus();
      }
    });
  }

  document.addEventListener('DOMContentLoaded', init);
