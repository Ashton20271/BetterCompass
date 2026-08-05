const MODE_KEY = "compass-mode";
const AUTO_LOGIN_KEY = "compass-auto-login-enabled";
const TIMETABLE_COLORS_KEY = "compass-timetable-colors-enabled";
const BLOCK_TRACKERS_KEY = "compass-block-trackers-enabled";
const THEME_PAGE_KEYS = {
  bgColor: "compass-theme-bg",
  textColor: "compass-theme-text",
  headerColor: "compass-theme-header",
  headerTextColor: "compass-theme-header-text",
  cardColor: "compass-theme-card",
  cardTextColor: "compass-theme-card-text",
  buttonColor: "compass-theme-button",
  buttonTextColor: "compass-theme-button-text",
  linkColor: "compass-theme-link",
  borderColor: "compass-theme-border",
  accentColor: "compass-theme-accent",
};

function setTheme(mode) {
  chrome.storage.local.set({ [MODE_KEY]: mode });
  notifyPage({ action: 'applyCustomTheme' });
}

function setThemeColor(key, value) {
  chrome.storage.local.set({ [THEME_PAGE_KEYS[key]]: value });
  notifyPage({ action: 'applyCustomTheme' });
}

function resetThemeColors() {
  const resetData = {};
  Object.values(THEME_PAGE_KEYS).forEach(k => {
    resetData[k] = "";
  });
  chrome.storage.local.set(resetData, () => {
    notifyPage({ action: 'applyCustomTheme' });
  });
}

function notifyPage(message) {
  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    if (!tabs || !tabs.length) return;
    chrome.tabs.sendMessage(tabs[0].id, message, () => {});
  });
}

function getAllSettings(callback) {
  chrome.storage.local.get(null, callback);
}

function exportSettings() {
  getAllSettings(settings => {
    const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'better-compass-settings.json';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  });
}

function importSettingsFile(file, refreshCallback) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        throw new Error('Settings file must contain an object.');
      }
      chrome.storage.local.set(parsed, () => {
        refreshCallback();
        notifyPage({ action: 'applyCustomTheme' });
        alert('Settings imported successfully.');
      });
    } catch (error) {
      alert('Unable to import settings. Please select a valid Better Compass settings JSON file.');
    }
  };
  reader.onerror = () => {
    alert('Failed to read the selected file.');
  };
  reader.readAsText(file);
}

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll("button[data-mode]").forEach(button => {
    button.addEventListener("click", () => {
      setTheme(button.dataset.mode);
      window.close();
    });
  });

  const autoLoginEl = document.getElementById('autoLogin');
  const timetableEl = document.getElementById('timetableColors');
  const blockTrackersEl = document.getElementById('blockTrackers');
  const importButton = document.getElementById('importSettings');
  const exportButton = document.getElementById('exportSettings');
  const importFileInput = document.getElementById('importFile');
  const colorInputs = {
    bgColor: document.getElementById('bgColor'),
    textColor: document.getElementById('textColor'),
    headerColor: document.getElementById('headerColor'),
    headerTextColor: document.getElementById('headerTextColor'),
    cardColor: document.getElementById('cardColor'),
    cardTextColor: document.getElementById('cardTextColor'),
    buttonColor: document.getElementById('buttonColor'),
    buttonTextColor: document.getElementById('buttonTextColor'),
    linkColor: document.getElementById('linkColor'),
    borderColor: document.getElementById('borderColor'),
    accentColor: document.getElementById('accentColor'),
  };
  const resetButton = document.getElementById('resetTheme');

  function refreshUiFromStorage() {
    chrome.storage.local.get({
      [AUTO_LOGIN_KEY]: true,
      [TIMETABLE_COLORS_KEY]: true,
      [BLOCK_TRACKERS_KEY]: false,
      ...Object.fromEntries(Object.values(THEME_PAGE_KEYS).map(k => [k, ''])),
    }, result => {
      autoLoginEl.checked = !!result[AUTO_LOGIN_KEY];
      timetableEl.checked = !!result[TIMETABLE_COLORS_KEY];
      blockTrackersEl.checked = !!result[BLOCK_TRACKERS_KEY];
      Object.entries(THEME_PAGE_KEYS).forEach(([inputKey, storageKey]) => {
        if (colorInputs[inputKey]) {
          colorInputs[inputKey].value = result[storageKey] || '#000000';
        }
      });
    });
  }

  refreshUiFromStorage();

  autoLoginEl.addEventListener('change', () => {
    chrome.storage.local.set({ [AUTO_LOGIN_KEY]: !!autoLoginEl.checked });
  });

  timetableEl.addEventListener('change', () => {
    chrome.storage.local.set({ [TIMETABLE_COLORS_KEY]: !!timetableEl.checked }, () => {
      notifyPage({ action: 'refreshTimetableColors' });
    });
  });

  blockTrackersEl.addEventListener('change', () => {
    chrome.storage.local.set({ [BLOCK_TRACKERS_KEY]: !!blockTrackersEl.checked });
  });

  Object.entries(colorInputs).forEach(([inputKey, input]) => {
    input.addEventListener('input', () => {
      setThemeColor(inputKey, input.value);
    });
  });

  resetButton.addEventListener('click', () => {
    resetThemeColors();
    Object.values(colorInputs).forEach(input => {
      input.value = '#000000';
    });
  });

  exportButton.addEventListener('click', exportSettings);

  importButton.addEventListener('click', () => {
    importFileInput.value = '';
    importFileInput.click();
  });

  importFileInput.addEventListener('change', event => {
    const file = event.target.files && event.target.files[0];
    if (file) {
      importSettingsFile(file, () => {
        refreshUiFromStorage();
        notifyPage({ action: 'applyCustomTheme' });
        notifyPage({ action: 'refreshTimetableColors' });
      });
    }
  });
});
