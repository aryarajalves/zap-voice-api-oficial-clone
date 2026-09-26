import React from 'react';
import { FiSliders, FiX } from 'react-icons/fi';
import SearchableSelect from '../../SearchableSelect';

const AdvancedFiltersPanel = ({
  dispatchEventFilter,
  setDispatchEventFilter,
  dispatchTypeFilter,
  setDispatchTypeFilter,
  dispatchTemplateFilter,
  setDispatchTemplateFilter,
  dispatchStartDate,
  setDispatchStartDate,
  dispatchEndDate,
  setDispatchEndDate,
  setDispatchPage,
  distinctTemplates,
  dispatchHistory,
  activeAdvancedCount,
  onClearAdvanced
}) => {
  const eventOptions = [
    { value: "", label: "Todos os Eventos" },
    ...[...new Set((dispatchHistory || []).map(item => item?.event_type))]
      .filter(Boolean)
      .sort()
      .map(evt => ({
        value: evt,
        label: evt.toUpperCase().replace(/_/g, ' ')
      }))
  ];

  const typeOptions = [
    { value: "", label: "Todos os Tipos" },
    { value: "free", label: "Grátis" },
    { value: "paid", label: "Pagos" },
    { value: "cancelled", label: "Cancelados" }
  ];

  const templateOptions = [
    { value: "", label: "Todos os Disparos" },
    { value: "all_templates", label: "Todos os Templates" },
    { value: "taxas", label: "Taxas (Templates Pagos)" },
    ...[...new Set(distinctTemplates || [])]
      .filter(Boolean)
      .sort()
      .map(tpl => ({
        value: tpl,
        label: tpl
      }))
  ];

  return (
    <div
      data-testid="advanced-filters-panel"
      className="mt-2.5 p-4 bg-[#0b1120]/90 backdrop-blur-md border border-indigo-500/20 rounded-2xl shadow-xl animate-in fade-in slide-in-from-top-2 duration-200"
    >
      <div className="flex items-center justify-between mb-3 px-1 border-b border-white/5 pb-2">
        <div className="flex items-center gap-2">
          <FiSliders size={13} className="text-indigo-400" />
          <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">
            Filtros Avançados
          </span>
          {activeAdvancedCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-[9px] font-black">
              {activeAdvancedCount} {activeAdvancedCount === 1 ? 'filtro ativo' : 'filtros ativos'}
            </span>
          )}
        </div>

        {activeAdvancedCount > 0 && (
          <button
            type="button"
            onClick={onClearAdvanced}
            className="flex items-center gap-1 text-[10px] font-bold text-gray-400 hover:text-orange-400 transition-colors cursor-pointer"
            title="Limpar apenas filtros avançados"
          >
            <FiX size={12} />
            <span>Limpar avançados</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3.5 items-end">
        {/* Evento */}
        <div>
          <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block px-1">
            Evento
          </label>
          <div className="relative">
            <SearchableSelect
              options={eventOptions}
              value={dispatchEventFilter}
              onChange={(val) => {
                setDispatchEventFilter(val);
                setDispatchPage(1);
              }}
              placeholder="Todos os Eventos"
              colorClass="focus-within:ring-indigo-500/20"
            />
          </div>
        </div>

        {/* Tipo */}
        <div>
          <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block px-1">
            Tipo
          </label>
          <div className="relative">
            <SearchableSelect
              options={typeOptions}
              value={dispatchTypeFilter}
              onChange={(val) => {
                setDispatchTypeFilter(val);
                setDispatchPage(1);
              }}
              placeholder="Todos os Tipos"
              colorClass="focus-within:ring-indigo-500/20"
            />
          </div>
        </div>

        {/* Template */}
        <div>
          <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block px-1">
            Template
          </label>
          <div className="relative">
            <SearchableSelect
              options={templateOptions}
              value={dispatchTemplateFilter}
              onChange={(val) => {
                setDispatchTemplateFilter(val);
                setDispatchPage(1);
              }}
              placeholder="Todos os Disparos"
              colorClass="focus-within:ring-indigo-500/20"
            />
          </div>
        </div>

        {/* Desde */}
        <div>
          <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block px-1">
            Desde
          </label>
          <input
            type="date"
            aria-label="Data inicial"
            value={dispatchStartDate}
            onChange={(e) => {
              setDispatchStartDate(e.target.value);
              setDispatchPage(1);
            }}
            className="w-full h-[38px] bg-[#111827] border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-white focus:ring-2 focus:ring-indigo-500/30 transition-all outline-none [color-scheme:dark] shadow-inner"
          />
        </div>

        {/* Até */}
        <div>
          <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block px-1">
            Até
          </label>
          <input
            type="date"
            aria-label="Data final"
            value={dispatchEndDate}
            onChange={(e) => {
              setDispatchEndDate(e.target.value);
              setDispatchPage(1);
            }}
            className="w-full h-[38px] bg-[#111827] border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-white focus:ring-2 focus:ring-indigo-500/30 transition-all outline-none [color-scheme:dark] shadow-inner"
          />
        </div>
      </div>
    </div>
  );
};

export default AdvancedFiltersPanel;
