import React from 'react';
import { createPortal } from 'react-dom';
import {
  FiMonitor, FiMinimize2, FiEye, FiCode, FiBold, FiItalic,
  FiList, FiAlignCenter, FiDroplet, FiExternalLink, FiImage,
  FiVideo, FiPaperclip
} from 'react-icons/fi';
import { formatTextToHtml } from '../hooks/useEmailTemplates';

export default function EmailFullscreenEditorModal({
  isOpen,
  onClose,
  viewMode,
  setViewMode,
  formData,
  handleSave,
  editorActions
}) {
  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[99995] flex flex-col bg-slate-950 text-white animate-fade-in p-6 w-screen h-screen overflow-hidden">
      {/* Header da Tela Cheia */}
      <div className="flex items-center justify-between pb-4 border-slate-800 border-b shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600/20 border border-blue-500/40 rounded-xl flex items-center justify-center text-blue-400">
            <FiMonitor size={22} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              Editor de E-mail em Tela Cheia (100% do Monitor)
            </h3>
            <p className="text-xs text-gray-400">
              Visualização completa em tela cheia para texto, mídias, vídeos e imagens.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-gray-200 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border border-slate-700"
          >
            <FiMinimize2 size={16} /> Restaurar Tamanho
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-blue-500/20 flex items-center gap-2"
          >
            Salvar Template
          </button>
        </div>
      </div>

      {/* Barra Superior de Controles na Tela Cheia */}
      <div className="flex flex-wrap items-center justify-between gap-3 my-4 p-3 bg-slate-900/90 rounded-2xl border border-white/10 shrink-0">
        <div className="flex items-center gap-3">
          {/* Modos de Visualização */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setViewMode('visual')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                viewMode === 'visual'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <FiEye size={14} /> Visual (Renderizado)
            </button>
            <button
              type="button"
              onClick={() => setViewMode('code')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                viewMode === 'code'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <FiCode size={14} /> Código HTML
            </button>
          </div>

          {/* Botões de Formatação */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => editorActions.applyTextFormat('bold')}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-black rounded-lg text-xs"
              title="Negrito"
            >
              <FiBold size={14} />
            </button>
            <button
              type="button"
              onClick={() => editorActions.applyTextFormat('italic')}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white italic rounded-lg text-xs"
              title="Itálico"
            >
              <FiItalic size={14} />
            </button>
            <button
              type="button"
              onClick={() => editorActions.applyTextFormat('list')}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs flex items-center gap-1 font-bold"
              title="Inserir Lista com Bolinhas"
            >
              <FiList size={14} /> Lista
            </button>
            <button
              type="button"
              onClick={() => editorActions.applyTextFormat('center', editorActions.textColor)}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs flex items-center gap-1 font-bold"
              title="Centralizar Bloco / Número"
            >
              <FiAlignCenter size={14} /> Centralizar
            </button>

            <div className="flex items-center gap-1.5 bg-slate-950 px-2 py-1 rounded-xl border border-slate-800 ml-1">
              <FiDroplet size={14} className="text-gray-400" />
              <input
                type="color"
                value={editorActions.textColor}
                onChange={(e) => {
                  editorActions.setTextColor(e.target.value);
                  editorActions.applyTextFormat('color', e.target.value);
                }}
                className="w-5 h-5 rounded cursor-pointer bg-transparent border-0"
                title="Escolher Cor Personalizada do Texto"
              />
            </div>
          </div>
        </div>

        {/* Mídias & Botão CTA na Tela Cheia */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => editorActions.setIsButtonModalOpen(true)}
            className="px-3 py-1.5 bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 text-xs font-bold rounded-xl transition-all border border-blue-500/30 flex items-center gap-1.5"
          >
            <FiExternalLink size={14} /> Botão CTA
          </button>
          <button
            type="button"
            onClick={() => { editorActions.setMediaType('image'); editorActions.setIsMediaModalOpen(true); }}
            className="px-3 py-1.5 bg-green-500/20 text-green-400 hover:bg-green-500/30 text-xs font-bold rounded-xl transition-all border border-green-500/30 flex items-center gap-1.5"
          >
            <FiImage size={14} /> Imagem
          </button>
          <button
            type="button"
            onClick={() => { editorActions.setMediaType('video'); editorActions.setIsMediaModalOpen(true); }}
            className="px-3 py-1.5 bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 text-xs font-bold rounded-xl transition-all border border-purple-500/30 flex items-center gap-1.5"
          >
            <FiVideo size={14} /> Vídeo
          </button>
          <button
            type="button"
            onClick={() => { editorActions.setMediaType('document'); editorActions.setIsMediaModalOpen(true); }}
            className="px-3 py-1.5 bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 text-xs font-bold rounded-xl transition-all border border-amber-500/30 flex items-center gap-1.5"
          >
            <FiPaperclip size={14} /> Documento
          </button>
        </div>
      </div>

      {/* Canvas de Edição / Visualização tomando 100% da Altura Restante */}
      <div className="flex-1 min-h-0 bg-white dark:bg-slate-900 rounded-2xl border-2 border-blue-500/40 p-8 overflow-y-auto text-slate-800 dark:text-white shadow-2xl">
        {viewMode === 'visual' ? (
          <div className="max-w-4xl mx-auto space-y-4">
            <div className="text-xs font-bold uppercase tracking-wider text-blue-500 border-b border-gray-200 dark:border-gray-800 pb-2 mb-4">
              👁️ PRÉ-VISUALIZAÇÃO EM TELA CHEIA (100% DA RESOLUÇÃO DO COMPUTADOR)
            </div>
            <div
              className="prose dark:prose-invert max-w-none text-base leading-relaxed"
              dangerouslySetInnerHTML={{ __html: formatTextToHtml(formData.body_html) }}
            />
          </div>
        ) : (
          <textarea
            ref={editorActions.bodyRef}
            className="w-full h-full p-4 bg-transparent border-0 font-mono text-base resize-none focus:outline-none text-slate-800 dark:text-white leading-relaxed"
            placeholder="Escreva seu conteúdo em texto simples com quebras de linha Enter..."
            value={formData.body_html}
            onChange={e => editorActions.handleInputChange('body_html', e)}
            onKeyDown={e => editorActions.handleKeyDown('body_html', e)}
          />
        )}
      </div>
    </div>,
    document.body
  );
}
