import React from 'react';
import { FiX, FiRefreshCw, FiSend } from 'react-icons/fi';

export default function MediaPreviewModal({
    mediaPreview,
    previewCaption,
    setPreviewCaption,
    isSendingMedia,
    onClose,
    onSend
}) {
    if (!mediaPreview) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className="bg-[#1e293b] border border-white/10 rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden flex flex-col text-gray-100">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
                    <h3 className="text-white font-bold text-base flex items-center gap-2">
                        {mediaPreview.messageType === 'image' ? '🖼️ Enviar Imagem' : '🎬 Enviar Vídeo'}
                    </h3>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all"
                    >
                        <FiX size={18} />
                    </button>
                </div>

                {/* Preview */}
                <div className="p-5 flex justify-center bg-black/20">
                    {mediaPreview.messageType === 'image' ? (
                        <img
                            src={mediaPreview.localUrl}
                            alt="Preview"
                            className="max-h-80 max-w-full rounded-xl object-contain"
                        />
                    ) : (
                        <video
                            src={mediaPreview.localUrl}
                            controls
                            className="max-h-80 max-w-full rounded-xl"
                        />
                    )}
                </div>

                {/* Legenda */}
                <div className="px-5 py-4 space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">
                            Legenda (opcional)
                        </label>
                        <input
                            type="text"
                            value={previewCaption}
                            onChange={(e) => setPreviewCaption(e.target.value)}
                            placeholder="Adicione uma legenda para a mídia..."
                            className="w-full px-4 py-2.5 bg-white/5 text-white text-sm rounded-xl border border-white/10 focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder-gray-500"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !isSendingMedia) {
                                    onSend();
                                }
                            }}
                            autoFocus
                        />
                    </div>
                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2.5 rounded-xl border border-white/10 text-gray-400 hover:text-white hover:bg-white/5 text-sm font-semibold transition-all"
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            disabled={isSendingMedia}
                            onClick={onSend}
                            className="flex-1 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {isSendingMedia ? (
                                <><FiRefreshCw className="animate-spin" size={14} /> Enviando...</>
                            ) : (
                                <><FiSend size={14} /> Enviar</>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
