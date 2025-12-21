import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useCurrentDomain } from './hooks/useCurrentDomain';
import { useMemos } from './hooks/useMemos';
import type { MemoMessage, Memo } from './types';
import CodeMirror from '@uiw/react-codemirror';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import { oneDark } from '@codemirror/theme-one-dark';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import 'github-markdown-css/github-markdown.css';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { getAllMemos, saveMemo } from './utils/storage';

// Helper for classes
const cn = (...inputs: (string | undefined | null | false)[]) => twMerge(clsx(inputs));

function App() {
  const { domain, url, title } = useCurrentDomain();
  const { memos, activeMemo, setActiveMemoId, createMemo, updateMemo, deleteMemo } = useMemos(domain, url, title);
  const [mode, setMode] = useState<'edit' | 'preview'>('edit');
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    const saved = localStorage.getItem('sidebarOpen');
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [isDarkMode, setIsDarkMode] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    localStorage.setItem('sidebarOpen', JSON.stringify(sidebarOpen));
  }, [sidebarOpen]);

  useEffect(() => {
    const match = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => setIsDarkMode(e.matches);
    match.addEventListener('change', handler);

    // Security: Force links to open in new tab and add security attributes
    DOMPurify.addHook('afterSanitizeAttributes', (node) => {
      if (node.tagName === 'A') {
        node.setAttribute('target', '_blank');
        node.setAttribute('rel', 'noopener noreferrer');
      }
    });

    return () => match.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    const handleMessage = (message: MemoMessage) => {
      if (message.type === 'OPEN_MEMO' && message.memoId) {
        setActiveMemoId(message.memoId);
      } else if (message.type === 'CREATE_MEMO') {
        createMemo();
      }
    };

    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.onMessage.addListener(handleMessage);
      return () => chrome.runtime.onMessage.removeListener(handleMessage);
    }
  }, [setActiveMemoId, createMemo]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (activeMemo) {
      updateMemo({ ...activeMemo, title: e.target.value, updatedAt: Date.now() });
    }
  };

  const handleContentChange = useCallback((val: string) => {
    if (activeMemo) {
      updateMemo({ ...activeMemo, content: val, updatedAt: Date.now() });
    }
  }, [activeMemo, updateMemo]);

  const confirmDelete = () => {
    if (activeMemo) {
      deleteMemo(activeMemo.id);
      setDeleteConfirmOpen(false);
    }
  };

  const renderPreview = (content: string) => {
    // Basic Front Matter parsing
    const frontMatterRegex = /^---\n([\s\S]+?)\n---/;
    const match = content.match(frontMatterRegex);

    let processedContent = content;

    if (match) {
      const frontMatter = match[1];
      const rows = frontMatter.split('\n').filter(line => line.trim() !== '');
      let tableHtml = '<table class="front-matter-table mb-4 border-collapse w-full text-sm"><tbody>';
      
      rows.forEach(row => {
        const parts = row.split(':');
        if (parts.length >= 2) {
          const key = parts[0].trim();
          const value = parts.slice(1).join(':').trim();
          tableHtml += `<tr class="border-b border-gray-200 dark:border-gray-700"><td class="py-1 pr-2 font-semibold text-gray-600 dark:text-gray-400 select-none w-24">${key}</td><td class="py-1 text-gray-800 dark:text-gray-200 break-all">${value}</td></tr>`;
        }
      });
      
      tableHtml += '</tbody></table>';
      processedContent = content.replace(frontMatterRegex, tableHtml);
    }

    const rawMarkup = marked.parse(processedContent);
    return { __html: DOMPurify.sanitize(rawMarkup as string, {
      ADD_ATTR: ['target', 'rel'],
    }) };
  };

  const handleExport = async () => {
    const allMemos = await getAllMemos();
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(allMemos));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "website_notes_backup.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (Array.isArray(json)) {
            for (const m of json) {
                // Improved validation
                if (
                  m && 
                  typeof m.id === 'string' && 
                  typeof m.domain === 'string' &&
                  typeof m.content === 'string' &&
                  typeof m.title === 'string'
                ) {
                    // Sanitize input data to prevent storage pollution
                    const sanitizedMemo: Memo = {
                      id: m.id,
                      title: m.title,
                      content: m.content,
                      domain: m.domain,
                      url: typeof m.url === 'string' ? m.url : '',
                      isUrlSpecific: !!m.isUrlSpecific,
                      createdAt: typeof m.createdAt === 'number' ? m.createdAt : Date.now(),
                      updatedAt: typeof m.updatedAt === 'number' ? m.updatedAt : Date.now(),
                    };
                    await saveMemo(sanitizedMemo);
                }
            }
            // Trigger reload
            window.location.reload();
        }
      } catch (err) {
        console.error("Failed to parse JSON", err);
        alert("Invalid JSON file");
      }
    };
    reader.readAsText(file);
  };

  if (!domain) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100 dark:bg-gray-900 text-gray-500 p-4 text-center">
        <p>Open a website to start taking notes for that domain.</p>
      </div>
    );
  }

  return (
    <div className={cn("flex h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 overflow-hidden", isDarkMode ? 'dark' : '')}>
      {/* Sidebar (Memo List) */}
      <div className={cn("flex flex-col border-r border-gray-200 dark:border-gray-700 transition-all duration-300", sidebarOpen ? "w-64" : "w-0 overflow-hidden")}>
         <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800">
            <h2 className="font-bold text-sm truncate w-32" title={domain}>{domain}</h2>
            <div className="flex gap-1">
                <button onClick={createMemo} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded" title="New Note">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                </button>
                <button onClick={() => setSettingsOpen(!settingsOpen)} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded" title="Settings">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
                </button>
            </div>
         </div>
         
         {settingsOpen && (
             <div className="p-2 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex flex-col gap-2">
                 <button onClick={handleExport} className="text-xs w-full text-left px-2 py-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded">Export All JSON</button>
                 <button onClick={handleImportClick} className="text-xs w-full text-left px-2 py-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded">Import JSON</button>
                 <input type="file" ref={fileInputRef} onChange={handleImportFile} className="hidden" accept=".json" />
             </div>
         )}

         <div className="flex-1 overflow-y-auto">
            {memos.map(memo => (
              <div 
                key={memo.id}
                onClick={() => setActiveMemoId(memo.id)}
                className={cn("p-3 cursor-pointer border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800", activeMemo?.id === memo.id && "bg-blue-50 dark:bg-blue-900/20 border-l-4 border-l-blue-500")}
              >
                <div className="font-medium text-sm truncate">{memo.title || "Untitled"}</div>
                <div className="text-xs text-gray-400 mt-1">{new Date(memo.updatedAt).toLocaleDateString()}</div>
              </div>
            ))}
            {memos.length === 0 && (
              <div className="p-4 text-center text-gray-400 text-sm">No notes for {domain}</div>
            )}
         </div>
      </div>

      {/* Main Area */}
      <div className="flex-1 flex flex-col h-full min-w-0">
        {/* Toolbar */}
        <div className="h-12 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-4 bg-white dark:bg-gray-900 z-10 shrink-0">
          <div className="flex items-center gap-2 flex-1 mr-2">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="mr-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
               {sidebarOpen ? 
                 <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line></svg> : 
                 <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line></svg> 
               }
            </button>
            {activeMemo && (
               <input 
                 type="text" 
                 value={activeMemo.title} 
                 onChange={handleTitleChange} 
                 className="bg-transparent font-semibold focus:outline-none text-gray-800 dark:text-gray-100 w-full min-w-0"
                 placeholder="Note Title"
               />
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
             <button 
               onClick={() => setMode(mode === 'edit' ? 'preview' : 'edit')}
               className="text-xs font-medium px-2 py-1 rounded bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
             >
               {mode === 'edit' ? 'Preview' : 'Editor'}
             </button>
             {activeMemo && (
                <button 
                  onClick={() => setDeleteConfirmOpen(true)}
                  className="text-red-500 hover:text-red-700 p-1"
                  title="Delete Note"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                </button>
             )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden bg-white dark:bg-gray-900 relative">
           {!activeMemo ? (
             <div className="h-full flex flex-col items-center justify-center text-gray-400">
                <p>Select or create a note.</p>
             </div>
           ) : (
             <>
               {mode === 'edit' ? (
                 <CodeMirror
                   value={activeMemo.content}
                   height="100%"
                   extensions={[markdown({ base: markdownLanguage, codeLanguages: languages })]}
                   onChange={handleContentChange}
                   theme={isDarkMode ? oneDark : 'light'}
                   className="h-full text-base"
                 />
               ) : (
                 <div className="markdown-body p-8 h-full overflow-y-auto" dangerouslySetInnerHTML={renderPreview(activeMemo.content)} />
               )}
             </>
           )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-80 transform transition-all scale-100">
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">Delete Note?</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              Are you sure you want to delete <span className="font-semibold text-gray-700 dark:text-gray-300">"{activeMemo?.title || 'Untitled'}"</span>? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setDeleteConfirmOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                Cancel
              </button>
              <button 
                onClick={confirmDelete}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;