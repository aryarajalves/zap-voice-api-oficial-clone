import React from 'react';
import {
  FiCalendar, FiChevronDown, FiRefreshCw, FiClipboard, FiTrash2
} from 'react-icons/fi';
import { formatDateBR, LINE_OPTIONS } from '../utils/logHelpers';

export default function LogViewerControls({
  dateMenuRef,
  lineMenuRef,
  showDateMenu,
  setShowDateMenu,
  showLineMenu,
  setShowLineMenu,
  selectedDate,
  setSelectedDate,
  availableDates,
  lineCount,
  setLineCount,
  loading,
  fetchLogs,
  pasteMode,
  setPasteMode,
  hasProcessed,
  handleClear,
  handleClearServer,
  totalLines
}) {
  return (
    <div className="bg-white dark:bg-[#1e293b] rounded-2xl border border-gray-100 dark:border-white/5 p-4 flex flex-wrap items-center gap-3">
      {/* Seletor de dia */}
      <div className="relative" ref={dateMenuRef}>
        <button
          type="button"
          onClick={() => setShowDateMenu(v => !v)}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-xl border transition-colors ${
            selectedDate
              ? 'bg-indigo-600 text-white border-indigo-500'
              : 'border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5'
          }`}
        >
          <FiCalendar size={14} />
          {selectedDate ? formatDateBR(selectedDate) : 'Selecionar dia'}
          <FiChevronDown size={12} />
        </button>
        {showDateMenu && (
          <div className="absolute top-full left-0 mt-1 bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-white/10 rounded-xl shadow-xl z-50 overflow-hidden min-w-[160px]">
            <button
              type="button"
              onClick={() => { setSelectedDate(null); setShowDateMenu(false); }}
              className={`w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-gray-100 dark:hover:bg-white/10 ${!selectedDate ? 'font-bold text-blue-500' : 'text-gray-700 dark:text-gray-200'}`}
            >
              Últimas N linhas
            </button>
            <div className="border-t border-gray-100 dark:border-white/5" />
            {availableDates.length === 0 ? (
              <div className="px-4 py-3 text-xs text-gray-400">Nenhum dia disponível</div>
            ) : availableDates.map(d => (
              <button
                type="button"
                key={d}
                onClick={() => { setSelectedDate(d); setShowDateMenu(false); }}
                className={`w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-gray-100 dark:hover:bg-white/10 ${selectedDate === d ? 'font-bold text-indigo-400' : 'text-gray-700 dark:text-gray-200'}`}
              >
                {formatDateBR(d)}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Botão carregar */}
      <div className="flex items-center">
        <button
          type="button"
          onClick={() => fetchLogs(lineCount, selectedDate)}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-l-xl transition-colors disabled:opacity-50"
        >
          <FiRefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          {loading ? 'Carregando...' : selectedDate ? `Carregar ${formatDateBR(selectedDate)}` : 'Carregar Logs'}
        </button>
        {!selectedDate ? (
          <div className="relative" ref={lineMenuRef}>
            <button
              type="button"
              onClick={() => setShowLineMenu(v => !v)}
              className="flex items-center gap-1 px-3 py-2 bg-blue-700 hover:bg-blue-800 text-white text-sm font-bold rounded-r-xl border-l border-blue-500 transition-colors"
            >
              {lineCount.toLocaleString()} <FiChevronDown size={13} />
            </button>
            {showLineMenu && (
              <div className="absolute top-full right-0 mt-1 bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-white/10 rounded-xl shadow-xl z-50 overflow-hidden min-w-[130px]">
                {LINE_OPTIONS.map(n => (
                  <button
                    type="button"
                    key={n}
                    onClick={() => { setLineCount(n); setShowLineMenu(false); fetchLogs(n, null); }}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-white/10 transition-colors ${n === lineCount ? 'font-bold text-blue-500' : 'text-gray-700 dark:text-gray-200'}`}
                  >
                    {n.toLocaleString()} linhas
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="w-3 h-9 bg-blue-600 rounded-r-xl" />
        )}
      </div>

      <span className="text-gray-300 dark:text-gray-600 select-none">|</span>

      <button
        type="button"
        onClick={() => setPasteMode(v => !v)}
        className={`flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-xl border transition-colors ${
          pasteMode ? 'bg-gray-700 text-white border-gray-600' : 'border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5'
        }`}
      >
        <FiClipboard size={14} /> Colar manualmente
      </button>

      {hasProcessed && (
        <button
          type="button"
          onClick={handleClear}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-gray-400 hover:text-white hover:bg-white/10 rounded-xl transition-all"
        >
          <FiTrash2 size={13} /> Limpar
        </button>
      )}

      <button
        type="button"
        onClick={handleClearServer}
        className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-red-400 hover:text-white hover:bg-red-500/20 rounded-xl transition-all ml-auto"
      >
        <FiTrash2 size={13} /> Apagar log no servidor
      </button>

      {totalLines > 0 && (
        <span className="text-xs text-gray-400 whitespace-nowrap">
          {totalLines.toLocaleString()} linhas totais
        </span>
      )}
    </div>
  );
}
