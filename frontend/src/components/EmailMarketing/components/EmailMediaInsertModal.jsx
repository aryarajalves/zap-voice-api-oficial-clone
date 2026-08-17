import React from 'react';
import { createPortal } from 'react-dom';
import { FiImage, FiVideo, FiPaperclip, FiX, FiUploadCloud, FiLink } from 'react-icons/fi';

export default function EmailMediaInsertModal({
  isOpen,
  onClose,
  mediaType,
  uploadLoading,
  mediaUrlInput,
  setMediaUrlInput,
  mediaLinkText,
  setMediaLinkText,
  fileInputRef,
  handleFileUpload,
  handleInsertUrl
}) {
  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[99990] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-md w-full border border-gray-100 dark:border-white/10 shadow-2xl space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-gray-700">
          <h3 className="text-base font-bold text-gray-800 dark:text-white flex items-center gap-2">
            {mediaType === 'image' && <><FiImage className="text-green-500" /> Inserir Imagem</>}
            {mediaType === 'video' && <><FiVideo className="text-purple-500" /> Inserir Vídeo</>}
            {mediaType === 'document' && <><FiPaperclip className="text-amber-500" /> Inserir Documento / PDF</>}
          </h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <FiX size={18} />
          </button>
        </div>

        {/* Abas: Upload do Computador OU Link de URL */}
        <div className="space-y-4">
          {/* Opção 1: Upload do Computador */}
          <div className="p-4 bg-gray-50 dark:bg-slate-900/60 rounded-xl border border-gray-200 dark:border-gray-700 text-center space-y-3">
            <FiUploadCloud size={32} className="mx-auto text-blue-500" />
            <div>
              <h4 className="text-xs font-bold text-gray-700 dark:text-gray-200">Upload do seu Computador</h4>
              <p className="text-[11px] text-gray-400 mt-0.5">
                {mediaType === 'image' && 'Selecione uma imagem (PNG, JPG, GIF, WebP - até 50 MB)'}
                {mediaType === 'video' && 'Selecione um vídeo (MP4, WebM, 3GP - até 250 MB)'}
                {mediaType === 'document' && 'Selecione um documento (PDF, DOCX, XLSX, ZIP - até 250 MB)'}
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileUpload}
              accept={
                mediaType === 'image' ? 'image/*' :
                mediaType === 'video' ? 'video/*' :
                '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar'
              }
              className="hidden"
              id="media-file-input"
            />
            <button
              type="button"
              disabled={uploadLoading}
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-xs transition-all shadow-sm disabled:opacity-50 inline-flex items-center gap-1.5"
            >
              <FiUploadCloud /> {uploadLoading ? 'Enviando...' : 'Selecionar Arquivo'}
            </button>
          </div>

          <div className="flex items-center gap-2 my-2">
            <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
            <span className="text-[10px] font-bold text-gray-400 uppercase">OU VIA LINK / URL</span>
            <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
          </div>

          {/* Opção 2: URL / Link Direto */}
          <form onSubmit={handleInsertUrl} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                URL Pública do Arquivo *
              </label>
              <div className="relative">
                <input
                  type="url"
                  placeholder="https://sua-cdn.com/arquivo.pdf"
                  value={mediaUrlInput}
                  onChange={e => setMediaUrlInput(e.target.value)}
                  className="w-full px-3 py-2 pl-9 bg-gray-50 dark:bg-slate-900 border border-gray-300 dark:border-gray-700 rounded-xl text-xs text-gray-800 dark:text-white"
                />
                <FiLink className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              </div>
            </div>

            {mediaType === 'document' && (
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Texto do Botão de Download
                </label>
                <input
                  type="text"
                  placeholder="Ex: Baixar E-book em PDF"
                  value={mediaLinkText}
                  onChange={e => setMediaLinkText(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-900 border border-gray-300 dark:border-gray-700 rounded-xl text-xs text-gray-800 dark:text-white"
                />
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition-all shadow-sm"
              >
                Inserir por URL
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>,
    document.body
  );
}
