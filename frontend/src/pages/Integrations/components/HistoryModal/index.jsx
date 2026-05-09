import React from 'react';
import { createPortal } from 'react-dom';
import { FiSearch, FiUpload } from 'react-icons/fi';
import HistoryHeader from './HistoryHeader';
import HistoryControls from './HistoryControls';
import HistoryItemCard from './HistoryItemCard';
import SyncAllProgressPopup from './SyncAllProgressPopup';

const HistoryModal = ({
  isOpen,
  onClose,
  integration,
  webhookHistory,
  loadingHistory,
  webhookHistorySearch,
  setWebhookHistorySearch,
  webhookHistoryStatusFilter,
  setWebhookHistoryStatusFilter,
  historyCurrentPage,
  setHistoryCurrentPage,
  historyPageSize,
  setHistoryPageSize,
  selectedHistoryIds,
  handleSelectAll,
  handleToggleSelect,
  handleResendWebhook,
  handleSyncHistory,
  handleSyncAllHistory,
  handleExportHistory,
  handleImportHistory,
  isSyncingAll,
  isSyncing,
  isResending,
  setConfirmDeleteHistory,
  setConfirmResendHistory,
  setEditJsonModal,
  setMaximizedJson,
  fetchHistory,
  toast
}) => {
  if (!isOpen || !integration) return null;

  const historyArray = Array.isArray(webhookHistory) ? webhookHistory : [];
  const filtered = historyArray.filter(item => {
    if (!webhookHistoryStatusFilter) return true;
    return item?.processed_data?.raw_status === webhookHistoryStatusFilter;
  });
  const totalPages = Math.ceil(filtered.length / (historyPageSize || 20));
  const paginated = filtered.slice((historyCurrentPage - 1) * historyPageSize, historyCurrentPage * historyPageSize);

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 md:p-10 animate-in fade-in duration-500">
      <div className="bg-white dark:bg-[#1e293b] rounded-[2.5rem] w-full max-w-6xl max-h-[90vh] flex flex-col shadow-[0_0_100px_rgba(0,0,0,0.5)] overflow-hidden border border-gray-100 dark:border-white/5 animate-in zoom-in-95 duration-300">
        
        <HistoryHeader 
          integration={integration}
          webhookHistoryLength={webhookHistory.length}
          selectedHistoryIds={selectedHistoryIds}
          setConfirmDeleteHistory={setConfirmDeleteHistory}
          setConfirmResendHistory={setConfirmResendHistory}
          handleExportHistory={handleExportHistory}
          handleImportHistory={handleImportHistory}
        />

        <HistoryControls 
          webhookHistoryLength={webhookHistory.length}
          selectedHistoryIdsLength={selectedHistoryIds.length}
          handleSelectAll={handleSelectAll}
          webhookHistorySearch={webhookHistorySearch}
          setWebhookHistorySearch={setWebhookHistorySearch}
          setHistoryCurrentPage={setHistoryCurrentPage}
          fetchHistory={fetchHistory}
          integrationId={integration.id}
          webhookHistoryStatusFilter={webhookHistoryStatusFilter}
          handleSyncAllHistory={handleSyncAllHistory}
          isSyncingAll={isSyncingAll}
          setWebhookHistoryStatusFilter={setWebhookHistoryStatusFilter}
          webhookHistory={webhookHistory}
        />

        <div className="flex-1 overflow-y-auto p-8 bg-gray-50/30 dark:bg-[#0b1120]/20">
          {loadingHistory ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-gray-500 animate-pulse font-medium">Carregando histórico...</span>
            </div>
          ) : webhookHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4 opacity-60">
              <FiSearch size={48} className="text-gray-300 dark:text-gray-700 mb-2" />
              <div className="text-center">
                <p className="text-lg text-gray-400 font-bold">Nenhum registro encontrado</p>
                <p className="text-xs text-gray-500 mt-1">
                  {webhookHistorySearch ? `Não encontramos webhooks para "${webhookHistorySearch}"` : "Esta integração ainda não recebeu webhooks."}
                </p>
              </div>
              {webhookHistorySearch && (
                <button
                  onClick={() => { setWebhookHistorySearch(''); fetchHistory(integration.id, '', ''); }}
                  className="mt-4 text-xs font-bold bg-gray-100 dark:bg-gray-800 px-4 py-2 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-200"
                >
                  Limpar Busca
                </button>
              )}
              {!webhookHistorySearch && (
                <label className="mt-4 cursor-pointer text-xs font-bold bg-violet-500/10 hover:bg-violet-500 text-violet-500 hover:text-white px-4 py-2 rounded-xl transition-all flex items-center gap-2">
                  <FiUpload size={13} /> Importar Histórico
                  <input type="file" accept=".json" className="hidden" onChange={(e) => { handleImportHistory(e.target.files[0]); e.target.value = ''; }} />
                </label>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-2 px-1">
                <span className="text-[10px] text-gray-500 font-medium">{filtered.length} registro(s)</span>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-gray-500">Exibir:</span>
                  <select
                    value={historyPageSize}
                    onChange={(e) => { setHistoryPageSize(Number(e.target.value)); setHistoryCurrentPage(1); }}
                    className="bg-[#0b1120] border border-white/5 rounded-lg px-2 py-0.5 text-[10px] font-bold text-gray-200 outline-none cursor-pointer"
                  >
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
              </div>
              
              {paginated.map((item) => (
                <HistoryItemCard 
                  key={item?.id}
                  item={item}
                  selectedHistoryIds={selectedHistoryIds}
                  handleToggleSelect={handleToggleSelect}
                  handleResendWebhook={handleResendWebhook}
                  isResending={isResending}
                  setConfirmDeleteHistory={setConfirmDeleteHistory}
                  toast={toast}
                  setEditJsonModal={setEditJsonModal}
                  setMaximizedJson={setMaximizedJson}
                  handleSyncHistory={handleSyncHistory}
                  isSyncing={isSyncing}
                />
              ))}

              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-4">
                  <button
                    onClick={() => setHistoryCurrentPage(p => Math.max(1, p - 1))}
                    disabled={historyCurrentPage === 1}
                    className="px-3 py-1.5 text-xs font-bold bg-[#1e293b] border border-white/5 hover:bg-gray-700 disabled:opacity-30 text-gray-300 rounded-lg transition-all shadow-inner"
                  >← Anterior</button>
                  <span className="text-xs text-gray-500 font-medium px-2">
                    Página {historyCurrentPage} de {totalPages}
                  </span>
                  <button
                    onClick={() => setHistoryCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={historyCurrentPage === totalPages}
                    className="px-3 py-1.5 text-xs font-bold bg-[#1e293b] border border-white/5 hover:bg-gray-700 disabled:opacity-30 text-gray-300 rounded-lg transition-all shadow-inner"
                  >Próxima →</button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-[#0f172a]/50 flex justify-end">
          <button
            onClick={onClose}
            className="bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-white/5 text-gray-700 dark:text-gray-300 px-10 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-2xl font-bold transition-all active:scale-95 shadow-lg shadow-gray-200 dark:shadow-none"
          >
            Fechar Painel
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default function HistoryModalWithProgress(props) {
  return (
    <>
      <HistoryModal {...props} />
      <SyncAllProgressPopup isSyncingAll={props.isSyncingAll} />
    </>
  );
}
