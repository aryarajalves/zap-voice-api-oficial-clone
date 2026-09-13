import React from 'react';
import { FiFilter, FiSearch } from 'react-icons/fi';

export default function AppointmentsFilterBar({
  search,
  setSearch,
  statusFilter,
  setStatusFilter,
  dateFrom,
  setDateFrom,
  dateTo,
  setDateTo,
  setPage,
  handleClearFilters,
}) {
  return (
    <div className="flex flex-col gap-4 bg-white dark:bg-[#1e293b] p-6 rounded-3xl border border-gray-100 dark:border-white/5 shadow-sm">
      <div className="flex items-center gap-2 pb-2 border-b border-gray-100 dark:border-white/5">
        <FiFilter className="text-blue-500" />
        <span className="text-xs uppercase tracking-wider font-bold text-gray-400">Filtros e Busca</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
        {/* Text Search */}
        <div className="md:col-span-4 space-y-1.5">
          <label className="text-[10px] uppercase tracking-wider font-bold text-gray-400 dark:text-gray-500 ml-1">
            Pesquisar Contato
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
              <FiSearch />
            </span>
            <input
              type="text"
              placeholder="Nome ou telefone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-gray-50 dark:bg-[#0f172a] text-gray-900 dark:text-white placeholder-gray-400 text-sm font-medium"
            />
          </div>
        </div>

        {/* Status Dropdown */}
        <div className="md:col-span-3 space-y-1.5">
          <label className="text-[10px] uppercase tracking-wider font-bold text-gray-400 dark:text-gray-500 ml-1">
            Status Ocorrência
          </label>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(0);
            }}
            className="w-full p-2.5 border border-gray-300 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-gray-50 dark:bg-[#0f172a] text-gray-900 dark:text-white text-sm font-medium"
          >
            <option value="" className="bg-white dark:bg-[#1e293b]">Todos os Agendamentos</option>
            <option value="pending" className="bg-white dark:bg-[#1e293b]">Pendentes / Não Ocorridos</option>
            <option value="occurred" className="bg-white dark:bg-[#1e293b]">Realizados / Ocorridos</option>
          </select>
        </div>

        {/* Date Range - From */}
        <div className="md:col-span-2 space-y-1.5 flex-1">
          <label className="text-[10px] uppercase tracking-wider font-bold text-gray-400 dark:text-gray-500 ml-1">
            De (Criação)
          </label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value);
              setPage(0);
            }}
            className="w-full p-2.5 border border-gray-300 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-gray-50 dark:bg-[#0f172a] text-gray-900 dark:text-white text-sm font-medium"
          />
        </div>

        {/* Date Range - To */}
        <div className="md:col-span-2 space-y-1.5 flex-1">
          <label className="text-[10px] uppercase tracking-wider font-bold text-gray-400 dark:text-gray-500 ml-1">
            Até (Criação)
          </label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => {
              setDateTo(e.target.value);
              setPage(0);
            }}
            className="w-full p-2.5 border border-gray-300 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-gray-50 dark:bg-[#0f172a] text-gray-900 dark:text-white text-sm font-medium"
          />
        </div>

        {/* Clear Filters Button */}
        <div className="md:col-span-1">
          <button
            onClick={handleClearFilters}
            className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 text-gray-600 dark:text-gray-300 rounded-xl text-xs font-bold transition-all shadow border border-gray-200 dark:border-white/5 h-[42px] flex items-center justify-center cursor-pointer"
            title="Limpar Filtros"
          >
            Limpar
          </button>
        </div>
      </div>
    </div>
  );
}
