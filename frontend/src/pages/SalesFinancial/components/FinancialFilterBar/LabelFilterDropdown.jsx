import React from 'react';
import { useDropdownOutsideClick } from './useDropdownOutsideClick';

export default function LabelFilterDropdown({
  selectedLabels,
  setSelectedLabels,
  allLabels = [],
}) {
  const { isOpen, setIsOpen, dropdownRef } = useDropdownOutsideClick();

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-500 dark:text-gray-400 font-medium shrink-0">Etiqueta do Contato:</span>
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(o => !o)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all min-w-[180px] justify-between cursor-pointer ${
            selectedLabels.length > 0
              ? 'bg-blue-500/10 text-blue-400 border-blue-500/40 font-bold'
              : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
          }`}
        >
          <span className="truncate">
            {selectedLabels.length === 0
              ? 'Todas as Etiquetas'
              : selectedLabels.length === 1
                ? selectedLabels[0]
                : `${selectedLabels.length} etiquetas`}
          </span>
          <svg className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {isOpen && (
          <div className="absolute z-50 top-full mt-1 left-0 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-1 max-h-64 overflow-y-auto overflow-x-hidden">
              {(!allLabels || allLabels.length === 0) ? (
                <div className="p-3 text-xs text-gray-400 text-center">Nenhuma etiqueta cadastrada</div>
              ) : (
                allLabels.map(lbl => {
                  const checked = selectedLabels.includes(lbl);
                  return (
                    <button
                      key={lbl}
                      onClick={() => {
                        setSelectedLabels(prev =>
                          prev.includes(lbl)
                            ? prev.filter(l => l !== lbl)
                            : [...prev, lbl]
                        );
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all text-left truncate cursor-pointer"
                    >
                      <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all ${checked ? 'bg-blue-500 border-blue-500' : 'border-gray-300 dark:border-gray-600'}`}>
                        {checked && <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                      </span>
                      <span className="truncate">{lbl}</span>
                    </button>
                  );
                })
              )}
            </div>
            {selectedLabels.length > 0 && (
              <div className="border-t border-gray-100 dark:border-gray-700 p-1">
                <button
                  onClick={() => { setSelectedLabels([]); setIsOpen(false); }}
                  className="w-full px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all text-left cursor-pointer"
                >
                  Limpar seleção de etiquetas
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
