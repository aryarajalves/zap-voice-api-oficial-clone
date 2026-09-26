import React from 'react';
import DispatchTableRow from './DispatchTableRow';

const DispatchTable = ({
  dispatchHistory,
  selectedDispatchIds,
  handleSelectAllDispatches,
  handleToggleSelectDispatch,
  setSelectedDispatch,
  setIsPipelineModalOpen,
  handlePlayDispatch,
  isPlaying,
  setConfirmDeleteDispatch,
  isCancelling,
  fetchChildren,
  onNavigateToChat,
  handleBlockDispatchContact,
  handleUnblockDispatchContact,
  onOpenBlockModal,
  onOpenUnblockModal,
  isBlocking
}) => {
  const items = Array.isArray(dispatchHistory) ? dispatchHistory : [];
  const allSelected =
    selectedDispatchIds.length > 0 &&
    items.length > 0 &&
    selectedDispatchIds.length === items.length;

  return (
    <table className="w-full text-left border-separate border-spacing-y-3">
      <thead className="sticky top-0 z-20 bg-[#1a1b23]/95 backdrop-blur-md shadow-sm">
        <tr className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] px-4">
          <th className="px-6 py-4 w-10">
            <input
              type="checkbox"
              onChange={(e) => handleSelectAllDispatches(e, items)}
              checked={allSelected}
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
        {items.map((item) => (
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
            onNavigateToChat={onNavigateToChat}
            handleBlockDispatchContact={handleBlockDispatchContact}
            handleUnblockDispatchContact={handleUnblockDispatchContact}
            onOpenBlockModal={onOpenBlockModal}
            onOpenUnblockModal={onOpenUnblockModal}
            isBlocking={isBlocking}
          />
        ))}
      </tbody>
    </table>
  );
};

export default DispatchTable;
