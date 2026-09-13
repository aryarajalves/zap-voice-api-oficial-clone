import React from 'react';
import { STATUS_FILTER_OPTIONS } from './filterOptions';
import { useDropdownOutsideClick } from './useDropdownOutsideClick';

export default function StatusFilterDropdown({
  statuses,
  setStatuses,
}) {
  const { isOpen, setIsOpen, dropdownRef } = useDropdownOutsideClick();

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-500 dark:text-gray-400 font-medium shrink-0">Status:</span>
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(o => !o)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all min-w-[160px] justify-between cursor-pointer"
        >
          <span>
            {statuses.length === 0
              ? 'Todos os Status'
              : statuses.length === 1
                ? STATUS_FILTER_OPTIONS.find(o => o.value === statuses[0])?.label
                : `${statuses.length} status`}
          </span>
          <svg className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {isOpen && (
          <div className="absolute z-50 top-full mt-1 left-0 w-52 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl">
            <div className="p-1">
              {STATUS_FILTER_OPTIONS.map(opt => {
                const checked = statuses.includes(opt.value);
                return (
                  <button
                    key={opt.value}
                    onClick={() => setStatuses(prev => prev.includes(opt.value) ? prev.filter(s => s !== opt.value) : [...prev, opt.value])}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all text-left cursor-pointer"
                  >
                    <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all ${checked ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300 dark:border-gray-600'}`}>
                      {checked && <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                    </span>
                    {opt.label}
                  </button>
                );
              })}
            </div>
            {statuses.length > 0 && (
              <div className="border-t border-gray-100 dark:border-gray-700 p-1">
                <button
                  onClick={() => { setStatuses([]); setIsOpen(false); }}
                  className="w-full px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all text-left cursor-pointer"
                >
                  Limpar seleção
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      {statuses.length > 0 && (
        <div className="flex gap-1 flex-wrap">
          {statuses.map(s => (
            <span key={s} className="flex items-center gap-1 px-2 py-0.5 bg-indigo-500/10 text-indigo-400 rounded-md text-[10px] font-semibold">
              {STATUS_FILTER_OPTIONS.find(o => o.value === s)?.label}
              <button onClick={() => setStatuses(prev => prev.filter(x => x !== s))} className="hover:text-indigo-200 cursor-pointer">×</button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
