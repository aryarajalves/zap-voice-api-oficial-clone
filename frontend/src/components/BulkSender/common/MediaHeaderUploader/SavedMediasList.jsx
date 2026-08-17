import React from 'react';
import { toast } from 'react-hot-toast';

export default function SavedMediasList({
  pastMedias = [],
  format,
  mediaTypeLabel,
  mediaIcon,
  currentUrl,
  editingMediaId,
  setEditingMediaId,
  editingName,
  setEditingName,
  startRename,
  saveRename,
  setMediaToDelete,
  setUploadedFile,
  handleParamChange,
  currentPage,
  totalPages,
  pageSize,
  handlePageSizeChange,
  handlePageChange
}) {
  if (pastMedias.length === 0) {
    return (
      <p className="text-xs text-slate-500 text-center py-6 font-medium">
        Nenhuma {mediaTypeLabel.toLowerCase()} salva encontrada para este cliente.
      </p>
    );
  }

  const handleSelectMedia = (media) => {
    if (editingMediaId === media.id) return; // Evitar clique ao renomear
    const mediaSizeMB = media.size ? media.size / 1024 / 1024 : 0;
    if (format === 'VIDEO' && mediaSizeMB > 16.0) {
      toast.error(
        `⚠️ Este vídeo possui ${mediaSizeMB.toFixed(1)}MB e ultrapassa o limite de 16MB da Meta/WhatsApp. O envio da mídia falharia. Faça um novo upload para comprimi-lo automaticamente.`,
        { duration: 6000, icon: '⚠️', style: { borderRadius: '16px', background: '#1e293b', color: '#fff', border: '1px solid rgba(239,68,68,0.4)' } }
      );
      return;
    }
    setUploadedFile({ name: media.filename, url: media.url, type: format });
    handleParamChange('HEADER_0', media.url);
    toast.success('Mídia selecionada! 🎯', {
      style: { borderRadius: '16px', background: '#1e293b', color: '#fff', border: '1px solid rgba(34,197,94,0.3)' }
    });
  };

  return (
    <div className="space-y-2">
      <div className="max-h-80 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
        {pastMedias.map((media) => (
          <div
            key={media.id}
            onClick={() => handleSelectMedia(media)}
            className={`flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer ${
              currentUrl === media.url
                ? 'bg-amber-500/10 border-amber-500/40 text-amber-400'
                : 'bg-black/30 border-slate-700/50 text-slate-300 hover:border-slate-600'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              {/* Mini thumbnail / preview para vídeos */}
              {format === 'VIDEO' ? (
                <video
                  src={media.url}
                  className="w-16 h-12 rounded-lg object-cover bg-black/50 border border-slate-700/50 flex-shrink-0"
                  muted
                  playsInline
                  preload="metadata"
                />
              ) : (
                <span className="text-xl flex-shrink-0">{mediaIcon}</span>
              )}
              
              <div className="min-w-0 flex-1">
                {editingMediaId === media.id ? (
                  <div className="flex items-center gap-1.5 mt-0.5" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="text"
                      className="px-2 py-1 bg-black/40 text-xs text-white border border-amber-500/50 rounded-lg outline-none w-full"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveRename(e, media.id);
                        if (e.key === 'Escape') setEditingMediaId(null);
                      }}
                    />
                    <button
                      type="button"
                      onClick={(e) => saveRename(e, media.id)}
                      className="p-1 text-green-400 bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 rounded-md transition-all text-[10px] cursor-pointer"
                      title="Salvar nome"
                    >
                      💾
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingMediaId(null);
                      }}
                      className="p-1 text-slate-400 bg-slate-500/10 hover:bg-slate-500/20 border border-slate-500/20 rounded-md transition-all text-[10px] cursor-pointer"
                      title="Cancelar"
                    >
                      ❌
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-black truncate">{media.filename}</p>
                      <button
                        type="button"
                        onClick={(e) => startRename(e, media)}
                        className="opacity-40 hover:opacity-100 p-0.5 text-slate-400 hover:text-white transition-opacity cursor-pointer"
                        title="Renomear mídia"
                      >
                        ✏️
                      </button>
                    </div>
                    <p className="text-[9px] text-slate-500 font-mono truncate mt-0.5">{media.url}</p>
                  </>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-3 ml-2 flex-shrink-0">
              <div className="text-right">
                <span className={`text-[10px] font-bold ${format === 'VIDEO' && (media.size / 1024 / 1024) > 16.0 ? 'text-red-400' : 'text-slate-500'}`}>
                  {(media.size / 1024 / 1024).toFixed(2)} MB
                </span>
                {format === 'VIDEO' && (media.size / 1024 / 1024) > 16.0 && (
                  <span className="block text-[8px] text-red-400 font-extrabold uppercase tracking-tight">
                    Excede 16MB
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setMediaToDelete(media);
                }}
                className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-all cursor-pointer"
                title="Deletar mídia"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Controles de Paginação */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-700/50 text-[11px] text-slate-400 font-medium">
        <div className="flex items-center gap-2">
          <span>Mostrar:</span>
          <select
            className="bg-black/40 border border-slate-700/80 rounded-lg px-2 py-1 text-white text-xs outline-none focus:border-amber-500/40 cursor-pointer"
            value={pageSize}
            onChange={handlePageSizeChange}
          >
            <option value="10">10 itens</option>
            <option value="20">20 itens</option>
            <option value="50">50 itens</option>
            <option value="100">100 itens</option>
          </select>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-2 py-1 bg-black/30 border border-slate-700/60 rounded-lg text-white hover:bg-black/60 disabled:opacity-30 disabled:hover:bg-black/30 font-bold transition-all cursor-pointer"
          >
            ◀
          </button>
          <span className="px-2">Pág. {currentPage} de {totalPages}</span>
          <button
            type="button"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="px-2 py-1 bg-black/30 border border-slate-700/60 rounded-lg text-white hover:bg-black/60 disabled:opacity-30 disabled:hover:bg-black/30 font-bold transition-all cursor-pointer"
          >
            ▶
          </button>
        </div>
      </div>
    </div>
  );
}
