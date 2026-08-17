import React from 'react';
import { FiList, FiFilter } from 'react-icons/fi';

export default function LogViewerManualPaste({
  pasteMode,
  rawPaste,
  setRawPaste,
  setHasProcessed,
  handleProcessPaste
}) {
  if (!pasteMode) return null;

  return (
    <div className="bg-white dark:bg-[#1e293b] rounded-2xl border border-gray-100 dark:border-white/5 overflow-hidden">
      <div className="px-5 py-3 bg-gray-50 dark:bg-white/[0.03] border-b border-gray-100 dark:border-white/5 flex items-center justify-between">
        <span className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
          <FiList size={13} /> Cole seus logs aqui
        </span>
        <button
          type="button"
          onClick={handleProcessPaste}
          disabled={!rawPaste.trim()}
          className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-40"
        >
          <FiFilter size={12} /> Processar
        </button>
      </div>
      <textarea
        value={rawPaste}
        onChange={e => { setRawPaste(e.target.value); setHasProcessed(false); }}
        placeholder="Cole aqui os logs para analisar..."
        className="w-full h-40 px-5 py-4 bg-transparent text-xs font-mono text-gray-300 placeholder:text-gray-600 outline-none resize-none"
      />
    </div>
  );
}
