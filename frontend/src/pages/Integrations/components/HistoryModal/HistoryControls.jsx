import React from 'react';
import { FiSearch, FiRefreshCw, FiZap } from 'react-icons/fi';
import { EVENT_TYPES } from '../../constants';

const HistoryControls = ({
  webhookHistoryLength,
  selectedHistoryIdsLength,
  handleSelectAll,
  webhookHistorySearch,
  setWebhookHistorySearch,
  setHistoryCurrentPage,
  fetchHistory,
  integrationId,
  webhookHistoryStatusFilter,
  handleSyncAllHistory,
  isSyncingAll,
  setWebhookHistoryStatusFilter,
  webhookHistoryMappingFilter,
  setWebhookHistoryMappingFilter,
  webhookHistory,
  stressTestFilter,
  setStressTestFilter,
}) => {
  if (webhookHistoryLength === 0) return null;

  return (
    <div className="px-8 py-4 bg-gray-50/80 dark:bg-[#0f172a]/80 border-b border-gray-100 dark:border-white/5 flex flex-col xl:flex-row xl:items-center justify-between gap-4 backdrop-blur-sm">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 flex-1">
        <div className="flex items-center gap-4 bg-white/5 hover:bg-white/10 px-4 py-2 rounded-2xl border border-white/5 transition-all cursor-pointer group" onClick={() => handleSelectAll({ target: { checked: selectedHistoryIdsLength !== webhookHistoryLength } })}>
          <input
            type="checkbox"
            className="w-5 h-5 rounded-md border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer transition-all active:scale-90"
            checked={selectedHistoryIdsLength === webhookHistoryLength && webhookHistoryLength > 0}
            onChange={handleSelectAll}
            onClick={(e) => e.stopPropagation()}
          />
          <span className="text-xs font-black text-gray-400 group-hover:text-white uppercase tracking-widest whitespace-nowrap transition-colors">Selecionar Todos os Registros</span>
        </div>

        <div className="flex-1 max-w-md relative group">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-blue-500 transition-colors" size={14} />
          <input
            type="text"
            placeholder="Buscar por nome ou telefone..."
            value={webhookHistorySearch}
            onChange={(e) => {
              setWebhookHistorySearch(e.target.value);
              setHistoryCurrentPage(1);
              fetchHistory(integrationId, webhookHistoryStatusFilter, e.target.value);
            }}
            className="w-full bg-[#0b1120] border border-white/5 rounded-xl pl-9 pr-4 py-2 text-xs font-bold text-gray-200 focus:ring-2 focus:ring-blue-500/30 transition-all outline-none hover:border-white/10 shadow-inner"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 xl:justify-end">
        <button
          onClick={() => fetchHistory(integrationId, webhookHistoryStatusFilter, webhookHistorySearch)}
          className="flex items-center gap-2 text-[11px] font-bold bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-xl border border-gray-200 dark:border-white/5 transition-all active:scale-95 group"
          title="Atualizar registros do histórico"
        >
          <FiRefreshCw size={14} className="group-hover:rotate-180 transition-transform duration-500" />
          ATUALIZAR
        </button>

        <button
          onClick={() => handleSyncAllHistory(integrationId)}
          disabled={isSyncingAll}
          className="flex items-center gap-2 text-[11px] font-bold bg-blue-500/10 hover:bg-blue-500 text-blue-500 hover:text-white px-4 py-2 rounded-xl border border-blue-500/20 transition-all active:scale-95 disabled:opacity-50 shadow-lg shadow-blue-500/10 group"
        >
          <FiRefreshCw size={14} className={`${isSyncingAll ? 'animate-spin' : 'group-hover:rotate-180'} transition-transform duration-500`} />
          {isSyncingAll ? 'SINCRONIZANDO TUDO...' : 'SINCRONIZAR TUDO'}
        </button>

        <button
          onClick={() => { setStressTestFilter(v => !v); setHistoryCurrentPage(1); }}
          className={`flex items-center gap-2 text-[11px] font-black px-4 py-2 rounded-xl border transition-all active:scale-95 ${
            stressTestFilter
              ? 'bg-violet-500/20 text-violet-400 border-violet-500/40 shadow-lg shadow-violet-500/10'
              : 'bg-white/5 hover:bg-violet-500/10 text-gray-400 hover:text-violet-400 border-white/5 hover:border-violet-500/20'
          }`}
          title="Mostrar apenas registros do Teste de Escala"
        >
          <FiZap size={13} fill={stressTestFilter ? 'currentColor' : 'none'} />
          TESTE DE ESCALA
        </button>

        <div className="flex items-center gap-3">
          <span className="text-[10px] font-black text-gray-500 tracking-widest uppercase whitespace-nowrap">Mapeamento:</span>
          <select
            value={webhookHistoryMappingFilter}
            onChange={(e) => { setWebhookHistoryMappingFilter(e.target.value); setHistoryCurrentPage(1); }}
            className="bg-[#0b1120] border border-white/5 rounded-xl px-4 py-2 text-xs font-bold text-gray-200 focus:ring-2 focus:ring-blue-500/30 transition-all cursor-pointer outline-none hover:border-white/10"
          >
            <option value="">TODOS</option>
            <option value="mapped">COM MAPEAMENTO</option>
            <option value="unmapped">SEM MAPEAMENTO</option>
          </select>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[10px] font-black text-gray-500 tracking-widest uppercase whitespace-nowrap">Status:</span>
          <select
            value={webhookHistoryStatusFilter}
            onChange={(e) => { setWebhookHistoryStatusFilter(e.target.value); setHistoryCurrentPage(1); }}
            className="bg-[#0b1120] border border-white/5 rounded-xl px-4 py-2 text-xs font-bold text-gray-200 focus:ring-2 focus:ring-blue-500/30 transition-all cursor-pointer outline-none hover:border-white/10"
          >
            <option value="">TODOS OS STATUS</option>
            {[...new Set((webhookHistory || []).map(item => item?.event_type).filter(Boolean))].sort().map(eventType => {
              const label = EVENT_TYPES.find(e => e.value === eventType)?.label || eventType;
              return <option key={eventType} value={eventType}>{label.toUpperCase()}</option>;
            })}
          </select>
        </div>
      </div>
    </div>
  );
};

export default HistoryControls;
