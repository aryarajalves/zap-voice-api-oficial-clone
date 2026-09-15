import React, { useState, useRef, useEffect } from 'react';
import { FiMessageSquare, FiChevronDown, FiX } from 'react-icons/fi';

export const INTERACTION_PRESETS = [
  { value: 'any',        label: '💬 Já interagiu alguma vez' },
  { value: 'last7',      label: '⚡ Últimos 7 dias' },
  { value: 'last14',     label: '⚡ Últimos 14 dias' },
  { value: 'last30',     label: '⚡ Últimos 30 dias' },
  { value: 'this_month', label: '📅 Este mês' },
  { value: 'last_month', label: '📅 Mês passado' },
  { value: 'never',      label: '🚫 Nunca interagiu' },
];

export function getInteractionPresetLabel(preset) {
  if (!preset) return null;
  const found = INTERACTION_PRESETS.find(p => p.value === preset);
  if (found) return found.label;
  if (preset === 'custom') return '📆 Período personalizado';
  return null;
}

export default function ChatInteractionFilter({
  interactionPreset,
  setInteractionPreset,
  customInteractionFrom,
  setCustomInteractionFrom,
  customInteractionTo,
  setCustomInteractionTo,
  handleClearInteractionFilters,
}) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);
  const activeLabel = getInteractionPresetLabel(interactionPreset);
  const hasFilter = !!interactionPreset;

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const handleSelectPreset = (val) => {
    setInteractionPreset(val);
    if (val !== 'custom') {
      setOpen(false);
    }
  };

  const handleClear = () => {
    if (handleClearInteractionFilters) {
      handleClearInteractionFilters();
    } else {
      setInteractionPreset('');
      if (setCustomInteractionFrom) setCustomInteractionFrom('');
      if (setCustomInteractionTo) setCustomInteractionTo('');
    }
    setOpen(false);
  };

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <button
        id="contacts-interaction-filter-btn"
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs font-medium border transition-all outline-none cursor-pointer ${
          hasFilter
            ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-200 dark:shadow-blue-900/40'
            : 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-blue-400'
        }`}
      >
        <span className="flex items-center gap-1.5 truncate">
          <FiMessageSquare size={14} className="flex-shrink-0" />
          <span className="truncate">
            {activeLabel || 'Todas as Interações'}
          </span>
        </span>
        <div className="flex items-center gap-1 flex-shrink-0">
          {hasFilter && (
            <span
              role="button"
              tabIndex={0}
              id="contacts-interaction-clear-inline-btn"
              onClick={(e) => {
                e.stopPropagation();
                handleClear();
              }}
              className="text-white/80 hover:text-white transition-colors p-0.5"
              title="Limpar filtro de interação"
            >
              <FiX size={12} />
            </span>
          )}
          <FiChevronDown
            size={14}
            className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          />
        </div>
      </button>

      {open && (
        <div
          id="contacts-interaction-dropdown"
          className="absolute top-full left-0 right-0 mt-2 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl overflow-hidden animate-fadeIn"
          style={{ minWidth: '260px' }}
        >
          <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              Última mensagem enviada
            </span>
            {hasFilter && (
              <button
                id="contacts-interaction-clear-btn"
                type="button"
                onClick={handleClear}
                className="text-[10px] text-red-400 hover:text-red-600 font-semibold flex items-center gap-1 transition-colors bg-transparent border-none cursor-pointer"
              >
                <FiX size={11} /> Limpar
              </button>
            )}
          </div>

          <div className="p-2 space-y-1">
            <button
              id="contacts-interaction-preset-all"
              type="button"
              onClick={() => handleSelectPreset('')}
              className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                !interactionPreset
                  ? 'bg-blue-600 text-white font-semibold'
                  : 'hover:bg-blue-50 dark:hover:bg-blue-900/20 text-gray-700 dark:text-gray-200'
              }`}
            >
              🌐 Todas as Interações
            </button>

            {INTERACTION_PRESETS.map(preset => (
              <button
                key={preset.value}
                id={`contacts-interaction-preset-${preset.value}`}
                type="button"
                onClick={() => handleSelectPreset(preset.value)}
                className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  interactionPreset === preset.value
                    ? 'bg-blue-600 text-white font-semibold'
                    : 'hover:bg-blue-50 dark:hover:bg-blue-900/20 text-gray-700 dark:text-gray-200'
                }`}
              >
                {preset.label}
              </button>
            ))}

            <div className="pt-1 border-t border-gray-100 dark:border-gray-700">
              <button
                id="contacts-interaction-preset-custom"
                type="button"
                onClick={() => handleSelectPreset('custom')}
                className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  interactionPreset === 'custom'
                    ? 'bg-blue-600 text-white font-semibold'
                    : 'hover:bg-blue-50 dark:hover:bg-blue-900/20 text-gray-700 dark:text-gray-200'
                }`}
              >
                📆 Período personalizado...
              </button>

              {interactionPreset === 'custom' && (
                <div className="p-2 mt-1 bg-gray-50 dark:bg-gray-900/60 rounded-xl space-y-2 border border-gray-200 dark:border-gray-700">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                        De
                      </label>
                      <input
                        id="contacts-interaction-from-input"
                        type="date"
                        value={customInteractionFrom || ''}
                        onChange={(e) => setCustomInteractionFrom?.(e.target.value)}
                        className="w-full px-2 py-1 text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                        Até
                      </label>
                      <input
                        id="contacts-interaction-to-input"
                        type="date"
                        value={customInteractionTo || ''}
                        onChange={(e) => setCustomInteractionTo?.(e.target.value)}
                        className="w-full px-2 py-1 text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                  </div>
                  <button
                    id="contacts-interaction-apply-btn"
                    type="button"
                    onClick={() => setOpen(false)}
                    disabled={!customInteractionFrom && !customInteractionTo}
                    className="w-full py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    Aplicar
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
