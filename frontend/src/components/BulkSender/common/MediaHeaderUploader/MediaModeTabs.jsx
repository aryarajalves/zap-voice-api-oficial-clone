import React from 'react';

export default function MediaModeTabs({ showPastSelector, setShowPastSelector, onSelectPastMedias }) {
  return (
    <div className="flex gap-2 border-b border-slate-700/50 pb-3">
      <button
        type="button"
        onClick={() => setShowPastSelector(false)}
        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
          !showPastSelector
            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
            : 'text-slate-400 hover:text-white'
        }`}
      >
        Fazer Novo Upload
      </button>
      <button
        type="button"
        onClick={() => {
          setShowPastSelector(true);
          onSelectPastMedias?.();
        }}
        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
          showPastSelector
            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
            : 'text-slate-400 hover:text-white'
        }`}
      >
        Mídias Salvas (S3/MinIO)
      </button>
    </div>
  );
}
