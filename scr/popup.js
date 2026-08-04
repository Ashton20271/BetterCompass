const MODE_KEY = "compass-mode";
const AUTO_LOGIN_KEY = "compass-auto-login-enabled";

function setTheme(mode) {
  chrome.storage.local.set({ [MODE_KEY]: mode });
}

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll("button[data-mode]").forEach(button => {
    button.addEventListener("click", () => {
      setTheme(button.dataset.mode);
      window.close();
    });
  });

  const autoLoginEl = document.getElementById('autoLogin');
  // initialize checkbox from storage
  chrome.storage.local.get(AUTO_LOGIN_KEY, result => {
    const stored = result.hasOwnProperty(AUTO_LOGIN_KEY) ? result[AUTO_LOGIN_KEY] : true;
    autoLoginEl.checked = !!stored;
  });

  autoLoginEl.addEventListener('change', () => {
    chrome.storage.local.set({ [AUTO_LOGIN_KEY]: !!autoLoginEl.checked });
  });
});
