import React from 'react';

export default function MediaUploadArea({
  uploadedFile,
  format,
  mediaTypeLabel,
  acceptAttr,
  isUploading,
  uploadProgress,
  handleRemoveUpload,
  handleFileSelect
}) {
  if (uploadedFile) {
    return (
      <div className="flex items-center gap-4 p-4 bg-green-500/10 border border-green-500/20 rounded-2xl">
        {format === 'VIDEO' ? (
          <video
            src={uploadedFile.url}
            className="w-16 h-12 rounded-lg object-cover bg-black/50 border border-green-500/20 flex-shrink-0"
            muted
            playsInline
            preload="metadata"
          />
        ) : (
          <div className="text-3xl flex-shrink-0">
            {uploadedFile.type === 'IMAGE' ? '🖼️' : uploadedFile.type === 'VIDEO' ? '🎬' : '📄'}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-black text-green-400 truncate">{uploadedFile.name}</p>
          <p className="text-[10px] text-slate-500 font-mono truncate mt-0.5">{uploadedFile.url}</p>
        </div>
        <button
          id="media-remove-upload"
          type="button"
          onClick={handleRemoveUpload}
          className="flex-shrink-0 p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-all cursor-pointer"
          title="Remover arquivo"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
          </svg>
        </button>
      </div>
    );
  }

  if (isUploading) {
    return (
      <div className="p-4 space-y-3 bg-amber-500/5 border border-amber-500/20 rounded-2xl">
        <div className="flex justify-between items-center">
          <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest flex items-center gap-2">
            {uploadProgress < 100 ? (
              <><span>📤 Enviando arquivo...</span></>
            ) : (
              <><span className="animate-pulse">🎬 Processando e Otimizando Vídeo para WhatsApp...</span></>
            )}
          </span>
          <span className="text-[10px] font-black text-white">{uploadProgress}%</span>
        </div>
        <div className="h-2 bg-black/40 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${uploadProgress < 100 ? 'bg-gradient-to-r from-amber-500 to-yellow-400' : 'bg-gradient-to-r from-blue-500 to-indigo-500 animate-pulse'}`}
            style={{ width: `${uploadProgress}%` }}
          />
        </div>
        {uploadProgress >= 100 && (
          <p className="text-[10px] text-amber-300/80 font-medium">
            ⚙️ O arquivo foi enviado. Convertendo formato para reprodução perfeita no WhatsApp...
          </p>
        )}
      </div>
    );
  }

  return (
    <label
      id="media-upload-area"
      className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-amber-500/30 hover:border-amber-500/60 rounded-2xl cursor-pointer hover:bg-amber-500/5 transition-all group"
    >
      <div className="w-14 h-14 bg-amber-500/10 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-amber-400">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
        </svg>
      </div>
      <p className="text-sm font-black text-white group-hover:text-amber-400 transition-colors">
        Clique para selecionar {mediaTypeLabel}
      </p>
      <p className="text-[10px] text-slate-500 font-bold mt-1 uppercase tracking-wider">
        {acceptAttr.replace(/\./g, '').toUpperCase().replace(/,/g, ', ')} — Máx. 16MB
      </p>
      <input
        type="file"
        className="hidden"
        accept={acceptAttr}
        onChange={handleFileSelect}
        disabled={isUploading}
        data-testid="media-file-input"
      />
    </label>
  );
}
