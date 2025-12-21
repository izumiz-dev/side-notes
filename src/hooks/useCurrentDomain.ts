import { useState, useEffect } from 'react';

export const useCurrentDomain = () => {
  const [domain, setDomain] = useState<string | null>(() => {
    if (typeof chrome !== 'undefined' && chrome.tabs) return null;
    try {
      return new URL(window.location.href).hostname;
    } catch {
      return 'localhost';
    }
  });
  const [url, setUrl] = useState<string | null>(() => {
    if (typeof chrome !== 'undefined' && chrome.tabs) return null;
    return window.location.href;
  });
  const [title, setTitle] = useState<string | null>(() => {
    if (typeof chrome !== 'undefined' && chrome.tabs) return null;
    return document.title || 'Localhost';
  });

  useEffect(() => {
    // Check if chrome extension API is available
    const isExtension = typeof chrome !== 'undefined' && chrome.tabs;

    if (!isExtension) {
      return;
    }

    const updateTabInfo = async () => {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.url) {
        try {
          const urlObj = new URL(tab.url);
          setDomain(urlObj.hostname);
          setUrl(tab.url);
          setTitle(tab.title || '');
        } catch {
          console.error("Invalid URL:", tab.url);
          setDomain(null);
          setUrl(null);
          setTitle(null);
        }
      }
    };

    updateTabInfo();

    const handleActivated = () => updateTabInfo();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleUpdated = (_tabId: number, changeInfo: any) => {
      if (changeInfo.url) {
        updateTabInfo();
      }
    };

    chrome.tabs.onActivated.addListener(handleActivated);
    chrome.tabs.onUpdated.addListener(handleUpdated);

    return () => {
      chrome.tabs.onActivated.removeListener(handleActivated);
      chrome.tabs.onUpdated.removeListener(handleUpdated);
    };
  }, []);

  return { domain, url, title };
};
