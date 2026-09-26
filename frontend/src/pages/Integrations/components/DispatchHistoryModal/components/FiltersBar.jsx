import React, { useState } from 'react';
import { FiSearch, FiRefreshCw, FiSliders, FiChevronDown, FiX } from 'react-icons/fi';
import SearchableSelect from '../../SearchableSelect';
import AdvancedFiltersPanel from './AdvancedFiltersPanel';

const FiltersBar = ({
  dispatchSearch,
  setDispatchSearch,
  dispatchHistory,
  dispatchEventFilter,
  setDispatchEventFilter,
  setDispatchPage,
  dispatchTypeFilter,
  setDispatchTypeFilter,
  dispatchStatusFilter,
  setDispatchStatusFilter,
  dispatchStartDate,
  setDispatchStartDate,
  dispatchEndDate,
  setDispatchEndDate,
  fetchDispatches,
  integrationId,
  dispatchLimit,
  dispatchTemplateFilter,
  setDispatchTemplateFilter,
  distinctTemplates
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const activeAdvancedCount =
    (dispatchEventFilter ? 1 : 0) +
    (dispatchTypeFilter ? 1 : 0) +
    (dispatchTemplateFilter ? 1 : 0) +
    (dispatchStartDate ? 1 : 0) +
    (dispatchEndDate ? 1 : 0);

  const statusOptions = [
    { value: "", label: "Todos os Status" },
    { value: "completed", label: "Sucesso / Enviados" },
    { value: "failed", label: "Erro / Falhas" },
    { value: "processing", label: "Processando" },
    { value: "queued", label: "Fila / Pendentes" },
    { value: "cancelled", label: "Cancelados" }
  ];

  const handleClearAll = () => {
    setDispatchSearch('');
    setDispatchEventFilter('');
    setDispatchTypeFilter('');
    setDispatchStatusFilter('');
    setDispatchTemplateFilter('');
    setDispatchStartDate('');
    setDispatchEndDate('');
    setDispatchPage(1);
    fetchDispatches(integrationId, 1, dispatchLimit, '', '', '', '', '', '', '', '');
  };

  const handleClearAdvanced = () => {
    setDispatchEventFilter('');
    setDispatchTypeFilter('');
    setDispatchTemplateFilter('');
    setDispatchStartDate('');
    setDispatchEndDate('');
    setDispatchPage(1);
  };

  return (
    <div className="px-6 pt-4 pb-0 shrink-0">
      {/* Linha Principal Sempre Visível */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3 bg-white/[0.02] border border-white/5 p-3 rounded-2xl">
        {/* Campo Buscar */}
        <div className="flex-1 min-w-[200px]">
          <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1 block px-1">
            Buscar
          </label>
          <div className="relative group">
            <FiSearch
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-indigo-400 transition-colors"
              size={14}
            />
            <input
              type="text"
              placeholder="Buscar por telefone ou nome..."
              value={dispatchSearch}
              onChange={(e) => setDispatchSearch(e.target.value)}
              className="w-full bg-[#0b1120] border border-white/10 rounded-xl pl-9 pr-8 py-2 text-xs font-bold text-white focus:ring-2 focus:ring-indigo-500/30 transition-all outline-none shadow-inner h-[38px] placeholder:text-gray-500"
            />
            {dispatchSearch && (
              <button
                type="button"
                onClick={() => setDispatchSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors cursor-pointer p-0.5"
                title="Limpar busca"
              >
                <FiX size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Campo Status */}
        <div className="w-full sm:w-56">
          <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1 block px-1">
            Status
          </label>
          <div className="relative">
            <SearchableSelect
              options={statusOptions}
              value={dispatchStatusFilter}
              onChange={(val) => {
                setDispatchStatusFilter(val);
                setDispatchPage(1);
              }}
              placeholder="Todos os Status"
              colorClass="focus-within:ring-indigo-500/20"
            />
          </div>
        </div>

        {/* Botão Filtros Avançados */}
        <div className="flex items-end">
          <button
            type="button"
            onClick={() => setShowAdvanced((prev) => !prev)}
            className={`h-[38px] px-3.5 flex items-center justify-center gap-2 rounded-xl text-xs font-bold transition-all border outline-none cursor-pointer select-none ${
              showAdvanced || activeAdvancedCount > 0
                ? 'bg-indigo-600/30 border-indigo-500/50 text-indigo-200 shadow-sm shadow-indigo-500/20 hover:bg-indigo-600/40'
                : 'bg-[#0b1120] border-white/10 text-gray-400 hover:text-white hover:border-white/20'
            }`}
            title="Exibir ou ocultar filtros avançados (Evento, Tipo, Template, Datas)"
          >
            <FiSliders
              size={14}
              className={showAdvanced || activeAdvancedCount > 0 ? 'text-indigo-400' : 'text-gray-400'}
            />
            <span>Filtros Avançados</span>
            {activeAdvancedCount > 0 && (
              <span className="w-5 h-5 flex items-center justify-center rounded-full bg-indigo-500 text-white text-[10px] font-black">
                {activeAdvancedCount}
              </span>
            )}
            <FiChevronDown
              size={14}
              className={`transition-transform duration-200 ${
                showAdvanced ? 'rotate-180 text-indigo-400' : 'text-gray-500'
              }`}
            />
          </button>
        </div>

        {/* Botão Limpar */}
        <div className="flex items-end">
          <button
            type="button"
            onClick={handleClearAll}
            className="h-[38px] px-3.5 flex items-center justify-center bg-white/5 hover:bg-orange-500/20 text-gray-400 hover:text-orange-400 rounded-xl transition-all border border-white/10 hover:border-orange-500/20 shadow-sm cursor-pointer select-none"
            title="Limpar todos os filtros e resetar busca"
          >
            <FiRefreshCw size={12} className="mr-1.5" />
            <span className="text-[10px] font-black uppercase tracking-wider">Limpar</span>
          </button>
        </div>
      </div>

      {/* Painel Colapsável de Filtros Avançados */}
      {showAdvanced && (
        <AdvancedFiltersPanel
          dispatchEventFilter={dispatchEventFilter}
          setDispatchEventFilter={setDispatchEventFilter}
          dispatchTypeFilter={dispatchTypeFilter}
          setDispatchTypeFilter={setDispatchTypeFilter}
          dispatchTemplateFilter={dispatchTemplateFilter}
          setDispatchTemplateFilter={setDispatchTemplateFilter}
          dispatchStartDate={dispatchStartDate}
          setDispatchStartDate={setDispatchStartDate}
          dispatchEndDate={dispatchEndDate}
          setDispatchEndDate={setDispatchEndDate}
          setDispatchPage={setDispatchPage}
          distinctTemplates={distinctTemplates}
          dispatchHistory={dispatchHistory}
          activeAdvancedCount={activeAdvancedCount}
          onClearAdvanced={handleClearAdvanced}
        />
      )}
    </div>
  );
};

export default FiltersBar;
