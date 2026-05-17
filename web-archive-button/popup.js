const saveBtn = document.getElementById('save-btn');
const checkBtn = document.getElementById('check-btn');
const statusEl = document.getElementById('status');
const resultEl = document.getElementById('result');
const archiveLink = document.getElementById('archive-link');
const urlDisplay = document.getElementById('url-display');
const checkStatusEl = document.getElementById('check-status');

let currentUrl = '';

chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  const tab = tabs[0];
  currentUrl = tab.url;
  urlDisplay.textContent = tab.title || currentUrl;
  urlDisplay.title = currentUrl;
});

function showStatus(message, type) {
  statusEl.style.display = 'flex';
  statusEl.className = `status ${type}`;
  if (type === 'saving') {
    statusEl.innerHTML = `<span class="spinner"></span> ${message}`;
  } else {
    statusEl.textContent = message;
  }
}

function hideStatus() {
  statusEl.style.display = 'none';
}

function showCheckStatus(message, type) {
  checkStatusEl.style.display = 'block';
  checkStatusEl.className = `check-status ${type}`;
  checkStatusEl.textContent = message;
}

function hideCheckStatus() {
  checkStatusEl.style.display = 'none';
}

saveBtn.addEventListener('click', async () => {
  if (!currentUrl) return;

  saveBtn.disabled = true;
  hideStatus();
  resultEl.style.display = 'none';
  showStatus('Saving page to Wayback Machine...', 'saving');

  try {
    const response = await fetch(`https://web.archive.org/save/${currentUrl}`, {
      method: 'POST',
    });

    if (!response.ok) {
      throw new Error(`Failed to save (HTTP ${response.status})`);
    }

    const data = await response.json();
    const archiveUrl = `https://web.archive.org/web/${data.capture_timestamp}/${currentUrl}`;

    showStatus('Page saved successfully!', 'success');
    archiveLink.href = archiveUrl;
    resultEl.style.display = 'block';

    setTimeout(() => {
      hideStatus();
    }, 4000);
  } catch (error) {
    showStatus(`Error: ${error.message}`, 'error');
    setTimeout(() => {
      hideStatus();
    }, 6000);
  } finally {
    saveBtn.disabled = false;
  }
});

checkBtn.addEventListener('click', async () => {
  if (!currentUrl) return;

  hideCheckStatus();
  checkBtn.disabled = true;

  try {
    const response = await fetch(
      `https://archive.org/wayback/available?url=${encodeURIComponent(currentUrl)}`
    );

    if (!response.ok) {
      throw new Error(`Failed to check (HTTP ${response.status})`);
    }

    const data = await response.json();

    if (data.archived_snapshots?.closest) {
      const snapshot = data.archived_snapshots.closest;
      const date = new Date(snapshot.timestamp).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });

      showCheckStatus(
        `Last archived: ${date} (${snapshot.available ? 'available' : 'not available'})`,
        snapshot.available ? 'found' : 'not-found'
      );
    } else {
      showCheckStatus('No archived version found for this URL.', 'not-found');
    }
  } catch (error) {
    showCheckStatus(`Error: ${error.message}`, 'error');
  } finally {
    checkBtn.disabled = false;
  }
});
