import { useState, useEffect, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { Memo } from '../types';
import { getAllMemos, getMemosByDomain, saveMemo, deleteMemo as deleteMemoFromStorage } from '../utils/storage';

export const useMemos = (domain: string | null, url: string | null, title: string | null, viewMode: 'domain' | 'all' = 'domain') => {
  const [memos, setMemos] = useState<Memo[]>([]);
  const [activeMemoId, setActiveMemoId] = useState<string | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const loadMemos = useCallback(async () => {
    let loaded: Memo[];
    if (viewMode === 'all') {
      loaded = await getAllMemos();
      loaded.sort((a, b) => b.updatedAt - a.updatedAt);
    } else if (domain) {
      loaded = await getMemosByDomain(domain);
    } else {
      loaded = [];
    }
    
    setMemos(loaded);
    // Automatically select the most recently updated memo if none selected
    if (loaded.length > 0 && !activeMemoId) {
      setActiveMemoId(loaded[0].id);
    }
  }, [domain, viewMode, activeMemoId]);

  useEffect(() => {
    let isMounted = true;

    const fetchMemos = async () => {
      let loaded: Memo[];
      if (viewMode === 'all') {
        loaded = await getAllMemos();
        loaded.sort((a, b) => b.updatedAt - a.updatedAt);
      } else if (domain) {
        loaded = await getMemosByDomain(domain);
      } else {
        loaded = [];
      }

      if (isMounted) {
        setMemos(loaded);
        if (loaded.length > 0 && !activeMemoId) {
          setActiveMemoId(loaded[0].id);
        }
      }
    };

    fetchMemos();

    return () => {
      isMounted = false;
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [domain, viewMode, activeMemoId]);

  const createMemo = async () => {
    if (!domain || !url) return;
    
    const now = new Date();
    const formattedDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    const frontmatter = `---
URL: ${url}
title: ${title || ''}
created_at: ${formattedDate}
---

`;

    let displayTitle = 'New Note';
    if (title) {
      displayTitle = `Note: ${title}`;
    }

    const newMemo: Memo = {
      id: uuidv4(),
      title: displayTitle,
      content: frontmatter,
      domain,
      url,
      isUrlSpecific: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await saveMemo(newMemo);
    await loadMemos();
    setActiveMemoId(newMemo.id);
  };

  const updateMemo = useCallback((updatedMemo: Memo) => {
    // Optimistic update
    setMemos((prev) => prev.map((m) => (m.id === updatedMemo.id ? updatedMemo : m)));
    
    // Debounce save
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      await saveMemo(updatedMemo);
    }, 1000);
  }, []);

  const deleteMemo = async (id: string) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    await deleteMemoFromStorage(id);
    await loadMemos();
    if (activeMemoId === id) {
      setActiveMemoId(null);
    }
  };

  const activeMemo = memos.find((m) => m.id === activeMemoId) || null;

  return {
    memos,
    activeMemo,
    setActiveMemoId,
    createMemo,
    updateMemo,
    deleteMemo,
  };
};