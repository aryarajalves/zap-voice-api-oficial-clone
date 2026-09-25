import React from 'react';
import { createPortal } from 'react-dom';
import { FiTag, FiX, FiCheck } from 'react-icons/fi';

const PRESET_COLORS = [
  { name: 'Azul', value: '#3B82F6' },
  { name: 'Roxo', value: '#8B5CF6' },
  { name: 'Verde', value: '#10B981' },
  { name: 'Rosa', value: '#EC4899' },
  { name: 'Amarelo', value: '#F59E0B' },
  { name: 'Laranja', value: '#F97316' },
  { name: 'Vermelho', value: '#EF4444' },
  { name: 'Ciano', value: '#06B6D4' },
  { name: 'Índigo', value: '#6366F1' },
  { name: 'Esmeralda', value: '#059669' }
];

export default function CreateLabelModal({
  isOpen,
  tagName,
  tagColor,
  onChangeName,
  onChangeColor,
  onClose,
  onConfirm,
  isSaving = false,
  targetCategory = 'chat'
}) {
  if (!isOpen) return null;

  const isChat = targetCategory === 'chat';
  const nameLength = tagName ? tagName.length : 0;
  const isLimitReached = nameLength >= 25;

  const modalContent = (
    <div
      className="fixed inset-0 z-[999999] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 select-none"
      onClick={(e) => e.stopPropagation()}
    >
      <div
        className="relative z-10 bg-slate-900 border border-slate-700/90 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 ring-1 ring-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/80 bg-slate-950/40">
          <div className="flex items-center gap-2 font-bold text-white text-sm">
            <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <FiTag size={16} />
            </div>
            <div>
              <h3>Criar Nova Etiqueta</h3>
              <p className="text-[11px] text-slate-400 font-normal">
                {isChat ? 'Etiqueta para conversas no Chat' : 'Etiqueta para a Aba de Contatos'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            title="Fechar"
          >
            <FiX size={18} />
          </button>
        </div>

        {/* Corpo */}
        <div className="p-6 space-y-4 font-sans">
          {/* Nome da etiqueta */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                Nome da Etiqueta
              </label>
              <span className={`text-[11px] font-semibold ${isLimitReached ? 'text-amber-400' : 'text-slate-400'}`}>
                {nameLength}/25 caracteres
              </span>
            </div>
            <input
              type="text"
              maxLength={25}
              value={tagName}
              onChange={(e) => onChangeName(e.target.value.slice(0, 25))}
              placeholder="Digite o nome da etiqueta..."
              autoFocus
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 text-white text-xs rounded-xl focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition font-sans"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && tagName.trim()) {
                  e.preventDefault();
                  onConfirm();
                } else if (e.key === 'Escape') {
                  onClose();
                }
              }}
            />
            {isLimitReached && (
              <p className="text-[10px] text-amber-400 mt-1">
                Limite máximo de 25 caracteres atingido.
              </p>
            )}
          </div>

          {/* Seleção de cor */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              Selecione a Cor da Etiqueta
            </label>
            <div className="flex flex-wrap gap-2 items-center">
              {PRESET_COLORS.map((preset) => {
                const isSelected = tagColor?.toLowerCase() === preset.value.toLowerCase();
                return (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => onChangeColor(preset.value)}
                    title={preset.name}
                    className={`w-7 h-7 rounded-full transition-all relative cursor-pointer flex items-center justify-center ${
                      isSelected
                        ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-900 scale-110 shadow-lg'
                        : 'opacity-85 hover:opacity-100 hover:scale-105'
                    }`}
                    style={{ backgroundColor: preset.value }}
                  >
                    {isSelected && <FiCheck size={12} className="text-white drop-shadow-md stroke-[3]" />}
                  </button>
                );
              })}

              {/* Seletor de cor personalizada */}
              <div
                className="relative w-7 h-7 rounded-full overflow-hidden border border-slate-700 hover:scale-105 transition-all cursor-pointer shadow-sm"
                title="Escolher cor personalizada"
              >
                <input
                  type="color"
                  value={tagColor || '#3B82F6'}
                  onChange={(e) => onChangeColor(e.target.value)}
                  className="absolute -inset-2 cursor-pointer w-12 h-12 p-0 border-0 opacity-0"
                />
                <div
                  className="w-full h-full"
                  style={{ backgroundColor: tagColor || '#3B82F6' }}
                />
              </div>
            </div>
          </div>

          {/* Pré-visualização */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1.5">
              Pré-visualização:
            </label>
            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 flex items-center gap-2">
              <span
                style={{
                  color: tagColor || '#3B82F6',
                  borderColor: `${tagColor || '#3B82F6'}50`,
                  backgroundColor: `${tagColor || '#3B82F6'}20`
                }}
                className="text-xs px-2.5 py-1 rounded-lg inline-flex items-center gap-1.5 border font-semibold break-words max-w-full shadow-xs"
              >
                <FiTag size={11} />
                <span>{tagName.trim() || 'Nova Etiqueta'}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Rodapé */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-800/80 bg-slate-950/40">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="px-4 py-2 rounded-xl text-slate-300 text-xs font-semibold hover:bg-slate-800 transition cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            id="btn-confirm-create-label"
            disabled={isSaving || !tagName.trim()}
            onClick={onConfirm}
            className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold transition flex items-center gap-2 cursor-pointer shadow-lg shadow-blue-600/20"
          >
            {isSaving ? 'Salvando...' : 'Criar e Selecionar'}
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined'
    ? createPortal(modalContent, document.body)
    : modalContent;
}
