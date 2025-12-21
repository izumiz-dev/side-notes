export interface Memo {
  id: string;
  title: string;
  content: string;
  domain: string;
  url: string;
  isUrlSpecific: boolean;
  createdAt: number;
  updatedAt: number;
}

export type MemoStore = Record<string, Memo>; // Keyed by ID for easier updates

export type MemoMessage = 
  | { type: 'OPEN_MEMO'; memoId: string }
  | { type: 'CREATE_MEMO'; url: string; title?: string };
