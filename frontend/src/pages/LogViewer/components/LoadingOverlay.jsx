import React from 'react';

export default function LoadingOverlay({ stage, progress, total, current }) {
  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-[#1e293b] rounded-2xl border border-gray-100 dark:border-white/10 shadow-2xl p-8 w-80 flex flex-col items-center gap-5">
        <div className="relative w-14 h-14">
          <div className="absolute inset-0 rounded-full border-4 border-blue-500/20" />
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-500 animate-spin" />
        </div>
        {stage === 'fetching' ? (
          <div className="text-center">
            <p className="font-bold text-gray-800 dark:text-white text-sm">Buscando logs do servidor</p>
            <p className="text-xs text-gray-400 mt-1">Aguarde, isso pode levar alguns segundos...</p>
          </div>
        ) : (
          <div className="text-center w-full">
            <p className="font-bold text-gray-800 dark:text-white text-sm">Processando logs</p>
            <p className="text-xs text-gray-400 mt-1">
              {(current || 0).toLocaleString()} / {(total || 0).toLocaleString()} linhas
            </p>
            <div className="mt-3 w-full bg-gray-100 dark:bg-white/10 rounded-full h-2 overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all duration-150"
                style={{ width: `${progress || 0}%` }}
              />
            </div>
            <p className="text-[11px] text-blue-400 font-bold mt-1">{progress || 0}%</p>
          </div>
        )}
      </div>
    </div>
  );
}
