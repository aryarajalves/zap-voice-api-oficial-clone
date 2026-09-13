import React from 'react';
import { FiFilter, FiX, FiSearch } from 'react-icons/fi';

export default function EmailHistoryFilters({
  filterSearch,
  setFilterSearch,
  filterStatus,
  setFilterStatus,
  filterDateFrom,
  setFilterDateFrom,
  filterDateTo,
  setFilterDateTo,
  hasFilters,
  clearFilters,
  filteredCount,
  totalCount
}) {
  return (
    <div className="bg-white dark:bg-slate-800/80 rounded-2xl border border-gray-100 dark:border-white/10 shadow-sm p-4">
      <div className="flex items-center gap-2 mb-3">
        <FiFilter className="text-blue-500" size={14} />
        <span className="text-xs font-bold text-gray-700 dark:text-gray-300">Filtros</span>
        {hasFilters && (
          <button
            onClick={clearFilters}
            id="btn-clear-history-filters"
            className="ml-auto flex items-center gap-1 px-2.5 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-500 text-xs font-semibold rounded-lg transition-all"
          >
            <FiX size={12} /> Limpar filtros
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Busca por nome / assunto */}
        <div className="relative flex items-center">
          <FiSearch className="absolute left-3 text-gray-400 pointer-events-none" size={13} />
          <input
            type="text"
            id="input-history-search"
            placeholder="Buscar campanha ou assunto..."
            value={filterSearch}
            onChange={e => setFilterSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs text-gray-800 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
          />
        </div>

        {/* Filtro por status */}
        <div>
          <select
            id="select-history-status"
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
          >
            <option value="">Todos os status</option>
            <option value="completed">✅ Concluído</option>
            <option value="completed_with_errors">⚠️ Concluído com falhas</option>
            <option value="failed">❌ Falhou</option>
            <option value="scheduled">📅 Agendado</option>
            <option value="processing">⏳ Processando</option>
          </select>
        </div>

        {/* Data de início */}
        <div>
          <input
            type="date"
            id="input-history-date-from"
            value={filterDateFrom}
            onChange={e => setFilterDateFrom(e.target.value)}
            className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            title="Data inicial (Brasília)"
          />
          <p className="text-[10px] text-gray-400 mt-0.5 pl-1">De (data)</p>
        </div>

        {/* Data de fim */}
        <div>
          <input
            type="date"
            id="input-history-date-to"
            value={filterDateTo}
            onChange={e => setFilterDateTo(e.target.value)}
            min={filterDateFrom || undefined}
            className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            title="Data final (Brasília)"
          />
          <p className="text-[10px] text-gray-400 mt-0.5 pl-1">Até (data)</p>
        </div>
      </div>

      {/* Contador de resultados filtrados */}
      {hasFilters && (
        <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
          Exibindo <span className="font-bold text-blue-600 dark:text-blue-400">{filteredCount}</span> resultado(s) de{' '}
          <span className="font-bold">{totalCount}</span> no total.
        </div>
      )}
    </div>
  );
}
