const MODE_KEY = "compass-mode";
const AUTO_LOGIN_KEY = "compass-auto-login-enabled";
const TIMETABLE_COLORS_KEY = "compass-timetable-colors-enabled";
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

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll("button[data-mode]").forEach(button => {
    button.addEventListener("click", () => {
      setTheme(button.dataset.mode);
      window.close();
    });
  });

  const autoLoginEl = document.getElementById('autoLogin');
  const timetableEl = document.getElementById('timetableColors');
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

  chrome.storage.local.get({
    [AUTO_LOGIN_KEY]: true,
    [TIMETABLE_COLORS_KEY]: true,
    ...Object.fromEntries(Object.values(THEME_PAGE_KEYS).map(k => [k, ''])),
  }, result => {
    autoLoginEl.checked = !!result[AUTO_LOGIN_KEY];
    timetableEl.checked = !!result[TIMETABLE_COLORS_KEY];
    Object.entries(THEME_PAGE_KEYS).forEach(([inputKey, storageKey]) => {
      if (colorInputs[inputKey]) {
        colorInputs[inputKey].value = result[storageKey] || '#000000';
      }
    });
  });

  autoLoginEl.addEventListener('change', () => {
    chrome.storage.local.set({ [AUTO_LOGIN_KEY]: !!autoLoginEl.checked });
  });

  timetableEl.addEventListener('change', () => {
    chrome.storage.local.set({ [TIMETABLE_COLORS_KEY]: !!timetableEl.checked });
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
});
