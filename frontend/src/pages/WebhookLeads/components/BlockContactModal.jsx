import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { FiX, FiSlash, FiMoon, FiLoader } from 'react-icons/fi';
import useScrollLock from '../../../hooks/useScrollLock';

const HOUR_PRESETS = [
  { value: 24, label: '24h' },
  { value: 48, label: '48h' },
  { value: 72, label: '72h' },
  { value: 168, label: '7 dias' },
];

export default function BlockContactModal({
  isOpen,
  onClose,
  onConfirm, // (type: 'permanent' | 'resting', hours?: number) => void
  isSaving,
  count,
  selectAllPages,
  targetLabel, // nome/telefone do contato, quando é ação individual
}) {
  const [type, setType] = useState('permanent');
  const [hours, setHours] = useState(24);
  const [customHours, setCustomHours] = useState('');

  useScrollLock(isOpen);

  useEffect(() => {
    if (isOpen) {
      setType('permanent');
      setHours(24);
      setCustomHours('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const effectiveHours = customHours ? Number(customHours) : hours;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (type === 'resting' && (!effectiveHours || effectiveHours <= 0)) return;
    onConfirm(type, type === 'resting' ? effectiveHours : undefined);
  };

  return createPortal(
    <div className="fixed inset-0 z-[20000] flex items-center justify-center p-4 sm:p-6">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
      />

      <div
        className="relative bg-white dark:bg-gray-800 rounded-3xl shadow-2xl max-w-md w-full overflow-hidden transform transition-all animate-in zoom-in-95 fade-in duration-300 border border-gray-100 dark:border-gray-700"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-2 w-full bg-gradient-to-r from-red-600 via-rose-600 to-orange-500" />

        <div className="p-8">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h3 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2">
                <div className="p-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl">
                  <FiSlash size={18} />
                </div>
                Bloquear Contato{count !== 1 ? 's' : ''}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 font-medium">
                {targetLabel ? (
                  <>Aplicar bloqueio a <strong className="text-gray-700 dark:text-gray-200">{targetLabel}</strong>.</>
                ) : (
                  <>
                    Aplicar bloqueio a{' '}
                    <strong className="text-gray-700 dark:text-gray-200">
                      {selectAllPages ? `todos os ${count?.toLocaleString('pt-BR')}` : count}
                    </strong>{' '}
                    contato{count !== 1 ? 's' : ''} selecionado{count !== 1 ? 's' : ''}.
                  </>
                )}
                {' '}Contatos bloqueados não recebem disparos.
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
            {/* Tipo de bloqueio */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setType('permanent')}
                className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all text-center
                  ${type === 'permanent'
                    ? 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                    : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-red-300'
                  }`}
              >
                <FiSlash size={22} />
                <span className="text-sm font-bold">Bloqueio Permanente</span>
                <span className="text-[10px] leading-tight">Só sai bloqueado manualmente</span>
              </button>

              <button
                type="button"
                onClick={() => setType('resting')}
                className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all text-center
                  ${type === 'resting'
                    ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300'
                    : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-amber-300'
                  }`}
              >
                <FiMoon size={22} />
                <span className="text-sm font-bold">Repouso Temporário</span>
                <span className="text-[10px] leading-tight">Volta sozinho após o prazo</span>
              </button>
            </div>

            {/* Duração do repouso */}
            {type === 'resting' && (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">
                  Duração do repouso
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {HOUR_PRESETS.map(preset => (
                    <button
                      key={preset.value}
                      type="button"
                      onClick={() => { setHours(preset.value); setCustomHours(''); }}
                      className={`py-2 rounded-xl text-xs font-bold transition-colors
                        ${!customHours && hours === preset.value
                          ? 'bg-amber-500 text-white shadow-sm'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-amber-50 dark:hover:bg-amber-900/30'
                        }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    value={customHours}
                    onChange={(e) => setCustomHours(e.target.value)}
                    placeholder="Ou digite um número de horas personalizado"
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition-all text-gray-900 dark:text-white text-sm"
                  />
                </div>
              </div>
            )}

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
                disabled={isSaving || (type === 'resting' && (!effectiveHours || effectiveHours <= 0))}
                className="px-8 py-3 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-bold rounded-2xl shadow-xl shadow-red-500/20 transition-all active:scale-95 flex items-center justify-center gap-2 min-w-[160px]"
              >
                {isSaving ? (
                  <>
                    <FiLoader className="animate-spin" />
                    Bloqueando...
                  </>
                ) : (
                  <>
                    <FiSlash />
                    {type === 'resting' ? 'Colocar em Repouso' : 'Bloquear'}
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
