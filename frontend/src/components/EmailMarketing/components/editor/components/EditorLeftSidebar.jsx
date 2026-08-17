import React from 'react';
import {
  FiType, FiImage, FiExternalLink, FiVideo, FiColumns, FiMinus,
  FiZap, FiDroplet, FiLayout, FiSliders
} from 'react-icons/fi';
import { CONTACT_VARIABLES } from '../utils/emailHtmlParsers';

export default function EditorLeftSidebar({
  activeTab,
  setActiveTab,
  onAddBlock,
  onInsertVariable,
  globalStyles,
  setGlobalStyles
}) {
  return (
    <div className="w-full lg:w-72 bg-slate-900 border-r border-white/10 flex flex-col shrink-0">
      {/* Abas Esquerda */}
      <div className="flex border-b border-white/10 bg-slate-950/50">
        <button
          type="button"
          onClick={() => setActiveTab('blocks')}
          className={`flex-1 py-3 text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'blocks' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400 hover:text-white'
          }`}
        >
          <FiLayout size={14} /> Blocos Visual
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('styles')}
          className={`flex-1 py-3 text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'styles' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400 hover:text-white'
          }`}
        >
          <FiSliders size={14} /> Fundo & Estilos
        </button>
      </div>

      <div className="p-4 overflow-y-auto flex-1 space-y-4">
        {activeTab === 'blocks' ? (
          <>
            <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2">
              Clique para Adicionar Bloco:
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onAddBlock('text')}
                className="p-3 bg-slate-800 hover:bg-slate-700 rounded-xl border border-white/10 flex flex-col items-center gap-1.5 text-xs font-semibold transition-all hover:scale-105"
              >
                <FiType className="text-blue-400" size={18} /> Texto
              </button>
              <button
                type="button"
                onClick={() => onAddBlock('image')}
                className="p-3 bg-slate-800 hover:bg-slate-700 rounded-xl border border-white/10 flex flex-col items-center gap-1.5 text-xs font-semibold transition-all hover:scale-105"
              >
                <FiImage className="text-green-400" size={18} /> Imagem
              </button>
              <button
                type="button"
                onClick={() => onAddBlock('button')}
                className="p-3 bg-slate-800 hover:bg-slate-700 rounded-xl border border-white/10 flex flex-col items-center gap-1.5 text-xs font-semibold transition-all hover:scale-105"
              >
                <FiExternalLink className="text-purple-400" size={18} /> Botão CTA
              </button>
              <button
                type="button"
                onClick={() => onAddBlock('columns_2')}
                className="p-3 bg-slate-800 hover:bg-slate-700 rounded-xl border border-white/10 flex flex-col items-center gap-1.5 text-xs font-semibold transition-all hover:scale-105"
              >
                <FiColumns className="text-amber-400" size={18} /> 2 Colunas
              </button>
              <button
                type="button"
                onClick={() => onAddBlock('divider')}
                className="p-3 bg-slate-800 hover:bg-slate-700 rounded-xl border border-white/10 flex flex-col items-center gap-1.5 text-xs font-semibold transition-all hover:scale-105"
              >
                <FiMinus className="text-gray-400" size={18} /> Divisor
              </button>
              <button
                type="button"
                onClick={() => onAddBlock('video')}
                className="p-3 bg-slate-800 hover:bg-slate-700 rounded-xl border border-white/10 flex flex-col items-center gap-1.5 text-xs font-semibold transition-all hover:scale-105"
              >
                <FiVideo className="text-red-400" size={18} /> Vídeo
              </button>
            </div>

            {/* Variáveis do Lead */}
            <div className="pt-4 border-t border-white/10 space-y-2">
              <div className="text-[11px] font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1">
                <FiZap size={12} /> Variáveis do Lead
              </div>
              <div className="flex flex-wrap gap-1">
                {CONTACT_VARIABLES.map(v => (
                  <button
                    key={v.code}
                    type="button"
                    onClick={() => onInsertVariable(v.code)}
                    className="px-2 py-1 bg-slate-800 hover:bg-blue-600 text-gray-300 hover:text-white rounded-lg text-[11px] font-mono transition-all border border-white/5"
                  >
                    {v.code}
                  </button>
                ))}
              </div>
            </div>
          </>
        ) : (
          /* Configurações de Estilo Global (Cor de Fundo) */
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-300 mb-1 flex items-center gap-1.5">
                <FiDroplet className="text-red-400" /> Cor de Fundo Geral (Externa)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={globalStyles.outerBgColor}
                  onChange={e => setGlobalStyles({ ...globalStyles, outerBgColor: e.target.value })}
                  className="w-8 h-8 rounded cursor-pointer bg-transparent border-0"
                />
                <input
                  type="text"
                  value={globalStyles.outerBgColor}
                  onChange={e => setGlobalStyles({ ...globalStyles, outerBgColor: e.target.value })}
                  className="flex-1 px-3 py-1.5 bg-slate-800 border border-white/10 rounded-lg text-xs font-mono text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-300 mb-1 flex items-center gap-1.5">
                <FiDroplet className="text-blue-400" /> Cor do Cartão Central
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={globalStyles.cardBgColor}
                  onChange={e => setGlobalStyles({ ...globalStyles, cardBgColor: e.target.value })}
                  className="w-8 h-8 rounded cursor-pointer bg-transparent border-0"
                />
                <input
                  type="text"
                  value={globalStyles.cardBgColor}
                  onChange={e => setGlobalStyles({ ...globalStyles, cardBgColor: e.target.value })}
                  className="flex-1 px-3 py-1.5 bg-slate-800 border border-white/10 rounded-lg text-xs font-mono text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-300 mb-1">
                Largura do Conteúdo: {globalStyles.cardWidth}px
              </label>
              <input
                type="range"
                min="480"
                max="800"
                step="10"
                value={globalStyles.cardWidth}
                onChange={e => setGlobalStyles({ ...globalStyles, cardWidth: Number(e.target.value) })}
                className="w-full accent-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-300 mb-1">
                Espaçamento Interno (Padding): {globalStyles.padding}px
              </label>
              <input
                type="range"
                min="12"
                max="48"
                step="4"
                value={globalStyles.padding}
                onChange={e => setGlobalStyles({ ...globalStyles, padding: Number(e.target.value) })}
                className="w-full accent-blue-500"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
