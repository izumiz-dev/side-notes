import type { Memo, MemoStore } from '../types';

const isExtension = typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local;

const getLocalStore = (): MemoStore => {
  try {
    const raw = localStorage.getItem('memos');
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

const setLocalStore = (memos: MemoStore) => {
  localStorage.setItem('memos', JSON.stringify(memos));
};

export const saveMemo = async (memo: Memo): Promise<void> => {
  if (isExtension) {
    const result = await chrome.storage.local.get('memos');
    const memos = (result.memos || {}) as MemoStore;
    memos[memo.id] = memo;
    await chrome.storage.local.set({ memos });
  } else {
    const memos = getLocalStore();
    memos[memo.id] = memo;
    setLocalStore(memos);
  }
};

export const getMemosByDomain = async (domain: string): Promise<Memo[]> => {
  let memos: MemoStore;
  if (isExtension) {
    const result = await chrome.storage.local.get('memos');
    memos = (result.memos || {}) as MemoStore;
  } else {
    memos = getLocalStore();
  }
  return Object.values(memos).filter((memo) => memo.domain === domain).sort((a, b) => b.updatedAt - a.updatedAt);
};

export const getAllMemos = async (): Promise<Memo[]> => {
  let memos: MemoStore;
  if (isExtension) {
    const result = await chrome.storage.local.get('memos');
    memos = (result.memos || {}) as MemoStore;
  } else {
    memos = getLocalStore();
  }
  return Object.values(memos);
};

export const deleteMemo = async (id: string): Promise<void> => {
  if (isExtension) {
    const result = await chrome.storage.local.get('memos');
    const memos = (result.memos || {}) as MemoStore;
    delete memos[id];
    await chrome.storage.local.set({ memos });
  } else {
    const memos = getLocalStore();
    delete memos[id];
    setLocalStore(memos);
  }
};
