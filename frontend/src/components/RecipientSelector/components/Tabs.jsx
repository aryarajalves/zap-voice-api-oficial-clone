
import React from 'react';

const Tabs = ({ mode, setMode }) => {
    return (
        <div className="flex justify-center mb-8">
            <div className="bg-black/40 p-1.5 rounded-2xl inline-flex relative w-full max-w-md border border-white/5 shadow-inner">
                <button
                    onClick={() => setMode('manual')}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 relative z-10 ${mode === 'manual'
                        ? 'text-white shadow-lg shadow-emerald-900/20 bg-slate-800 border border-white/5'
                        : 'text-slate-500 hover:text-slate-300'
                        }`}
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                    Manual
                </button>
                <button
                    onClick={() => setMode('upload')}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 relative z-10 ${mode === 'upload'
                        ? 'text-white shadow-lg shadow-emerald-900/20 bg-slate-800 border border-white/5'
                        : 'text-slate-500 hover:text-slate-300'
                        }`}
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                    Upload
                </button>
                <button
                    onClick={() => setMode('tag')}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 relative z-10 ${mode === 'tag'
                        ? 'text-white shadow-lg shadow-emerald-900/20 bg-slate-800 border border-white/5'
                        : 'text-slate-500 hover:text-slate-300'
                        }`}
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" /><line x1="7" y1="7" x2="7.01" y2="7" /></svg>
                    Etiquetas
                </button>
            </div>
        </div>
    );
};

export default Tabs;
