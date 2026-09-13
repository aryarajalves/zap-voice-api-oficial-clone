import React from 'react';

export default function MediaStatusIndicator({ isUploading, currentUrl, mediaTypeLabel }) {
  if (isUploading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-xl animate-pulse">
        <span className="text-amber-400 text-xs">⚙️</span>
        <p className="text-[10px] text-amber-400 font-bold">
          Aguarde... finalizando otimização da mídia no servidor.
        </p>
      </div>
    );
  }

  if (!currentUrl) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-xl">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-red-400 flex-shrink-0">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/>
          <line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
        <p className="text-[10px] text-red-400 font-bold">
          {mediaTypeLabel} pendente — necessário para avançar
        </p>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-green-500/10 border border-green-500/20 rounded-xl">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-green-400 flex-shrink-0">
        <polyline points="20 6 9 17 4 12"/>
      </svg>
      <p className="text-[10px] text-green-400 font-bold">
        {mediaTypeLabel} configurada — pronto para avançar!
      </p>
    </div>
  );
}
