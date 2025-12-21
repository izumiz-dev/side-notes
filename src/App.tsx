import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useCurrentDomain } from './hooks/useCurrentDomain';
import { useMemos } from './hooks/useMemos';
import type { MemoMessage } from './types';
import CodeMirror from '@uiw/react-codemirror';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import { oneDark } from '@codemirror/theme-one-dark';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import 'github-markdown-css/github-markdown.css';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Helper for classes
const cn = (...inputs: (string | undefined | null | false)[]) => twMerge(clsx(inputs));

interface MenuItem {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  variant?: 'default' | 'danger';
}

function KebabMenu({ items, title = "Menu" }: { items: MenuItem[], title?: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
        title={title}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>
      </button>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)}></div>
          <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded shadow-lg z-50 py-1">
            {items.map((item, i) => (
              <button 
                key={i}
                onClick={() => {
                  setIsOpen(false);
                  item.onClick();
                }}
                className={cn(
                  "w-full text-left px-4 py-2 text-sm flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-700",
                  item.variant === 'danger' ? "text-red-600 dark:text-red-400" : "text-gray-700 dark:text-gray-300"
                )}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function App() {
  const { domain, url, title } = useCurrentDomain();
  const [viewMode, setViewMode] = useState<'domain' | 'all'>('domain');
  const { memos, activeMemo, setActiveMemoId, createMemo, updateMemo, deleteMemo } = useMemos(domain, url, title, viewMode);
  const [mode, setMode] = useState<'edit' | 'preview'>('edit');
  
  // Sidebar State
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    const saved = localStorage.getItem('sidebarOpen');
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem('sidebarWidth');
    return saved !== null ? parseInt(saved, 10) : 256;
  });
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  // Theme & Font State
  const [isDarkMode, setIsDarkMode] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches);
  const [fontFamilySans, setFontFamilySans] = useState('sans-serif');
  const [fontFamilyMono, setFontFamilyMono] = useState('monospace');
  const [fontSize, setFontSize] = useState(16);

  // UI State
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  // Sidebar Persistence
  useEffect(() => {
    localStorage.setItem('sidebarOpen', JSON.stringify(sidebarOpen));
  }, [sidebarOpen]);

  useEffect(() => {
    localStorage.setItem('sidebarWidth', String(sidebarWidth));
  }, [sidebarWidth]);

  // Sidebar Resize Logic
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      e.preventDefault(); 
      
      const newWidth = Math.max(150, Math.min(e.clientX, 600));
      if (sidebarRef.current) {
        sidebarRef.current.style.width = `${newWidth}px`;
      }
    };

    const handleMouseUp = () => {
      if (!isResizing) return;
      
      setIsResizing(false);
      document.body.style.cursor = 'default';
      document.body.style.userSelect = 'auto';
      
      const newWidth = sidebarRef.current ? sidebarRef.current.offsetWidth : sidebarWidth;
      setSidebarWidth(newWidth);
    };

    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, sidebarWidth]);

  // Theme & Security
  useEffect(() => {
    const match = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => setIsDarkMode(e.matches);
    match.addEventListener('change', handler);

    DOMPurify.addHook('afterSanitizeAttributes', (node) => {
      if (node.tagName === 'A') {
        node.setAttribute('target', '_blank');
        node.setAttribute('rel', 'noopener noreferrer');
      }
    });

    return () => match.removeEventListener('change', handler);
  }, []);

  // Load Font Settings
  useEffect(() => {
    chrome.storage.local.get(['fontFamilySans', 'fontFamilyMono', 'fontSize'], (result) => {
      if (typeof result.fontFamilySans === 'string') {
        setFontFamilySans(result.fontFamilySans);
      }
      if (typeof result.fontFamilyMono === 'string') {
        setFontFamilyMono(result.fontFamilyMono);
      }
      if (typeof result.fontSize === 'number') {
        setFontSize(result.fontSize);
      }
    });

    const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }, area: string) => {
      if (area === 'local') {
        if (changes.fontFamilySans && typeof changes.fontFamilySans.newValue === 'string') {
          setFontFamilySans(changes.fontFamilySans.newValue);
        }
        if (changes.fontFamilyMono && typeof changes.fontFamilyMono.newValue === 'string') {
          setFontFamilyMono(changes.fontFamilyMono.newValue);
        }
        if (changes.fontSize && typeof changes.fontSize.newValue === 'number') {
          setFontSize(changes.fontSize.newValue);
        }
      }
    };
    chrome.storage.onChanged.addListener(handleStorageChange);
    return () => chrome.storage.onChanged.removeListener(handleStorageChange);
  }, []);

  // Code Block Copy Button
  useEffect(() => {
    if (mode !== 'preview' || !previewRef.current) return;

    const preElements = previewRef.current.querySelectorAll('pre');
    preElements.forEach((pre) => {
      if (pre.querySelector('.copy-btn')) return;

      pre.style.position = 'relative';
      pre.classList.add('group');

      const button = document.createElement('button');
      button.className = `
        copy-btn absolute top-2 right-2 w-8 h-8 flex items-center justify-center rounded-md border 
        transition-all duration-200 opacity-0 group-hover:opacity-100
        bg-white border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-700
        dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200
      `.replace(/\s+/g, ' ').trim();

      button.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
        </svg>
      `;
      button.title = "Copy code";

      button.addEventListener('click', async () => {
        const code = pre.querySelector('code')?.innerText || pre.innerText;
        try {
          await navigator.clipboard.writeText(code);
          const originalIcon = button.innerHTML;
          button.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" class="text-green-500 dark:text-green-400">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          `;
          setTimeout(() => {
            button.innerHTML = originalIcon;
          }, 2000);
        } catch (err) {
          console.error('Failed to copy!', err);
        }
      });

      pre.appendChild(button);
    });
  }, [mode, activeMemo?.content]);

  // Message Handling
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

  const sanitizeFileName = (name: string) => {
    return name.replace(/[<>:"/\\|?*]/g, '_');
  };

  const handleDownloadMarkdown = () => {
    if (!activeMemo) return;
    const fileName = `${sanitizeFileName(activeMemo.title || 'Untitled')}.md`;
    const blob = new Blob([activeMemo.content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", url);
    downloadAnchorNode.setAttribute("download", fileName);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    URL.revokeObjectURL(url);
  };

  const renderPreview = (content: string) => {
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

  const getFontStyle = (): React.CSSProperties => {
    const style: React.CSSProperties & Record<string, string> = {
      fontFamily: fontFamilySans || 'sans-serif',
      fontSize: `${fontSize}px`,
    };
    style['--font-user-sans'] = fontFamilySans || 'sans-serif';
    style['--font-user-mono'] = fontFamilyMono || 'monospace';
    return style;
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
      <div 
        ref={sidebarRef}
        className={cn(
          "flex flex-col border-r border-gray-200 dark:border-gray-700 relative group",
          !isResizing && "transition-all duration-300", 
          !sidebarOpen && "w-0 overflow-hidden border-none"
        )}
        style={{ width: sidebarOpen ? sidebarWidth : 0 }}
      >
         <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800">
            <h2 className="font-bold text-sm truncate" style={{ width: Math.max(0, sidebarWidth - 64) }} title={viewMode === 'all' ? 'All Notes' : (domain || '')}>
              {viewMode === 'all' ? 'All Notes' : (domain || 'No context')}
            </h2>
            <KebabMenu 
              items={[
                { 
                  label: "New Note", 
                  icon: <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>,
                  onClick: createMemo 
                },
                { 
                  label: viewMode === 'all' ? "View Domain Notes" : "View All Notes", 
                  icon: <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>,
                  onClick: () => setViewMode(viewMode === 'all' ? 'domain' : 'all') 
                },
                { 
                  label: "Settings", 
                  icon: <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>,
                  onClick: () => chrome.runtime.openOptionsPage() 
                }
              ]}
            />
         </div>

         <div className="flex-1 overflow-y-auto">
            {memos.map(memo => (
              <div 
                key={memo.id}
                onClick={() => setActiveMemoId(memo.id)}
                className={cn("p-3 cursor-pointer border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800", activeMemo?.id === memo.id && "bg-blue-50 dark:bg-blue-900/20 border-l-4 border-l-blue-500")}
              >
                <div className="font-medium text-sm truncate">{memo.title || "Untitled"}</div>
                <div className="flex justify-between items-center mt-1">
                  <div className="text-[10px] text-gray-400 truncate flex-1 mr-2">{viewMode === 'all' ? memo.domain : new Date(memo.updatedAt).toLocaleDateString()}</div>
                  {viewMode === 'all' && <div className="text-[10px] text-gray-300">{new Date(memo.updatedAt).toLocaleDateString()}</div>}
                </div>
              </div>
            ))}
            {memos.length === 0 && (
              <div className="p-4 text-center text-gray-400 text-sm">No notes found.</div>
            )}
         </div>
         
         {/* Resize Handle */}
         <div
            className="absolute right-0 top-0 w-1 h-full cursor-col-resize hover:bg-blue-500/50 transition-colors z-50"
            onMouseDown={() => setIsResizing(true)}
         />
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
          <div className="flex items-center gap-2 shrink-0 relative">
             <button 
               onClick={() => setMode(mode === 'edit' ? 'preview' : 'edit')}
               className="text-xs font-medium px-2 py-1 rounded bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
             >
               {mode === 'edit' ? 'Preview' : 'Editor'}
             </button>
             {activeMemo && (
                <KebabMenu 
                  items={[
                    { 
                      label: "Download Markdown", 
                      icon: <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>,
                      onClick: handleDownloadMarkdown 
                    },
                    { 
                      label: "Delete Note", 
                      icon: <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>,
                      onClick: () => setDeleteConfirmOpen(true),
                      variant: 'danger'
                    }
                  ]}
                />
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
                   style={getFontStyle()}
                 />
               ) : (
                 <div 
                   ref={previewRef}
                   className="markdown-body p-8 h-full overflow-y-auto"
                   dangerouslySetInnerHTML={renderPreview(activeMemo.content)} 
                   style={getFontStyle()} 
                 />
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
