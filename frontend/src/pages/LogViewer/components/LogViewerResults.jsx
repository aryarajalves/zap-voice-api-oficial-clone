import React, { useMemo } from 'react';
import {
  FiCopy, FiDownload, FiTrash2, FiAlertTriangle, FiFilter,
  FiCheckSquare, FiSquare
} from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { QUICK_FILTERS, formatDateBR } from '../utils/logHelpers';
import VirtualLogList from './VirtualLogList';

export default function LogViewerResults({
  hasProcessed,
  parsed,
  filtered,
  selectedDate,
  activeQuickFilters,
  selectedIdx,
  toggleSelect,
  clearSelection,
  setSelectedIdx,
  deleteSelected,
  deleting,
  truncated,
  totalLines,
  filterTags,
  filterText,
  setDetailLine,
  currentPage,
  totalPages,
  goToPage,
  loading
}) {
  if (!hasProcessed) return null;

  const allFilteredSelected = filtered.length > 0 && filtered.every(l => selectedIdx.has(l.idx));

  const toggleSelectAllFiltered = () => {
    if (allFilteredSelected) {
      clearSelection();
    } else {
      setSelectedIdx(new Set(filtered.map(l => l.idx)));
    }
  };

  const counts = useMemo(() => {
    const c = { CRITICAL: 0, ERROR: 0, WARNING: 0, INFO: 0, DEBUG: 0 };
    filtered.forEach(l => {
      const lvl = l.level === 'WARN' ? 'WARNING' : l.level === 'FATAL' ? 'CRITICAL' : l.level;
      if (lvl && c[lvl] !== undefined) c[lvl]++;
    });
    return c;
  }, [filtered]);

  const copyFiltered = () => {
    navigator.clipboard.writeText(filtered.map(l => l.raw).join('\n'));
    toast.success(`${filtered.length.toLocaleString()} linha${filtered.length === 1 ? '' : 's'} copiada${filtered.length === 1 ? '' : 's'}!`);
  };

  const downloadFiltered = () => {
    const label = activeQuickFilters.length === 1
      ? QUICK_FILTERS.find(f => f.id === activeQuickFilters[0])?.id
      : selectedDate || 'recentes';
    const blob = new Blob([filtered.map(l => l.raw).join('\n')], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `logs_${label}_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
  };

  return (
    <div className="bg-white dark:bg-[#1e293b] rounded-2xl border border-gray-100 dark:border-white/5 overflow-hidden">
      <div className="px-5 py-3 bg-gray-50 dark:bg-white/[0.03] border-b border-gray-100 dark:border-white/5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs font-black text-gray-400 uppercase tracking-widest">
            {filtered.length.toLocaleString()} / {parsed.length.toLocaleString()} linhas
            {selectedDate && <span className="ml-2 text-indigo-400">· {formatDateBR(selectedDate)}</span>}
          </span>
          {activeQuickFilters.map(id => {
            const f = QUICK_FILTERS.find(x => x.id === id);
            return f ? <span key={id} className={`px-2 py-0.5 rounded-full text-[9px] font-black ${f.color}`}>{f.emoji} {f.label}</span> : null;
          })}
          <div className="flex items-center gap-1.5">
            {counts.CRITICAL > 0 && <span className="px-1.5 py-0.5 text-[9px] font-black rounded bg-purple-700 text-purple-100">{counts.CRITICAL} CRIT</span>}
            {counts.ERROR    > 0 && <span className="px-1.5 py-0.5 text-[9px] font-black rounded bg-red-700 text-red-100">{counts.ERROR} ERR</span>}
            {counts.WARNING  > 0 && <span className="px-1.5 py-0.5 text-[9px] font-black rounded bg-yellow-700 text-yellow-100">{counts.WARNING} WARN</span>}
            {counts.INFO     > 0 && <span className="px-1.5 py-0.5 text-[9px] font-black rounded bg-blue-700 text-blue-100">{counts.INFO} INFO</span>}
            {counts.DEBUG    > 0 && <span className="px-1.5 py-0.5 text-[9px] font-black rounded bg-gray-600 text-gray-200">{counts.DEBUG} DEBUG</span>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={copyFiltered}
            disabled={filtered.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-all disabled:opacity-30"
          >
            <FiCopy size={12} /> Copiar
          </button>
          <button
            type="button"
            onClick={downloadFiltered}
            disabled={filtered.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-all disabled:opacity-30"
          >
            <FiDownload size={12} /> Download
          </button>
        </div>
      </div>

      {selectedIdx.size > 0 && (
        <div className="px-5 py-2.5 bg-blue-900/20 border-b border-blue-700/30 flex items-center gap-3">
          <span className="text-xs font-bold text-blue-300">
            {selectedIdx.size} linha{selectedIdx.size === 1 ? '' : 's'} selecionada{selectedIdx.size === 1 ? '' : 's'}
          </span>
          <button
            type="button"
            onClick={deleteSelected}
            disabled={deleting}
            className="flex items-center gap-1.5 px-3 py-1 text-xs font-bold text-red-300 hover:text-white hover:bg-red-500/20 rounded-lg transition-all disabled:opacity-40"
          >
            <FiTrash2 size={12} /> {deleting ? 'Apagando...' : 'Apagar do log'}
          </button>
          <button
            type="button"
            onClick={clearSelection}
            className="text-xs text-gray-400 hover:text-gray-200 underline ml-auto"
          >
            limpar seleção
          </button>
        </div>
      )}

      {truncated && (
        <div className="px-5 py-2 bg-yellow-900/20 border-b border-yellow-700/30 text-yellow-300 text-xs flex items-center gap-2">
          <FiAlertTriangle size={12} />
          Arquivo tem {totalLines.toLocaleString()} linhas — exibindo apenas as ultimas 50.000. Use filtros para refinar.
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-500">
          <FiFilter size={32} className="mb-3 opacity-30" />
          <p className="font-bold">Nenhuma linha corresponde aos filtros</p>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2 px-4 py-1.5 border-b border-gray-800/40 bg-white/[0.02]">
            <button
              type="button"
              onClick={toggleSelectAllFiltered}
              className="flex-shrink-0 text-gray-500 hover:text-blue-400 transition-colors"
              title={allFilteredSelected ? 'Desmarcar todos' : 'Selecionar todos os filtrados'}
            >
              {allFilteredSelected ? <FiCheckSquare size={13} className="text-blue-400" /> : <FiSquare size={13} />}
            </button>
            <button
              type="button"
              onClick={toggleSelectAllFiltered}
              className="text-[10px] font-black text-gray-400 hover:text-gray-200 uppercase tracking-widest transition-colors"
            >
              {allFilteredSelected ? 'Desmarcar todos' : `Selecionar todos os filtrados (${filtered.length.toLocaleString()})`}
            </button>
          </div>
          <VirtualLogList
            items={filtered}
            filterText={[...filterTags, filterText].filter(t => t.trim().length > 0).join(' ')}
            selectedIdx={selectedIdx}
            onToggleSelect={toggleSelect}
            onOpenDetail={setDetailLine}
          />
        </>
      )}

      {/* Paginação — só aparece no modo por data */}
      {selectedDate && totalPages > 1 && (
        <div className="px-5 py-3 border-t border-gray-800/40 flex items-center justify-between gap-3 flex-wrap">
          <span className="text-xs text-gray-400">
            Página <span className="font-bold text-white">{currentPage}</span> de <span className="font-bold text-white">{totalPages}</span>
            {' '}· {totalLines.toLocaleString()} linhas totais
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => goToPage(1)}
              disabled={currentPage === 1 || loading}
              className="px-2 py-1 text-xs font-bold text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-all disabled:opacity-30"
            >
              «
            </button>
            <button
              type="button"
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1 || loading}
              className="px-3 py-1 text-xs font-bold text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-all disabled:opacity-30"
            >
              ‹ Anterior
            </button>

            {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
              const half = 3;
              let start = Math.max(1, currentPage - half);
              const end = Math.min(totalPages, start + 6);
              start = Math.max(1, end - 6);
              return start + i;
            }).filter(p => p >= 1 && p <= totalPages).map(p => (
              <button
                type="button"
                key={p}
                onClick={() => goToPage(p)}
                disabled={loading}
                className={`w-8 h-7 text-xs font-bold rounded-lg transition-all ${
                  p === currentPage
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-white/10'
                }`}
              >
                {p}
              </button>
            ))}

            <button
              type="button"
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages || loading}
              className="px-3 py-1 text-xs font-bold text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-all disabled:opacity-30"
            >
              Próxima ›
            </button>
            <button
              type="button"
              onClick={() => goToPage(totalPages)}
              disabled={currentPage === totalPages || loading}
              className="px-2 py-1 text-xs font-bold text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-all disabled:opacity-30"
            >
              »
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
