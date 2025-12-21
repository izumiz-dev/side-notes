import type { MemoStore } from './types';

// Enable the side panel to open on action click
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((err) => console.error(err));

const updateBadgeAndMenu = async (tabId: number, url: string) => {
  if (!url) return;

  const result = await chrome.storage.local.get('memos');
  const memos = (result.memos || {}) as MemoStore;
  const memoList = Object.values(memos);
  
  // URL exact match count
  const matchCount = memoList.filter(m => m.url === url).length;

  // Update Badge
  if (matchCount > 0) {
    await chrome.action.setBadgeText({ text: String(matchCount), tabId });
    await chrome.action.setBadgeBackgroundColor({ color: '#22c55e', tabId });
  } else {
    await chrome.action.setBadgeText({ text: '', tabId });
  }

  // Update Context Menu
  const title = matchCount > 0 ? "Open Note for this Page" : "Create Note for this Page";
  if (chrome.contextMenus) {
    chrome.contextMenus.update("domain-memo-action", { title }, () => {
      // Ignore error if menu item doesn't exist yet
      if (chrome.runtime.lastError) { /* ignore */ }
    });
  }
};

// Initialize Context Menu
chrome.runtime.onInstalled.addListener(() => {
  if (chrome.contextMenus) {
    chrome.contextMenus.create({
      id: "domain-memo-action",
      title: "Create Note for this Page",
      contexts: ["all"]
    });
  }
});

// Event Listeners for Badge & Menu Updates
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  const tab = await chrome.tabs.get(activeInfo.tabId);
  if (tab.url) {
    updateBadgeAndMenu(activeInfo.tabId, tab.url);
  }
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    updateBadgeAndMenu(tabId, tab.url);
  }
});

chrome.storage.onChanged.addListener(async (changes, area) => {
  if (area === 'local' && changes.memos) {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id && tab?.url) {
      updateBadgeAndMenu(tab.id, tab.url);
    }
  }
});

// Handle Context Menu Click
if (chrome.contextMenus) {
  chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId === "domain-memo-action" && tab?.id && tab?.url) {
      // Open Side Panel
      // chrome.sidePanel.open requires Chrome 114+
      await chrome.sidePanel.open({ tabId: tab.id });

      // Determine action
      const result = await chrome.storage.local.get('memos');
      const memos = (result.memos || {}) as MemoStore;
      const memoList = Object.values(memos);
      const existingMemo = memoList.find(m => m.url === tab.url);

      // Send message to App.tsx
      // We need a slight delay to ensure the side panel is loaded if it wasn't open
      setTimeout(() => {
          chrome.runtime.sendMessage({
              type: existingMemo ? 'OPEN_MEMO' : 'CREATE_MEMO',
              memoId: existingMemo?.id,
              url: tab.url,
              title: tab.title
          }).catch(() => {
              // If receiver not ready (e.g., panel just opened), retrying might be needed 
              // or App.tsx checks storage on mount.
              // For now, simple fire-and-forget.
              console.log("Message sent, but maybe no receiver yet.");
          });
      }, 500);
    }
  });
} else {
  console.warn("chrome.contextMenus API not available.");
}
