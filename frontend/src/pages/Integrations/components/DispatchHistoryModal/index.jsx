import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { FiX, FiPlay, FiRefreshCw, FiChevronDown, FiZap } from 'react-icons/fi';
import FiltersBar from './components/FiltersBar';
import BulkActionsBar from './components/BulkActionsBar';
import DispatchTableRow from './components/DispatchTableRow';

const DispatchHistoryModal = ({
  isOpen,
  onClose,
  integration,
  dispatchHistory,
  loadingDispatchHistory,
  dispatchSearch,
  setDispatchSearch,
  dispatchEventFilter,
  setDispatchEventFilter,
  dispatchTypeFilter,
  setDispatchTypeFilter,
  dispatchStartDate,
  setDispatchStartDate,
  dispatchEndDate,
  setDispatchEndDate,
  dispatchPage,
  setDispatchPage,
  dispatchLimit,
  setDispatchLimit,
  dispatchTotal,
  selectedDispatchIds,
  setSelectedDispatchIds,
  handleSelectAllDispatches,
  handleToggleSelectDispatch,
  handleBulkDispatchPlay,
  handleBulkDispatchDelete,
  handlePlayDispatch,
  handleCancelDispatch,
  handleBackfillCosts,
  isBackfillingCosts,
  isBulkPlayingDispatches,
  isPlaying,
  isCancelling,
  setSelectedDispatch,
  setIsPipelineModalOpen,
  fetchDispatches,
  setConfirmDeleteDispatch,
  fetchChildren
}) => {
  useEffect(() => {
    if (isOpen && integration?.id) {
      fetchDispatches(
        integration.id,
        dispatchPage,
        dispatchLimit,
        dispatchSearch,
        dispatchEventFilter,
        dispatchStartDate,
        dispatchEndDate,
        dispatchTypeFilter
      );
    }
  }, [
    isOpen,
    integration?.id,
    dispatchPage,
    dispatchLimit,
    dispatchSearch,
    dispatchEventFilter,
    dispatchStartDate,
    dispatchEndDate,
    dispatchTypeFilter,
    fetchDispatches
  ]);

  if (!isOpen || !integration) return null;

  const totalPages = Math.ceil(dispatchTotal / (dispatchLimit || 20)) || 1;

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-[#1e293b] border border-white/5 rounded-[2.5rem] w-full max-w-6xl h-full max-h-[90vh] flex flex-col shadow-[0_0_100px_rgba(30,58,138,0.2)] overflow-hidden animate-in zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="p-5 border-b border-white/5 flex justify-between items-center bg-[#0f172a]/80 backdrop-blur shrink-0">
          <div>
            <h3 className="text-xl font-black text-white flex items-center gap-3 tracking-tight">
              <div className="p-1.5 bg-indigo-500/10 rounded-lg">
                <FiPlay className="text-indigo-400" size={18} />
              </div>
              Histórico de Disparos: {integration.name}
            </h3>
            <p className="text-gray-500 text-[10px] mt-1 font-medium bg-white/5 px-2 py-0.5 rounded-lg inline-block">
              Acompanhe a fila de execução de templates e funis
            </p>
          </div>
        </div>

        <div className="p-0 flex-1 overflow-hidden relative flex flex-col">
          {/* Filters Bar */}
          <FiltersBar
            dispatchSearch={dispatchSearch}
            setDispatchSearch={setDispatchSearch}
            dispatchHistory={dispatchHistory}
            dispatchEventFilter={dispatchEventFilter}
            setDispatchEventFilter={setDispatchEventFilter}
            setDispatchPage={setDispatchPage}
            dispatchTypeFilter={dispatchTypeFilter}
            setDispatchTypeFilter={setDispatchTypeFilter}
            dispatchStartDate={dispatchStartDate}
            setDispatchStartDate={setDispatchStartDate}
            dispatchEndDate={dispatchEndDate}
            setDispatchEndDate={setDispatchEndDate}
            fetchDispatches={fetchDispatches}
            integrationId={integration.id}
            dispatchLimit={dispatchLimit}
          />

          {loadingDispatchHistory ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4">
              <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
              <p className="text-gray-500 font-bold tracking-widest text-xs">CARREGANDO FILA...</p>
            </div>
          ) : !dispatchHistory || dispatchHistory.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
              <div className="p-6 bg-white/5 rounded-full mb-6">
                <FiZap size={48} className="text-gray-700" />
              </div>
              <h4 className="text-xl font-bold text-white mb-2">Nenhum disparo encontrado</h4>
              <p className="text-gray-500 max-w-md">
                Não há disparos para os filtros aplicados. Tente limpar os filtros ou selecionar outro período.
              </p>
            </div>
          ) : (
            <>
              {/* Bulk Actions Bar */}
              <BulkActionsBar
                selectedDispatchIds={selectedDispatchIds}
                handleBulkDispatchPlay={handleBulkDispatchPlay}
                isBulkPlayingDispatches={isBulkPlayingDispatches}
                setConfirmDeleteDispatch={setConfirmDeleteDispatch}
                setSelectedDispatchIds={setSelectedDispatchIds}
              />

              {/* Table List */}
              <div className="flex-1 overflow-auto px-8 pb-8 custom-scrollbar">
                <div className="pt-2">
                  <table className="w-full text-left border-separate border-spacing-y-3">
                    <thead className="sticky top-0 z-20 bg-[#1a1b23]/95 backdrop-blur-md shadow-sm">
                      <tr className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] px-4">
                        <th className="px-6 py-4 w-10">
                          <input
                            type="checkbox"
                            onChange={(e) => handleSelectAllDispatches(e, Array.isArray(dispatchHistory) ? dispatchHistory : [])}
                            checked={selectedDispatchIds.length > 0 && Array.isArray(dispatchHistory) && selectedDispatchIds.length === dispatchHistory.length}
                            className="w-4 h-4 rounded border-white/20 bg-white/5 text-indigo-600 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                          />
                        </th>
                        <th className="px-6 py-4">Destinatário</th>
                        <th className="px-6 py-4">Status / Ações</th>
                        <th className="px-6 py-4">Evento / Template</th>
                        <th className="px-6 py-4 text-right">Execução / Timestamps</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.02]">
                      {(Array.isArray(dispatchHistory) ? dispatchHistory : []).map((item) => (
                        <DispatchTableRow
                          key={item.id}
                          item={item}
                          selectedDispatchIds={selectedDispatchIds}
                          handleToggleSelectDispatch={handleToggleSelectDispatch}
                          setSelectedDispatch={setSelectedDispatch}
                          setIsPipelineModalOpen={setIsPipelineModalOpen}
                          handlePlayDispatch={handlePlayDispatch}
                          isPlaying={isPlaying}
                          setConfirmDeleteDispatch={setConfirmDeleteDispatch}
                          isCancelling={isCancelling}
                          fetchChildren={fetchChildren}
                        />
                      ))}
                    </tbody>
                  </table>

                  {/* Pagination Controls */}
                  <div className="mt-8 flex flex-col md:flex-row items-center justify-between gap-6 pb-4">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Mostrar:</span>
                        <select
                          value={dispatchLimit}
                          onChange={(e) => {
                            setDispatchLimit(Number(e.target.value));
                            setDispatchPage(1);
                          }}
                          className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs font-bold text-white outline-none focus:ring-1 focus:ring-indigo-500/50 cursor-pointer"
                        >
                          <option value="20" className="bg-[#0b1120]">20</option>
                          <option value="50" className="bg-[#0b1120]">50</option>
                          <option value="100" className="bg-[#0b1120]">100</option>
                        </select>
                      </div>
                      <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">
                        Total: <span className="text-white">{dispatchTotal}</span> registros
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setDispatchPage(prev => Math.max(1, prev - 1))}
                        disabled={dispatchPage === 1}
                        className="p-2.5 bg-white/5 border border-white/10 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95"
                      >
                        <FiChevronDown className="rotate-90" />
                      </button>

                      <div className="flex items-center gap-1">
                        {[...Array(totalPages)].map((_, i) => {
                          const p = i + 1;
                          if (
                            p === 1 ||
                            p === totalPages ||
                            (p >= dispatchPage - 2 && p <= dispatchPage + 2)
                          ) {
                            return (
                              <button
                                key={p}
                                type="button"
                                onClick={() => setDispatchPage(p)}
                                className={`w-10 h-10 rounded-xl text-[11px] font-black transition-all active:scale-90 ${dispatchPage === p ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-white/5'}`}
                              >
                                {p}
                              </button>
                            );
                          }
                          if (p === dispatchPage - 3 || p === dispatchPage + 3) {
                            return <span key={p} className="text-gray-600">...</span>;
                          }
                          return null;
                        })}
                      </div>

                      <button
                        type="button"
                        onClick={() => setDispatchPage(prev => Math.max(1, Math.min(totalPages, prev + 1)))}
                        disabled={dispatchPage >= totalPages}
                        className="p-2.5 text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-all disabled:opacity-20 disabled:cursor-not-allowed group/btn"
                      >
                        <FiChevronDown className="-rotate-90" />
                      </button>
                    </div>
                  </div>

                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/5 bg-[#0f172a]/50 flex justify-between items-center px-8 shrink-0">
          <div className="text-xs text-gray-500 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            Monitoramento em tempo real ativo
          </div>
          <div className="flex items-center gap-6">
            <button
              type="button"
              onClick={() => fetchDispatches(integration.id, dispatchPage, dispatchLimit, dispatchSearch, dispatchEventFilter, dispatchStartDate, dispatchEndDate)}
              className="flex items-center gap-2 text-[10px] font-black text-white/40 hover:text-white tracking-widest uppercase transition-colors"
            >
              <FiRefreshCw size={12} /> Atualizar Fila
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-8 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl text-[10px] font-black tracking-widest uppercase border border-white/10 transition-all active:scale-95"
            >
              Fechar Painel
            </button>
          </div>
        </div>

      </div>
    </div>,
    document.body
  );
};

export default DispatchHistoryModal;
