import React from 'react';

export default function BlockedTabs({ mode, setMode }) {
    return (
        <div className="flex border-b border-white/10 mb-6">
            <button
                onClick={() => setMode('manual')}
                className={`pb-2 px-6 text-sm font-bold flex items-center gap-2 cursor-pointer transition-all ${
                    mode === 'manual' 
                        ? 'text-red-500 border-b-2 border-red-500' 
                        : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
            >
                Manual ✍️
            </button>
            <button
                onClick={() => setMode('upload')}
                className={`pb-2 px-6 text-sm font-bold flex items-center gap-2 cursor-pointer transition-all ${
                    mode === 'upload' 
                        ? 'text-red-500 border-b-2 border-red-500' 
                        : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
            >
                Upload CSV/Excel 📂
            </button>
        </div>
    );
}
