import React from 'react';
import { FiSearch, FiRefreshCw } from 'react-icons/fi';
import SearchableSelect from '../../SearchableSelect';

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
  return (
    <div className="px-6 pt-4 pb-0 shrink-0">
      <div className="mb-3 grid grid-cols-1 md:grid-cols-8 gap-3 items-end bg-white/[0.02] border border-white/5 p-3 rounded-2xl">
        <div className="md:col-span-1">
          <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1 block px-1">Buscar</label>
          <div className="relative group">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-indigo-500 transition-colors" size={14} />
            <input
              type="text"
              placeholder="Telefone ou nome..."
              value={dispatchSearch}
              onChange={(e) => setDispatchSearch(e.target.value)}
              className="w-full bg-[#0b1120] border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-xs font-bold text-white focus:ring-2 focus:ring-indigo-500/30 transition-all outline-none shadow-inner"
            />
          </div>
        </div>

        <div>
          <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1 block px-1">Evento</label>
          <div className="relative">
            <SearchableSelect
              options={[
                { value: "", label: "Todos os Eventos" },
                ...[...new Set((dispatchHistory || []).map(item => item?.event_type))].filter(Boolean).sort().map(evt => ({
                  value: evt,
                  label: evt.toUpperCase().replace(/_/g, ' ')
                }))
              ]}
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

        <div>
          <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1 block px-1">Status</label>
          <div className="relative">
            <SearchableSelect
              options={[
                { value: "", label: "Todos os Status" },
                { value: "completed", label: "Sucesso / Enviados" },
                { value: "failed", label: "Erro / Falhas" },
                { value: "processing", label: "Processando" },
                { value: "queued", label: "Fila / Pendentes" },
                { value: "cancelled", label: "Cancelados" }
              ]}
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

        <div>
          <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1 block px-1">Tipo</label>
          <div className="relative">
            <SearchableSelect
              options={[
                { value: "", label: "Todos" },
                { value: "free", label: "Grátis" },
                { value: "paid", label: "Pagos" },
                { value: "cancelled", label: "Cancelados" }
              ]}
              value={dispatchTypeFilter}
              onChange={(val) => {
                setDispatchTypeFilter(val);
                setDispatchPage(1);
              }}
              placeholder="Todos"
              colorClass="focus-within:ring-indigo-500/20"
            />
          </div>
        </div>

        <div>
          <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1 block px-1">Template</label>
          <div className="relative">
            <SearchableSelect
              options={[
                { value: "", label: "Todos os Disparos" },
                { value: "all_templates", label: "Todos os Templates" },
                { value: "taxas", label: "Taxas (Templates Pagos)" },
                ...[...new Set(distinctTemplates || [])].filter(Boolean).sort().map(tpl => ({
                  value: tpl,
                  label: tpl
                }))
              ]}
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

        <div>
          <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1 block px-1">Desde</label>
          <input
            type="date"
            value={dispatchStartDate}
            onChange={(e) => setDispatchStartDate(e.target.value)}
            className="w-full h-[38px] bg-[#0b1120] border border-white/10 rounded-xl px-4 py-2 text-xs font-bold text-white focus:ring-2 focus:ring-indigo-500/30 transition-all outline-none [color-scheme:dark] shadow-inner"
          />
        </div>

        <div>
          <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1 block px-1">Até</label>
          <input
            type="date"
            value={dispatchEndDate}
            onChange={(e) => setDispatchEndDate(e.target.value)}
            className="w-full h-[38px] bg-[#0b1120] border border-white/10 rounded-xl px-4 py-2 text-xs font-bold text-white focus:ring-2 focus:ring-indigo-500/30 transition-all outline-none [color-scheme:dark] shadow-inner"
          />
        </div>

        <div className="flex items-end">
          <button
            onClick={() => {
              setDispatchSearch('');
              setDispatchEventFilter('');
              setDispatchTypeFilter('');
              setDispatchStatusFilter('');
              setDispatchTemplateFilter('');
              setDispatchStartDate('');
              setDispatchEndDate('');
              setDispatchPage(1);
              fetchDispatches(integrationId, 1, dispatchLimit, '', '', '', '', '', '', '', '');
            }}
            className="w-full h-[38px] flex items-center justify-center bg-white/5 hover:bg-orange-500/20 text-gray-400 hover:text-orange-500 rounded-xl transition-all border border-white/10 hover:border-orange-500/20 shadow-sm"
            title="Limpar Filtros e Resetar"
          >
            <FiRefreshCw size={12} className="mr-1.5" />
            <span className="text-[9px] font-black uppercase tracking-wider">Limpar</span>
          </button>
        </div>

      </div>
    </div>
  );
};

export default FiltersBar;
