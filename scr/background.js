const BLOCK_TRACKERS_KEY = 'compass-block-trackers-enabled';
const TRACKER_RULES = [
  {
    id: 1,
    priority: 1,
    action: { type: 'block' },
    condition: {
      urlFilter: '||googletagmanager.com^',
      resourceTypes: ['script', 'xmlhttprequest', 'sub_frame', 'image', 'stylesheet', 'other'],
    },
  },
  {
    id: 2,
    priority: 1,
    action: { type: 'block' },
    condition: {
      urlFilter: '||loudflareinsights.com^',
      resourceTypes: ['script', 'xmlhttprequest', 'sub_frame', 'image', 'stylesheet', 'other'],
    },
  },
  {
    id: 3,
    priority: 1,
    action: { type: 'block' },
    condition: {
      urlFilter: '||sentry.io^',
      resourceTypes: ['script', 'xmlhttprequest', 'sub_frame', 'image', 'stylesheet', 'other'],
    },
  },
  {
    id: 4,
    priority: 1,
    action: { type: 'block' },
    condition: {
      urlFilter: '||google.com^',
      resourceTypes: ['script', 'xmlhttprequest', 'sub_frame', 'image', 'stylesheet', 'other'],
    },
  },
];

function updateTrackerRules(enabled) {
  return chrome.declarativeNetRequest.updateDynamicRules({
    addRules: enabled ? TRACKER_RULES : [],
    removeRuleIds: TRACKER_RULES.map(rule => rule.id),
  });
}

chrome.storage.local.get(BLOCK_TRACKERS_KEY, result => {
  const enabled = result.hasOwnProperty(BLOCK_TRACKERS_KEY)
    ? !!result[BLOCK_TRACKERS_KEY]
    : false;
  updateTrackerRules(enabled).catch(console.error);
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local') return;
  if (changes[BLOCK_TRACKERS_KEY]) {
    const enabled = !!changes[BLOCK_TRACKERS_KEY].newValue;
    updateTrackerRules(enabled).catch(console.error);
  }
});
