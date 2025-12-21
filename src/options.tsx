import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { getAllMemos, saveMemo } from './utils/storage';
import type { Memo } from './types';

const Options = () => {
  const [fontFamilySans, setFontFamilySans] = useState('sans-serif');
  const [fontFamilyMono, setFontFamilyMono] = useState('monospace');
  const [fontSize, setFontSize] = useState(16);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState('');

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
  }, []);

  const saveSettings = () => {
    chrome.storage.local.set({ fontFamilySans, fontFamilyMono, fontSize }, () => {
      setStatus('Settings saved!');
      setTimeout(() => setStatus(''), 2000);
    });
  };

  const resetFonts = () => {
    setFontFamilySans('sans-serif');
    setFontFamilyMono('monospace');
    setFontSize(16);
    chrome.storage.local.set({ 
      fontFamilySans: 'sans-serif', 
      fontFamilyMono: 'monospace', 
      fontSize: 16 
    }, () => {
      setStatus('Settings reset to default!');
      setTimeout(() => setStatus(''), 2000);
    });
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
            let count = 0;
            for (const m of json) {
                if (
                  m && 
                  typeof m.id === 'string' && 
                  typeof m.domain === 'string' &&
                  typeof m.content === 'string'
                ) {
                    const sanitizedMemo: Memo = {
                      id: m.id,
                      title: m.title || 'Untitled',
                      content: m.content,
                      domain: m.domain,
                      url: typeof m.url === 'string' ? m.url : '',
                      isUrlSpecific: !!m.isUrlSpecific,
                      createdAt: typeof m.createdAt === 'number' ? m.createdAt : Date.now(),
                      updatedAt: typeof m.updatedAt === 'number' ? m.updatedAt : Date.now(),
                    };
                    await saveMemo(sanitizedMemo);
                    count++;
                }
            }
            setStatus(`Imported ${count} notes successfully!`);
            setTimeout(() => setStatus(''), 3000);
        }
      } catch (err) {
        console.error("Failed to parse JSON", err);
        alert("Invalid JSON file");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-8 flex justify-center">
      <div className="max-w-2xl w-full space-y-8">
        <h1 className="text-3xl font-bold border-b border-gray-200 dark:border-gray-700 pb-4">Website Notes Settings</h1>
        
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow space-y-6">
          <h2 className="text-xl font-semibold">Appearance</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Sans-serif Font (Editor/Preview)</label>
              <input 
                type="text"
                value={fontFamilySans} 
                onChange={(e) => setFontFamilySans(e.target.value)}
                placeholder="e.g. system-ui, Arial"
                className="w-full p-2 rounded border border-gray-300 dark:border-gray-600 bg-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Monospace Font (Code)</label>
              <input 
                type="text"
                value={fontFamilyMono} 
                onChange={(e) => setFontFamilyMono(e.target.value)}
                placeholder="e.g. monospace, 'Fira Code'"
                className="w-full p-2 rounded border border-gray-300 dark:border-gray-600 bg-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Font Size ({fontSize}px)</label>
              <input 
                type="range" 
                min="12" 
                max="24" 
                value={fontSize} 
                onChange={(e) => setFontSize(Number(e.target.value))}
                className="w-full"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button 
              onClick={saveSettings}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium"
            >
              Save Settings
            </button>
            <button 
              onClick={resetFonts}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded font-medium"
            >
              Reset to Default
            </button>
            {status && <span className="text-green-600 dark:text-green-400">{status}</span>}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow space-y-6">
          <h2 className="text-xl font-semibold">Data Management</h2>
          <div className="flex gap-4">
            <button 
              onClick={handleExport}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded"
            >
              Export All Notes (JSON)
            </button>
            <button 
              onClick={handleImportClick}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded"
            >
              Import Notes (JSON)
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleImportFile} 
              className="hidden" 
              accept=".json" 
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Options;

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Options />
  </React.StrictMode>,
);
