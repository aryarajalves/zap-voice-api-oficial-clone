import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { FiX, FiTag, FiLoader } from 'react-icons/fi';
import useScrollLock from '../../../hooks/useScrollLock';

export default function BulkTagModal({
  isOpen,
  onClose,
  onConfirm,
  isSaving,
  count,
  selectAllPages,
}) {
  const [tagInput, setTagInput] = useState('');

  useScrollLock(isOpen);

  useEffect(() => {
    if (isOpen) setTagInput('');
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!tagInput.trim()) return;
    onConfirm(tagInput.trim());
  };

  return createPortal(
    <div className="fixed inset-0 z-[20000] flex items-center justify-center p-4 sm:p-6">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={onClose}
      />

      <div
        className="relative bg-white dark:bg-gray-800 rounded-3xl shadow-2xl max-w-md w-full overflow-hidden transform transition-all animate-in zoom-in-95 fade-in duration-300 border border-gray-100 dark:border-gray-700"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-2 w-full bg-gradient-to-r from-purple-600 via-fuchsia-600 to-pink-600" />

        <div className="p-8">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h3 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-xl">
                  <FiTag size={18} />
                </div>
                Etiquetar Contatos
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 font-medium">
                A etiqueta será adicionada a{' '}
                <strong className="text-gray-700 dark:text-gray-200">
                  {selectAllPages ? `todos os ${count?.toLocaleString('pt-BR')}` : count}
                </strong>{' '}
                contato{count !== 1 ? 's' : ''} selecionado{count !== 1 ? 's' : ''}, sem remover as etiquetas que já existem.
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
            >
              <FiX size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">
                Etiqueta(s) — separadas por vírgula
              </label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-purple-500 transition-colors">
                  <FiTag size={18} />
                </div>
                <input
                  autoFocus
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  placeholder="Ex: promocao-julho, vip"
                  className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all text-gray-900 dark:text-white font-medium"
                />
              </div>
            </div>

            <div className="flex justify-end gap-4 mt-8">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-3 rounded-2xl text-gray-700 dark:text-gray-300 font-bold hover:bg-gray-100 dark:hover:bg-gray-700 transition-all border border-gray-200 dark:border-gray-600 active:scale-95"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSaving || !tagInput.trim()}
                className="px-8 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white font-bold rounded-2xl shadow-xl shadow-purple-500/20 transition-all active:scale-95 flex items-center justify-center gap-2 min-w-[160px]"
              >
                {isSaving ? (
                  <>
                    <FiLoader className="animate-spin" />
                    Aplicando...
                  </>
                ) : (
                  <>
                    <FiTag />
                    Aplicar Etiqueta
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>,
    document.body
  );
}
