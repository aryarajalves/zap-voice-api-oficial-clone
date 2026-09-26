import React from 'react';
import { FiRefreshCw, FiTrash2, FiSlash } from 'react-icons/fi';

const BulkActionsBar = ({
  selectedDispatchIds,
  handleBulkDispatchPlay,
  isBulkPlayingDispatches,
  setConfirmDeleteDispatch,
  setSelectedDispatchIds,
  handleBulkBlockDispatchContacts,
  isBulkBlocking,
  onOpenBulkBlockModal
}) => {
  if (selectedDispatchIds.length === 0) return null;

  return (
    <div className="px-8 pt-4">
      <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex items-center justify-between animate-in slide-in-from-top-2 duration-300">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-500 text-white text-[10px] font-black px-2 py-1 rounded-lg">
            {selectedDispatchIds.length} SELECIONADOS
          </div>
          <p className="text-xs text-indigo-300 font-medium">O que deseja fazer com estes disparos?</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleBulkDispatchPlay}
            disabled={isBulkPlayingDispatches}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-[10px] font-black tracking-widest uppercase transition-all active:scale-95 disabled:opacity-50"
          >
            {isBulkPlayingDispatches ? <FiRefreshCw className="animate-spin" size={12} /> : <FiRefreshCw size={12} />}
            Reprocessar Selecionados
          </button>
          <button
            onClick={() => onOpenBulkBlockModal ? onOpenBulkBlockModal(selectedDispatchIds.length) : handleBulkBlockDispatchContacts()}
            disabled={isBulkBlocking}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 rounded-lg transition-all font-bold text-[10px] uppercase tracking-tighter disabled:opacity-50 cursor-pointer"
            title="Bloquear contatos selecionados na Blacklist"
          >
            {isBulkBlocking ? <FiRefreshCw className="animate-spin" size={12} /> : <FiSlash size={12} />}
            Bloquear ({selectedDispatchIds.length})
          </button>
          <button
            onClick={() => setConfirmDeleteDispatch({ isOpen: true, type: 'bulk', ids: selectedDispatchIds })}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all font-bold text-[10px] uppercase tracking-tighter"
          >
            <FiTrash2 size={12} /> Excluir ({selectedDispatchIds.length})
          </button>
          <button
            onClick={() => setSelectedDispatchIds([])}
            className="text-gray-500 hover:text-white text-[10px] font-black tracking-widest uppercase px-2"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};

export default BulkActionsBar;
