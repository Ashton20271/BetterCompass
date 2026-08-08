const MODE_KEY = "compass-mode";
const AUTO_LOGIN_KEY = "compass-auto-login-enabled";
const TIMETABLE_COLORS_KEY = "compass-timetable-colors-enabled";
const BLOCK_TRACKERS_KEY = "compass-block-trackers-enabled";
const BACKGROUND_IMAGE_KEY = "backgroundImage";
const BACKGROUND_OPACITY_KEY = "backgroundOpacity";
const BACKGROUND_BLUR_KEY = "backgroundBlur";
const extensionStorageAvailable = typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local;
const extensionTabsAvailable = typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.query && chrome.tabs.sendMessage;
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
  if (!extensionTabsAvailable) return;
  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    if (!tabs || !tabs.length) return;
    const tab = tabs[0];
    if (!tab.url || !/^https?:\/\/([^\/]+\.)?compass\.education\//.test(tab.url)) return;
    chrome.tabs.sendMessage(tab.id, message, () => {
      if (chrome.runtime.lastError) {
      }
    });
  });
}

function getAllSettings(callback) {
  chrome.storage.local.get(null, callback);
}

function downloadSettings(settings) {
  const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'better-compass-settings.json';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

function exportSettings() {
  getAllSettings(settings => {
    const imageValue = settings[BACKGROUND_IMAGE_KEY];
    if (imageValue instanceof Blob) {
      const reader = new FileReader();
      reader.onload = () => {
        settings[BACKGROUND_IMAGE_KEY] = reader.result;
        downloadSettings(settings);
      };
      reader.onerror = () => {
        alert('Unable to export settings because the background image could not be serialized.');
      };
      reader.readAsDataURL(imageValue);
      return;
    }

    downloadSettings(settings);
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
        notifyPage({ action: 'applyBackgroundImage' });
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
  const extensionStorageAvailable = typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local;

  const themeSelect = document.getElementById('themeSelect');
  if (themeSelect) {
    themeSelect.addEventListener('change', () => {
      if (extensionStorageAvailable) {
        setTheme(themeSelect.value);
      }
      window.close();
    });
  }

  const autoLoginEl = document.getElementById('autoLogin');
  const timetableEl = document.getElementById('timetableColors');
  const blockTrackersEl = document.getElementById('blockTrackers');
  const backgroundImageInput = document.getElementById('backgroundImage');
  const backgroundFileInput = document.getElementById('backgroundFile');
  const backgroundRow = document.querySelector('.background-row');
  const backgroundOpacitySlider = document.getElementById('backgroundOpacity');
  const backgroundOpacityValue = document.getElementById('backgroundOpacityValue');
  const backgroundBlurSlider = document.getElementById('backgroundBlur');
  const backgroundBlurValue = document.getElementById('backgroundBlurValue');
  const clearBackgroundButton = document.getElementById('clearBackground');
  const backgroundPreview = document.getElementById('backgroundPreview');
  const backgroundImageError = document.getElementById('backgroundImageError');
  let currentBackgroundPreviewUrl = null;
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
    if (!extensionStorageAvailable) {
      return;
    }

    chrome.storage.local.get({
      [AUTO_LOGIN_KEY]: true,
      [TIMETABLE_COLORS_KEY]: true,
      [BLOCK_TRACKERS_KEY]: false,
      [MODE_KEY]: 'off',
      [BACKGROUND_IMAGE_KEY]: '',
      [BACKGROUND_OPACITY_KEY]: 75,
      [BACKGROUND_BLUR_KEY]: 8,
      ...Object.fromEntries(Object.values(THEME_PAGE_KEYS).map(k => [k, ''])),
    }, result => {
      if (autoLoginEl) autoLoginEl.checked = !!result[AUTO_LOGIN_KEY];
      if (timetableEl) timetableEl.checked = !!result[TIMETABLE_COLORS_KEY];
      if (blockTrackersEl) blockTrackersEl.checked = !!result[BLOCK_TRACKERS_KEY];
      if (themeSelect) {
        themeSelect.value = result[MODE_KEY] || 'off';
      }
      if (backgroundImageInput) {
        backgroundImageInput.value = typeof result[BACKGROUND_IMAGE_KEY] === 'string'
          ? result[BACKGROUND_IMAGE_KEY] || ''
          : '';
      }
      if (backgroundOpacitySlider) {
        const opacityValue = result[BACKGROUND_OPACITY_KEY] ?? 75;
        backgroundOpacitySlider.value = opacityValue;
        updateBackgroundOpacityLabel(opacityValue);
      }
      if (backgroundBlurSlider) {
        const blurValue = result[BACKGROUND_BLUR_KEY] ?? 8;
        backgroundBlurSlider.value = blurValue;
        updateBackgroundBlurLabel(blurValue);
      }
      if (backgroundPreview) {
        updateBackgroundPreview(result[BACKGROUND_IMAGE_KEY]);
      }
      Object.entries(THEME_PAGE_KEYS).forEach(([inputKey, storageKey]) => {
        if (colorInputs[inputKey]) {
          colorInputs[inputKey].value = result[storageKey] || '#000000';
        }
      });
    });
  }

  refreshUiFromStorage();

  if (extensionStorageAvailable && autoLoginEl) {
    autoLoginEl.addEventListener('change', () => {
      chrome.storage.local.set({ [AUTO_LOGIN_KEY]: !!autoLoginEl.checked });
    });
  }

  if (extensionStorageAvailable && timetableEl) {
    timetableEl.addEventListener('change', () => {
      chrome.storage.local.set({ [TIMETABLE_COLORS_KEY]: !!timetableEl.checked }, () => {
        notifyPage({ action: 'refreshTimetableColors' });
      });
    });
  }

  if (extensionStorageAvailable && blockTrackersEl) {
    blockTrackersEl.addEventListener('change', () => {
      chrome.storage.local.set({ [BLOCK_TRACKERS_KEY]: !!blockTrackersEl.checked });
    });
  }

  Object.entries(colorInputs).forEach(([inputKey, input]) => {
    input.addEventListener('input', () => {
      setThemeColor(inputKey, input.value);
    });
  });

  if (resetButton) {
    resetButton.addEventListener('click', () => {
      resetThemeColors();
      Object.values(colorInputs).forEach(input => {
        if (input) input.value = '#000000';
      });
    });
  }

  function setBackgroundImageError(message) {
    if (!backgroundImageError) return;
    backgroundImageError.textContent = message || '';
  }

  function getBackgroundStorageValue(file, callback) {
    const reader = new FileReader();
    reader.onload = () => {
      const arrayBuffer = reader.result;
      if (!(arrayBuffer instanceof ArrayBuffer)) {
        callback(null);
        return;
      }
      const bytes = Array.from(new Uint8Array(arrayBuffer));
      callback({ type: file.type || 'image/png', data: bytes });
    };
    reader.onerror = () => callback(null);
    reader.readAsArrayBuffer(file);
  }

  function handleBackgroundFile(file) {
    if (!file) return;
    if (!file.type || !file.type.startsWith('image/')) {
      setBackgroundImageError('Please drop or select a valid image file.');
      return;
    }

    if (backgroundImageInput) {
      backgroundImageInput.value = '';
    }
    if (backgroundFileInput) {
      backgroundFileInput.value = '';
    }

    setBackgroundImageError('');
    getBackgroundStorageValue(file, storageValue => {
      if (!storageValue) {
        setBackgroundImageError('Failed to store the selected image.');
        return;
      }

      if (extensionStorageAvailable) {
        chrome.storage.local.set({ [BACKGROUND_IMAGE_KEY]: storageValue }, () => {
          notifyPage({ action: 'applyBackgroundImage', image: storageValue });
        });
      } else {
        notifyPage({ action: 'applyBackgroundImage', image: storageValue });
      }
    });

    updateBackgroundPreview(file);
  }

  function revokeBackgroundPreviewUrl() {
    if (currentBackgroundPreviewUrl) {
      URL.revokeObjectURL(currentBackgroundPreviewUrl);
      currentBackgroundPreviewUrl = null;
    }
  }

  function isBackgroundStorageValue(value) {
    return value && typeof value === 'object' && typeof value.type === 'string' && Array.isArray(value.data);
  }

  function updateBackgroundPreview(value) {
    if (!backgroundPreview) return;
    revokeBackgroundPreviewUrl();

    if (!value) {
      backgroundPreview.removeAttribute('src');
      backgroundPreview.style.display = 'none';
      setBackgroundImageError('');
      return;
    }

    if (typeof value === 'string') {
      backgroundPreview.src = value.trim();
    } else if (value instanceof Blob) {
      currentBackgroundPreviewUrl = URL.createObjectURL(value);
      backgroundPreview.src = currentBackgroundPreviewUrl;
    } else if (isBackgroundStorageValue(value)) {
      const blob = new Blob([new Uint8Array(value.data)], { type: value.type });
      currentBackgroundPreviewUrl = URL.createObjectURL(blob);
      backgroundPreview.src = currentBackgroundPreviewUrl;
    } else {
      backgroundPreview.removeAttribute('src');
      backgroundPreview.style.display = 'none';
      setBackgroundImageError('');
      return;
    }

    backgroundPreview.style.display = 'block';
    setBackgroundImageError('');
  }

  if (backgroundPreview) {
    backgroundPreview.addEventListener('error', () => {
      setBackgroundImageError('Unable to load preview image. Please try a different file or URL.');
      backgroundPreview.style.display = 'none';
    });
  }

  function onBackgroundDragOver(event) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    if (backgroundRow) {
      backgroundRow.classList.add('drag-over');
    }
  }

  function onBackgroundDragLeave() {
    if (backgroundRow) {
      backgroundRow.classList.remove('drag-over');
    }
  }

  function onBackgroundDrop(event) {
    event.preventDefault();
    event.stopPropagation();
    if (backgroundRow) {
      backgroundRow.classList.remove('drag-over');
    }

    const files = event.dataTransfer.files;
    if (!files || !files.length) return;
    handleBackgroundFile(files[0]);
  }

  if (backgroundRow) {
    backgroundRow.addEventListener('dragenter', onBackgroundDragOver);
    backgroundRow.addEventListener('dragover', onBackgroundDragOver);
    backgroundRow.addEventListener('dragleave', onBackgroundDragLeave);
    backgroundRow.addEventListener('drop', onBackgroundDrop);
  }

  function isSupportedBackgroundUrl(value) {
    if (!value) return false;
    if (/^data:image\//i.test(value)) return true;
    if (/^blob:/i.test(value)) return true;
    if (/^chrome-extension:/i.test(value)) return true;

    try {
      const parsed = new URL(value);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  }

  function updateBackgroundOpacityLabel(value) {
    if (!backgroundOpacityValue) return;
    backgroundOpacityValue.textContent = `${value}%`;
  }

  function updateBackgroundBlurLabel(value) {
    if (!backgroundBlurValue) return;
    backgroundBlurValue.textContent = `${value}px`;
  }

  if (backgroundOpacitySlider) {
    backgroundOpacitySlider.addEventListener('input', event => {
      const value = parseInt(event.target.value, 10);
      const opacity = Number.isNaN(value) ? 75 : value;
      updateBackgroundOpacityLabel(opacity);
      if (extensionStorageAvailable) {
        chrome.storage.local.set({ [BACKGROUND_OPACITY_KEY]: opacity }, () => {
          notifyPage({ action: 'applyBackgroundImage' });
        });
      }
    });
  }

  if (backgroundBlurSlider) {
    backgroundBlurSlider.addEventListener('input', event => {
      const value = parseInt(event.target.value, 10);
      const blur = Number.isNaN(value) ? 8 : value;
      updateBackgroundBlurLabel(blur);
      if (extensionStorageAvailable) {
        chrome.storage.local.set({ [BACKGROUND_BLUR_KEY]: blur }, () => {
          notifyPage({ action: 'applyBackgroundBlur' });
        });
      }
    });
  }

  if (backgroundImageInput) {
    backgroundImageInput.addEventListener('input', event => {
      const url = event.target.value.trim();

      if (url && !isSupportedBackgroundUrl(url)) {
        updateBackgroundPreview('');
        setBackgroundImageError('Enter a valid image URL or upload a local image.');
        return;
      }

      setBackgroundImageError('');
      if (extensionStorageAvailable) {
        if (url) {
          chrome.storage.local.set({ [BACKGROUND_IMAGE_KEY]: url }, () => {
            notifyPage({ action: 'applyBackgroundImage' });
          });
        } else {
          chrome.storage.local.remove(BACKGROUND_IMAGE_KEY, () => {
            notifyPage({ action: 'applyBackgroundImage' });
          });
        }
      }

      updateBackgroundPreview(url);
    });
  }

  if (backgroundFileInput) {
    backgroundFileInput.addEventListener('change', event => {
      const file = event.target.files && event.target.files[0];
      if (!file) return;

      if (backgroundImageInput) {
        backgroundImageInput.value = '';
      }

      handleBackgroundFile(file);
    });
  }

  if (clearBackgroundButton) {
    clearBackgroundButton.addEventListener('click', () => {
      if (backgroundImageInput) {
        backgroundImageInput.value = '';
      }
      if (backgroundFileInput) {
        backgroundFileInput.value = '';
      }
      if (extensionStorageAvailable) {
        chrome.storage.local.remove(BACKGROUND_IMAGE_KEY, () => {
          notifyPage({ action: 'applyBackgroundImage' });
        });
      }
      updateBackgroundPreview('');
    });
  }

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
        notifyPage({ action: 'applyBackgroundBlur' });
      });
    }
  });
});
