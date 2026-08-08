(function () {
  const INVERT_KEY = "compass-invert-enabled";
  const MODE_KEY = "compass-mode";
  const DEFAULT_MODE = "black";

  let mode = localStorage.getItem(MODE_KEY);
  if (!mode) {
    const inverted = localStorage.getItem(INVERT_KEY);
    mode = inverted === "false" ? "off" : DEFAULT_MODE;
  }

  function removeAllThemeClasses() {
    document.documentElement.classList.remove("compass-mode-black");
    if (document.body) {
      Array.from(document.body.classList)
        .filter(cls => cls.startsWith('theme-'))
        .forEach(cls => document.body.classList.remove(cls));
    }
  }

  function applyMode(value) {
    removeAllThemeClasses();

    if (value === "black") {
      document.documentElement.classList.add("compass-mode-black");
    } else if (value === "default") {
      document.body.classList.add("theme-default");
    } else if (value !== "off") {
      document.body.classList.add("theme-" + value);
    }
  }

  function isActive() {
    return mode !== "off";
  }

  const TIMETABLE_COLORS_KEY = "compass-timetable-colors-enabled";
  const BACKGROUND_IMAGE_KEY = "backgroundImage";
  const BACKGROUND_OPACITY_KEY = "backgroundOpacity";
  const BACKGROUND_BLUR_KEY = "backgroundBlur";
  let timetableColorsEnabled = true;
  let customBackgroundLayer = null;
  const THEME_COLOR_KEYS = {
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
  const themeStyle = document.createElement("style");
  themeStyle.id = "compass-theme-overrides";
  document.head ? document.head.appendChild(themeStyle) : document.documentElement.appendChild(themeStyle);

  function ensureBackgroundLayer() {
    if (customBackgroundLayer && document.body.contains(customBackgroundLayer)) {
      return customBackgroundLayer;
    }

    if (!document.body) {
      return null;
    }

    customBackgroundLayer = document.createElement("div");
    customBackgroundLayer.id = "betterCompassBackgroundLayer";
    customBackgroundLayer.setAttribute("aria-hidden", "true");
    customBackgroundLayer.style.cssText = `
      position: fixed;
      inset: 0;
      z-index: -1;
      pointer-events: none;
      overflow: hidden;
      background: transparent;
    `;

    const image = document.createElement("img");
    image.id = "betterCompassBackgroundImage";
    image.alt = "";
    image.draggable = false;
    image.decoding = "async";
    image.style.cssText = `
      position: absolute;
      inset: -2%;
      width: 104%;
      height: 104%;
      object-fit: cover;
      object-position: center center;
      opacity: 1;
      filter: brightness(0.75) contrast(1.05);
      user-select: none;
      pointer-events: none;
    `;

    const overlay = document.createElement("div");
    overlay.id = "betterCompassBackgroundOverlay";
    overlay.style.cssText = `
      position: absolute;
      inset: 0;
      background: linear-gradient(rgba(0,0,0,0.35), rgba(0,0,0,0.35));
      pointer-events: none;
    `;

    customBackgroundLayer.appendChild(image);
    customBackgroundLayer.appendChild(overlay);
    document.body.insertBefore(customBackgroundLayer, document.body.firstChild);

    if (!document.body.style.position) {
      document.body.style.position = "relative";
    }

    return customBackgroundLayer;
  }

  function applyBackgroundImage(url) {
    const imageUrl = typeof url === "string" ? url.trim() : "";
    const layer = ensureBackgroundLayer();
    if (!layer) return;

    const image = layer.querySelector("#betterCompassBackgroundImage");
    if (!image) return;

    if (imageUrl) {
      if (image.src !== imageUrl) {
        image.src = imageUrl;
      }
      document.body.classList.add("has-custom-background");
    } else {
      image.removeAttribute("src");
      document.body.classList.remove("has-custom-background");
    }
  }

  function applyBackgroundOpacity(value) {
    const layer = ensureBackgroundLayer();
    if (!layer) return;

    const opacity = Number(value);
    const normalizedOpacity = Number.isFinite(opacity)
      ? Math.max(0, Math.min(100, opacity))
      : 75;

    const image = layer.querySelector("#betterCompassBackgroundImage");
    if (image) {
      image.style.opacity = String(normalizedOpacity / 100);
    }
  }

  function applyBackgroundBlur(value) {
    const blur = Number(value);
    const blurValue = Number.isFinite(blur)
      ? Math.max(0, Math.min(32, blur))
      : 8;

    document.body.style.setProperty(
      "--better-compass-background-blur",
      `${blurValue}px`
    );
  }

  function resetNewsStyles() {
    document.querySelectorAll(".MuiStack-root").forEach(stack => {
      stack.style.filter = "";
      stack.style.backgroundColor = "";
      stack.style.color = "";

      stack.querySelectorAll(".MuiPaper-root").forEach(card => {
        card.style.filter = "";
        card.style.backgroundColor = "";
        card.style.color = "";
        card.style.border = "";
      });

      stack.querySelectorAll(".MuiDivider-root").forEach(div => {
        div.style.backgroundColor = "";
      });

      stack.querySelectorAll("*").forEach(el => {
        el.style.filter = "";
      });
    });
  }

  function restore(root = document) {
    if (!root || typeof root.querySelectorAll !== 'function') return;

    root
      .querySelectorAll('[class*="timetable"],[class*="calendar"],.event')
      .forEach(el => {
        const key = getKey(el);
        const color = key && localStorage.getItem(key);
        if (isActive() && color && timetableColorsEnabled) {
          el.style.backgroundColor = color;
        } else {
          el.style.backgroundColor = "";
        }
      });
  }

  function setMode(value) {
    mode = value;
    localStorage.setItem(MODE_KEY, value);

    if (value === "off") {
      document.documentElement.classList.remove("compass-mode-black");
      resetNewsStyles();
    } else {
      applyMode(value);
      if (value === "black") {
        fixNews();
      }
    }

    restore();
    applyCustomTheme();
  }

  applyMode(mode);

  chrome.storage.local.get([MODE_KEY, BACKGROUND_IMAGE_KEY, BACKGROUND_OPACITY_KEY, BACKGROUND_BLUR_KEY], result => {
    const stored = result[MODE_KEY] || mode;
    setMode(stored);
    applyBackgroundOpacity(result[BACKGROUND_OPACITY_KEY]);
    applyBackgroundBlur(result[BACKGROUND_BLUR_KEY]);
    applyBackgroundImage(result[BACKGROUND_IMAGE_KEY]);
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    if (changes[MODE_KEY]) {
      setMode(changes[MODE_KEY].newValue);
    }
    if (changes["compass-auto-login-enabled"]) {
      updateAutoLoginEnabled(!!changes["compass-auto-login-enabled"].newValue);
    }
    if (changes["compass-timetable-colors-enabled"]) {
      updateTimetableColorsEnabled(!!changes["compass-timetable-colors-enabled"].newValue);
    }
    if (changes[BACKGROUND_IMAGE_KEY]) {
      applyBackgroundImage(changes[BACKGROUND_IMAGE_KEY].newValue);
    }
    if (changes[BACKGROUND_OPACITY_KEY]) {
      applyBackgroundOpacity(changes[BACKGROUND_OPACITY_KEY].newValue);
    }
    if (changes[BACKGROUND_BLUR_KEY]) {
      applyBackgroundBlur(changes[BACKGROUND_BLUR_KEY].newValue);
    }
    if (Object.values(THEME_COLOR_KEYS).some(key => key in changes)) {
      applyCustomTheme();
    }
  });

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!message || !message.action) return;
    if (message.action === 'applyCustomTheme') {
      applyCustomTheme();
    }
    if (message.action === 'refreshTimetableColors') {
      refreshTimetableColors();
    }
    if (message.action === 'applyBackgroundImage') {
      chrome.storage.local.get([BACKGROUND_IMAGE_KEY, BACKGROUND_OPACITY_KEY], result => {
        applyBackgroundOpacity(result[BACKGROUND_OPACITY_KEY]);
        applyBackgroundImage(result[BACKGROUND_IMAGE_KEY]);
      });
    }
    if (message.action === 'applyBackgroundBlur') {
      chrome.storage.local.get([BACKGROUND_BLUR_KEY], result => {
        applyBackgroundBlur(result[BACKGROUND_BLUR_KEY]);
      });
    }
  });

  function fixNews() {
    if (mode !== "black") return;

    document.querySelectorAll(".MuiStack-root").forEach(stack => {
      if (!stack.innerText.includes("News")) return;

      stack.style.filter = "none";
      stack.style.backgroundColor = "#0e1621";
      stack.style.color = "#e6edf3";

      stack.querySelectorAll(".MuiPaper-root").forEach(card => {
        card.style.filter = "none";
        card.style.backgroundColor = "#0e1621";
        card.style.color = "#e6edf3";
        card.style.border = "1px solid rgba(255,255,255,0.08)";
      });

      stack.querySelectorAll(".MuiDivider-root").forEach(div => {
        div.style.backgroundColor = "rgba(255,255,255,0.12)";
      });

      stack.querySelectorAll("*").forEach(el => {
        el.style.filter = "none";
      });
    });
  }

  fixNews();
  setTimeout(fixNews, 300);
  setTimeout(fixNews, 1000);
  setTimeout(fixNews, 2500);

  new MutationObserver(() => fixNews()).observe(document.body, {
    childList: true,
    subtree: true,
  });

  const picker = document.createElement("div");
  picker.style.cssText = `
    position:absolute;
    z-index:99999;
    background:rgba(20,20,20,.95);
    color:white;
    padding:6px;
    border-radius:6px;
    font-size:10px;
    width:140px;
    display:none;
  `;

  picker.innerHTML = `
    <div id="preview" style="height:16px;margin-bottom:4px;border-radius:3px;"></div>
    R <input id="r" type="range" min="0" max="255">
    G <input id="g" type="range" min="0" max="255">
    B <input id="b" type="range" min="0" max="255">
    HEX <input id="hex" type="text" maxlength="7" style="width:100%;margin-top:4px;box-sizing:border-box;">
  `;

  document.body.appendChild(picker);

  const r = picker.querySelector("#r");
  const g = picker.querySelector("#g");
  const b = picker.querySelector("#b");
  const hex = picker.querySelector("#hex");
  const preview = picker.querySelector("#preview");

  let currentBlock = null;
  let pinnedBlock = null;

  function getKey(el) {
    if (!el) return null;
    if (el.dataset.colorKey) return el.dataset.colorKey;

    const key =
      "evt|" +
      (el.getAttribute("data-id") ||
        el.getAttribute("aria-label") ||
        el.textContent.replace(/\s+/g, " ").trim().slice(0, 80));

    el.dataset.colorKey = key;
    return key;
  }

  function rgb() {
    return `rgb(${r.value},${g.value},${b.value})`;
  }

  function componentToHex(value) {
    const hexValue = Number(value).toString(16);
    return hexValue.length === 1 ? `0${hexValue}` : hexValue;
  }

  function rgbToHex({ r, g, b }) {
    return `#${componentToHex(r)}${componentToHex(g)}${componentToHex(b)}`;
  }

  function parseHexColor(value) {
    if (typeof value !== "string") return null;
    const normalized = value.trim().replace(/^#/, "");
    if (!/^[0-9a-fA-F]{3}$/.test(normalized) && !/^[0-9a-fA-F]{6}$/.test(normalized)) {
      return null;
    }

    const hex = normalized.length === 3
      ? normalized.split("").map(ch => ch + ch).join("")
      : normalized;

    return {
      r: parseInt(hex.slice(0, 2), 16),
      g: parseInt(hex.slice(2, 4), 16),
      b: parseInt(hex.slice(4, 6), 16),
    };
  }

  function getRgbFromCssColor(color) {
    if (!color) return null;

    const temp = document.createElement("div");
    temp.style.color = color;
    document.body.appendChild(temp);
    const computed = getComputedStyle(temp).color;
    document.body.removeChild(temp);

    const match = computed.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
    if (!match) return null;

    return {
      r: Number(match[1]),
      g: Number(match[2]),
      b: Number(match[3]),
    };
  }

  function setPickerValues(values) {
    if (!values) return;
    r.value = values.r;
    g.value = values.g;
    b.value = values.b;
    hex.value = rgbToHex(values);
  }

  function applyColor() {
    if (!currentBlock) return;
    const key = getKey(currentBlock);
    if (!key) return;

    const color = rgb();
    currentBlock.style.backgroundColor = color;
    preview.style.background = color;
    hex.value = rgbToHex({ r: Number(r.value), g: Number(g.value), b: Number(b.value) });
    localStorage.setItem(key, color);
  }

  function show(block) {
    currentBlock = block;

    const rect = block.getBoundingClientRect();
    picker.style.top = rect.top + window.scrollY + "px";
    picker.style.left = rect.right + window.scrollX + 6 + "px";
    picker.style.display = "block";

    const key = getKey(block);
    const saved = key && localStorage.getItem(key);

    if (saved) {
      const rgbValues = getRgbFromCssColor(saved) || parseHexColor(saved);
      if (rgbValues) {
        setPickerValues(rgbValues);
      } else {
        setPickerValues({ r: 128, g: 128, b: 128 });
      }
    } else {
      setPickerValues({ r: 128, g: 128, b: 128 });
    }

    applyColor();
  }

  function closePicker() {
    picker.style.display = "none";
    currentBlock = null;
    pinnedBlock = null;
  }

  document.addEventListener("contextmenu", e => {
    const block = e.target.closest(
      '[class*="timetable"],[class*="calendar"],.event'
    );
    if (!block || !timetableColorsEnabled) return;

    e.preventDefault();
    pinnedBlock = block;
    show(block);
  });

  [r, g, b].forEach(x => x.addEventListener("input", applyColor));

  hex.addEventListener("input", () => {
    const parsed = parseHexColor(hex.value);
    if (!parsed) return;
    setPickerValues(parsed);
    applyColor();
  });

  document.addEventListener(
    "pointerdown",
    e => {
      if (picker.style.display === "none") return;
      if (picker.contains(e.target)) return;

      const block = e.target.closest(
        '[class*="timetable"],[class*="calendar"],.event'
      );
      if (block === pinnedBlock) return;

      closePicker();
    },
    true
  );

  picker.addEventListener("pointerdown", e => e.stopPropagation());

  restore();
  window.addEventListener("load", () => restore());

  new MutationObserver(muts => {
    muts.forEach(m =>
      m.addedNodes.forEach(n => n.nodeType === 1 && restore(n))
    );
  }).observe(document.body, { childList: true, subtree: true });

  const AUTO_LOGIN_KEY = "compass-auto-login-enabled";
  let autoLoginEnabled = true;
  let autoLoginObserver = null;
  let autoLoginTimeoutId = null;

  function tryClickLoginButton() {
    const loginButton = document.getElementById('SamlLoginButton');
    if (loginButton) {
      loginButton.click();
      console.log('SAML Sign-in button clicked automatically.');
      return true;
    }
    return false;
  }

  function startAutoLogin() {
    if (!autoLoginEnabled) return;

    tryClickLoginButton();
    autoLoginTimeoutId = setTimeout(tryClickLoginButton, 5000);

    if (autoLoginObserver) {
      autoLoginObserver.disconnect();
      autoLoginObserver = null;
    }

    autoLoginObserver = new MutationObserver(() => {
      const clicked = tryClickLoginButton();
      if (clicked && autoLoginObserver) {
        autoLoginObserver.disconnect();
        autoLoginObserver = null;
        console.log('SAML Sign-in button clicked via MutationObserver.');
      }
    });

    autoLoginObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  function stopAutoLogin() {
    if (autoLoginObserver) {
      autoLoginObserver.disconnect();
      autoLoginObserver = null;
    }
    if (autoLoginTimeoutId) {
      clearTimeout(autoLoginTimeoutId);
      autoLoginTimeoutId = null;
    }
  }

  function updateAutoLoginEnabled(value) {
    autoLoginEnabled = !!value;
    if (autoLoginEnabled) startAutoLogin();
    else stopAutoLogin();
  }

  function updateTimetableColorsEnabled(value) {
    timetableColorsEnabled = !!value;
    restore();
  }

  function refreshTimetableColors() {
    chrome.storage.local.get(TIMETABLE_COLORS_KEY, result => {
      const stored = result.hasOwnProperty(TIMETABLE_COLORS_KEY)
        ? result[TIMETABLE_COLORS_KEY]
        : true;
      updateTimetableColorsEnabled(stored);
    });
  }

  function applyCustomTheme() {
    chrome.storage.local.get(Object.values(THEME_COLOR_KEYS), result => {
      const styles = [];
      if (result[THEME_COLOR_KEYS.bgColor]) {
        styles.push(`html, body, body > div, .MuiPaper-root, .MuiCard-root, .MuiStack-root, .MuiToolbar-root, .MuiAppBar-root, [class*="background"], [class*="bg"] { background-color: ${result[THEME_COLOR_KEYS.bgColor]} !important; }`);
      }
      if (result[THEME_COLOR_KEYS.textColor]) {
        styles.push(`html, body, body *, body *::before, body *::after, .MuiTypography-root, .MuiButton-root, .MuiInputBase-root, .MuiTab-root, .MuiChip-root, .MuiList-root, .MuiCard-root * { color: ${result[THEME_COLOR_KEYS.textColor]} !important; }`);
      }
      if (result[THEME_COLOR_KEYS.headerColor]) {
        styles.push(`.MuiToolbar-root, .MuiAppBar-root, [class*="header"], [class*="topbar"], [class*="navbar"], [class*="toolbar"] { background-color: ${result[THEME_COLOR_KEYS.headerColor]} !important; }`);
      }
      if (result[THEME_COLOR_KEYS.headerTextColor]) {
        styles.push(`.MuiToolbar-root, .MuiAppBar-root, [class*="header"], [class*="topbar"], [class*="navbar"], [class*="toolbar"], .MuiToolbar-root *, .MuiAppBar-root * { color: ${result[THEME_COLOR_KEYS.headerTextColor]} !important; }`);
      }
      if (result[THEME_COLOR_KEYS.cardColor]) {
        styles.push(`.MuiPaper-root, .MuiCard-root, .MuiStack-root, .MuiList-root, [class*="card"], [class*="panel"], [class*="surface"], [class*="tile"], [class*="box"] { background-color: ${result[THEME_COLOR_KEYS.cardColor]} !important; }`);
      }
      if (result[THEME_COLOR_KEYS.cardTextColor]) {
        styles.push(`.MuiPaper-root, .MuiCard-root, .MuiStack-root, .MuiList-root, [class*="card"], [class*="panel"], [class*="surface"], [class*="tile"], [class*="box"], .MuiPaper-root *, .MuiCard-root *, .MuiStack-root * { color: ${result[THEME_COLOR_KEYS.cardTextColor]} !important; }`);
      }
      if (result[THEME_COLOR_KEYS.buttonColor]) {
        styles.push(`.MuiButton-root, button, input[type="button"], input[type="submit"], .MuiButtonBase-root, .MuiFab-root { background-color: ${result[THEME_COLOR_KEYS.buttonColor]} !important; }`);
      }
      if (result[THEME_COLOR_KEYS.buttonTextColor]) {
        styles.push(`.MuiButton-root, button, input[type="button"], input[type="submit"], .MuiButtonBase-root, .MuiFab-root, .MuiButton-root * { color: ${result[THEME_COLOR_KEYS.buttonTextColor]} !important; }`);
      }
      if (result[THEME_COLOR_KEYS.linkColor]) {
        styles.push(`a, a *, .MuiLink-root, .MuiButton-root, .MuiTabs-root, [class*="link"], [class*="anchor"] { color: ${result[THEME_COLOR_KEYS.linkColor]} !important; }`);
      }
      if (result[THEME_COLOR_KEYS.borderColor]) {
        styles.push(`* { border-color: ${result[THEME_COLOR_KEYS.borderColor]} !important; }`);
      }
      if (result[THEME_COLOR_KEYS.accentColor]) {
        styles.push(`.MuiChip-root, .MuiBadge-root, .MuiAvatar-root, .MuiIconButton-root, [class*="accent"], [class*="highlight"] { background-color: ${result[THEME_COLOR_KEYS.accentColor]} !important; }`);
      }
      themeStyle.textContent = styles.join("\n");
    });
  }

  chrome.storage.local.get(AUTO_LOGIN_KEY, result => {
    const stored = result.hasOwnProperty(AUTO_LOGIN_KEY)
      ? result[AUTO_LOGIN_KEY]
      : true;
    updateAutoLoginEnabled(stored);
  });

  chrome.storage.local.get(TIMETABLE_COLORS_KEY, result => {
    const stored = result.hasOwnProperty(TIMETABLE_COLORS_KEY)
      ? result[TIMETABLE_COLORS_KEY]
      : true;
    updateTimetableColorsEnabled(stored);
  });

  applyCustomTheme();

})();
