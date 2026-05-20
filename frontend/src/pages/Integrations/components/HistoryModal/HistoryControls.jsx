import React from 'react';
import { FiSearch, FiRefreshCw } from 'react-icons/fi';

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
  webhookHistory
}) => {
  if (webhookHistoryLength === 0) return null;

  return (
    <div className="px-8 py-3 bg-gray-50/80 dark:bg-[#0f172a]/80 border-b border-gray-100 dark:border-white/5 flex items-center justify-between backdrop-blur-sm">
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

      <div className="flex-1 max-w-md relative group ml-4">
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

      <div className="flex items-center gap-6">
        <button
          onClick={() => handleSyncAllHistory(integrationId)}
          disabled={isSyncingAll}
          className="flex items-center gap-2 text-[11px] font-bold bg-blue-500/10 hover:bg-blue-500 text-blue-500 hover:text-white px-4 py-2 rounded-xl border border-blue-500/20 transition-all active:scale-95 disabled:opacity-50 shadow-lg shadow-blue-500/10 group"
        >
          <FiRefreshCw size={14} className={`${isSyncingAll ? 'animate-spin' : 'group-hover:rotate-180'} transition-transform duration-500`} />
          {isSyncingAll ? 'SINCRONIZANDO TUDO...' : 'SINCRONIZAR TUDO'}
        </button>

        <div className="flex items-center gap-3">
          <span className="text-[10px] font-black text-gray-500 tracking-widest uppercase">Mapeamento:</span>
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
          <span className="text-[10px] font-black text-gray-500 tracking-widest uppercase">Filtrar por Status:</span>
          <select
            value={webhookHistoryStatusFilter}
            onChange={(e) => { setWebhookHistoryStatusFilter(e.target.value); setHistoryCurrentPage(1); }}
            className="bg-[#0b1120] border border-white/5 rounded-xl px-4 py-2 text-xs font-bold text-gray-200 focus:ring-2 focus:ring-blue-500/30 transition-all cursor-pointer outline-none hover:border-white/10"
          >
            <option value="">TODOS OS STATUS</option>
            {[...new Set((webhookHistory || []).map(item => item?.processed_data?.raw_status).filter(Boolean))].sort().map(status => (
              <option key={status} value={status}>{String(status).toUpperCase()}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};

export default HistoryControls;
