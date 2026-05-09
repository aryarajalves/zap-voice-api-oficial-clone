import React from 'react';
import { FiSettings, FiTrash2, FiPlay, FiDownload, FiUpload } from 'react-icons/fi';

const HistoryHeader = ({
  integration,
  webhookHistoryLength,
  selectedHistoryIds,
  setConfirmDeleteHistory,
  setConfirmResendHistory,
  handleExportHistory,
  handleImportHistory
}) => {
  return (
    <div className="p-6 border-b border-gray-100 dark:border-white/5 flex justify-between items-center bg-white/90 dark:bg-[#0f172a]/90 backdrop-blur shadow-sm sticky top-0 z-20">
      <div className="flex items-center gap-4">
        <h3 className="text-xl font-bold flex items-center gap-2 text-gray-900 dark:text-white">
          <FiSettings className="text-blue-500 animate-spin-slow" /> Histórico: {integration?.name}
        </h3>
        {webhookHistoryLength > 0 && (
          <div className="flex items-center gap-3 border-l border-gray-200 dark:border-gray-700 pl-4">
            <button
              onClick={() => setConfirmDeleteHistory({ isOpen: true, type: 'clear' })}
              className="text-[11px] font-bold text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 transition-all flex items-center gap-1.5 uppercase tracking-wider bg-red-50 dark:bg-red-900/10 px-3 py-1.5 rounded-lg active:scale-95"
            >
              <FiTrash2 size={13} /> Limpar Tudo
            </button>
            {selectedHistoryIds.length > 0 && (
              <div className="flex items-center gap-2 animate-in slide-in-from-left-2 duration-300">
                <button
                  onClick={() => setConfirmResendHistory({ isOpen: true, ids: selectedHistoryIds })}
                  className="text-[11px] font-bold bg-blue-600 text-white px-4 py-1.5 rounded-lg hover:bg-blue-700 transition-all flex items-center gap-1.5 uppercase tracking-wider shadow-lg shadow-blue-600/20 active:scale-95"
                >
                  <FiPlay size={13} fill="currentColor" /> Reenviar Selecionados ({selectedHistoryIds.length})
                </button>
                <button
                  onClick={() => setConfirmDeleteHistory({ isOpen: true, type: 'bulk', ids: selectedHistoryIds })}
                  className="text-[11px] font-bold bg-red-600 text-white px-4 py-1.5 rounded-lg hover:bg-red-700 transition-all flex items-center gap-1.5 uppercase tracking-wider shadow-lg shadow-red-600/20 active:scale-95"
                >
                  <FiTrash2 size={13} /> Apagar Selecionados ({selectedHistoryIds.length})
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={handleExportHistory}
          title="Exportar histórico como JSON"
          className="text-[11px] font-bold text-emerald-500 hover:text-white dark:text-emerald-400 transition-all flex items-center gap-1.5 uppercase tracking-wider bg-emerald-50 dark:bg-emerald-900/10 hover:bg-emerald-500 px-3 py-1.5 rounded-lg active:scale-95"
        >
          <FiDownload size={13} /> Exportar
        </button>
        <label
          title="Importar histórico de um arquivo JSON"
          className="cursor-pointer text-[11px] font-bold text-violet-500 hover:text-white dark:text-violet-400 transition-all flex items-center gap-1.5 uppercase tracking-wider bg-violet-50 dark:bg-violet-900/10 hover:bg-violet-500 px-3 py-1.5 rounded-lg active:scale-95"
        >
          <FiUpload size={13} /> Importar
          <input type="file" accept=".json" className="hidden" onChange={(e) => { handleImportHistory(e.target.files[0]); e.target.value = ''; }} />
        </label>
      </div>
    </div>
  );
};

export default HistoryHeader;
