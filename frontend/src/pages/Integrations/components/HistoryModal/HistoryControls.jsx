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

  return (
    <div className="px-8 py-4 bg-gray-50/90 dark:bg-[#0f172a]/90 border-b border-gray-100 dark:border-white/5 flex flex-col gap-3.5 backdrop-blur-sm">
      {/* Linha 1: Barra de Pesquisa Ampla e Ações Rápidas */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
        <div className="flex-1 relative group">
          <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-blue-400 group-focus-within:text-blue-500 transition-colors pointer-events-none" size={15} />
          <input
            type="text"
            placeholder="Buscar por nome, telefone ou payload..."
            value={webhookHistorySearch}
            onChange={(e) => {
              setWebhookHistorySearch(e.target.value);
              setHistoryCurrentPage(1);
              fetchHistory(integrationId, webhookHistoryStatusFilter, e.target.value);
            }}
            className="w-full bg-[#0b1120] border border-white/10 hover:border-white/20 rounded-xl pl-10 pr-9 py-2.5 text-xs font-medium text-gray-200 placeholder-gray-500 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/80 transition-all outline-none shadow-inner"
          />
          {webhookHistorySearch && (
            <button
              type="button"
              onClick={() => {
                setWebhookHistorySearch('');
                setHistoryCurrentPage(1);
                fetchHistory(integrationId, webhookHistoryStatusFilter, '');
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200 p-0.5 rounded-full hover:bg-white/10 transition-colors"
              title="Limpar busca"
            >
              ✕
            </button>
          )}
        </div>

        <div className="flex items-center gap-2.5 shrink-0 justify-end">
          <button
            onClick={() => fetchHistory(integrationId, webhookHistoryStatusFilter, webhookHistorySearch)}
            className="flex items-center gap-2 text-[11px] font-bold bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/5 transition-all active:scale-95 group shadow-sm"
            title="Atualizar registros do histórico"
          >
            <FiRefreshCw size={13} className="group-hover:rotate-180 transition-transform duration-500" />
            ATUALIZAR
          </button>

          <button
            onClick={() => handleSyncAllHistory(integrationId)}
            disabled={isSyncingAll || webhookHistoryLength === 0}
            className="flex items-center gap-2 text-[11px] font-bold bg-blue-500/10 hover:bg-blue-600 text-blue-400 hover:text-white px-4 py-2.5 rounded-xl border border-blue-500/20 hover:border-blue-500 transition-all active:scale-95 disabled:opacity-50 shadow-lg shadow-blue-500/10 group"
          >
            <FiRefreshCw size={13} className={`${isSyncingAll ? 'animate-spin' : 'group-hover:rotate-180'} transition-transform duration-500`} />
            {isSyncingAll ? 'SINCRONIZANDO TUDO...' : 'SINCRONIZAR TUDO'}
          </button>
        </div>
      </div>

      {/* Linha 2: Seleção em Massa e Filtros Secundários */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-0.5">
        <div 
          className={`flex items-center gap-3 px-3.5 py-1.5 rounded-xl border border-white/5 transition-all ${
            webhookHistoryLength === 0 ? 'opacity-40 cursor-not-allowed bg-white/[0.02]' : 'bg-white/5 hover:bg-white/10 cursor-pointer group'
          } w-fit`}
          onClick={() => {
            if (webhookHistoryLength > 0) {
              handleSelectAll({ target: { checked: selectedHistoryIdsLength !== webhookHistoryLength } });
            }
          }}
        >
          <input
            type="checkbox"
            disabled={webhookHistoryLength === 0}
            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer disabled:cursor-not-allowed transition-all active:scale-90"
            checked={selectedHistoryIdsLength === webhookHistoryLength && webhookHistoryLength > 0}
            onChange={handleSelectAll}
            onClick={(e) => e.stopPropagation()}
          />
          <span className="text-[11px] font-bold text-gray-400 group-hover:text-gray-200 uppercase tracking-wider whitespace-nowrap transition-colors">
            Selecionar Todos os Registros
          </span>
          {selectedHistoryIdsLength > 0 && (
            <span className="bg-blue-500/20 text-blue-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-blue-500/30">
              {selectedHistoryIdsLength}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3 justify-start sm:justify-end">
          <button
            onClick={() => { setStressTestFilter(v => !v); setHistoryCurrentPage(1); }}
            className={`flex items-center gap-1.5 text-[11px] font-bold px-3.5 py-1.5 rounded-xl border transition-all active:scale-95 ${
              stressTestFilter
                ? 'bg-violet-500/20 text-violet-400 border-violet-500/40 shadow-lg shadow-violet-500/10'
                : 'bg-white/5 hover:bg-violet-500/10 text-gray-400 hover:text-violet-400 border-white/5 hover:border-violet-500/20'
            }`}
            title="Mostrar apenas registros do Teste de Escala"
          >
            <FiZap size={12} fill={stressTestFilter ? 'currentColor' : 'none'} />
            TESTE DE ESCALA
          </button>

          <div className="flex items-center gap-2 bg-white/5 px-3 py-1 rounded-xl border border-white/5">
            <span className="text-[10px] font-black text-gray-400 tracking-wider uppercase whitespace-nowrap">Mapeamento:</span>
            <select
              value={webhookHistoryMappingFilter}
              onChange={(e) => { setWebhookHistoryMappingFilter(e.target.value); setHistoryCurrentPage(1); }}
              className="bg-transparent border-0 text-xs font-bold text-gray-200 cursor-pointer outline-none focus:ring-0"
            >
              <option value="" className="bg-[#0f172a] text-gray-200">TODOS</option>
              <option value="mapped" className="bg-[#0f172a] text-gray-200">COM MAPEAMENTO</option>
              <option value="unmapped" className="bg-[#0f172a] text-gray-200">SEM MAPEAMENTO</option>
            </select>
          </div>

          <div className="flex items-center gap-2 bg-white/5 px-3 py-1 rounded-xl border border-white/5">
            <span className="text-[10px] font-black text-gray-400 tracking-wider uppercase whitespace-nowrap">Status:</span>
            <select
              value={webhookHistoryStatusFilter}
              onChange={(e) => { setWebhookHistoryStatusFilter(e.target.value); setHistoryCurrentPage(1); }}
              className="bg-transparent border-0 text-xs font-bold text-gray-200 cursor-pointer outline-none focus:ring-0"
            >
              <option value="" className="bg-[#0f172a] text-gray-200">TODOS OS STATUS</option>
              {[...new Set([
                ...(webhookHistoryStatusFilter ? [webhookHistoryStatusFilter] : []),
                ...((webhookHistory || []).map(item => item?.event_type).filter(Boolean))
              ])].sort().map(eventType => {
                const label = EVENT_TYPES.find(e => e.value === eventType)?.label || eventType;
                return <option key={eventType} value={eventType} className="bg-[#0f172a] text-gray-200">{label.toUpperCase()}</option>;
              })}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HistoryControls;
