import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { FiZap } from 'react-icons/fi';
import {
  FiltersBar,
  BulkActionsBar,
  DispatchModalHeader,
  DispatchStatsBar,
  DispatchTable,
  DispatchPagination,
  DispatchModalFooter
} from './components';

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
  dispatchStatusFilter,
  setDispatchStatusFilter,
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
  fetchChildren,
  dispatchStats,
  dispatchTemplateFilter,
  setDispatchTemplateFilter,
  distinctTemplates,
  onNavigateToChat
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
        dispatchTypeFilter,
        dispatchTemplateFilter,
        dispatchStatusFilter
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
    dispatchTemplateFilter,
    dispatchStatusFilter,
    fetchDispatches
  ]);

  if (!isOpen || !integration) return null;

  const totalPages = Math.ceil(dispatchTotal / (dispatchLimit || 20)) || 1;
  const hasHistory = Array.isArray(dispatchHistory) && dispatchHistory.length > 0;

  const handleRefresh = () => {
    fetchDispatches(
      integration.id,
      dispatchPage,
      dispatchLimit,
      dispatchSearch,
      dispatchEventFilter,
      dispatchStartDate,
      dispatchEndDate,
      dispatchTypeFilter,
      dispatchTemplateFilter,
      dispatchStatusFilter
    );
  };

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-[#1e293b] border border-white/5 rounded-[2.5rem] w-full max-w-6xl h-full max-h-[90vh] flex flex-col shadow-[0_0_100px_rgba(30,58,138,0.2)] overflow-hidden animate-in zoom-in-95 duration-300">
        
        {/* Header */}
        <DispatchModalHeader integrationName={integration.name} />

        <div className="p-0 flex-1 overflow-hidden relative flex flex-col">
          {/* Stats Bar */}
          <DispatchStatsBar dispatchStats={dispatchStats} />

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
            dispatchStatusFilter={dispatchStatusFilter}
            setDispatchStatusFilter={setDispatchStatusFilter}
            dispatchStartDate={dispatchStartDate}
            setDispatchStartDate={setDispatchStartDate}
            dispatchEndDate={dispatchEndDate}
            setDispatchEndDate={setDispatchEndDate}
            fetchDispatches={fetchDispatches}
            integrationId={integration.id}
            dispatchLimit={dispatchLimit}
            dispatchTemplateFilter={dispatchTemplateFilter}
            setDispatchTemplateFilter={setDispatchTemplateFilter}
            distinctTemplates={distinctTemplates}
          />

          {loadingDispatchHistory ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4">
              <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
              <p className="text-gray-500 font-bold tracking-widest text-xs">CARREGANDO FILA...</p>
            </div>
          ) : !hasHistory ? (
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
                  <DispatchTable
                    dispatchHistory={dispatchHistory}
                    selectedDispatchIds={selectedDispatchIds}
                    handleSelectAllDispatches={handleSelectAllDispatches}
                    handleToggleSelectDispatch={handleToggleSelectDispatch}
                    setSelectedDispatch={setSelectedDispatch}
                    setIsPipelineModalOpen={setIsPipelineModalOpen}
                    handlePlayDispatch={handlePlayDispatch}
                    isPlaying={isPlaying}
                    setConfirmDeleteDispatch={setConfirmDeleteDispatch}
                    isCancelling={isCancelling}
                    fetchChildren={fetchChildren}
                    onNavigateToChat={onNavigateToChat}
                  />

                  {/* Pagination Controls */}
                  <DispatchPagination
                    dispatchLimit={dispatchLimit}
                    setDispatchLimit={setDispatchLimit}
                    dispatchPage={dispatchPage}
                    setDispatchPage={setDispatchPage}
                    dispatchTotal={dispatchTotal}
                    totalPages={totalPages}
                  />
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <DispatchModalFooter onRefresh={handleRefresh} onClose={onClose} />

      </div>
    </div>,
    document.body
  );
};

export default DispatchHistoryModal;
