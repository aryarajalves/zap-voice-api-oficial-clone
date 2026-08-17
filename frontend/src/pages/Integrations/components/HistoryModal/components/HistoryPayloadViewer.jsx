import React from 'react';
import { FiCopy, FiEdit2, FiMaximize2 } from 'react-icons/fi';
import { toast } from 'react-hot-toast';

export default function HistoryPayloadViewer({
  item,
  setEditJsonModal,
  setMaximizedJson
}) {
  const jsonString = JSON.stringify(item.payload, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonString);
    toast.success("JSON copiado!");
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-gray-600"></div>
          Payload Recebido
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleCopy}
            className="text-[10px] font-bold bg-white dark:bg-[#1e293b] hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 px-3 py-1.5 rounded-lg transition-all border border-gray-200 dark:border-white/5 flex items-center gap-1.5 active:scale-95"
          >
            <FiCopy size={11} /> Copiar
          </button>
          <button
            type="button"
            onClick={() => setEditJsonModal({ isOpen: true, data: jsonString, id: item.id })}
            className="text-[10px] font-bold bg-white dark:bg-[#1e293b] hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-3 py-1.5 rounded-lg transition-all border border-blue-200 dark:border-blue-800/50 flex items-center gap-1.5 active:scale-95 shadow-sm shadow-blue-500/5"
          >
            <FiEdit2 size={11} /> Editar JSON
          </button>
          <button
            type="button"
            onClick={() => setMaximizedJson(item.payload)}
            className="text-[10px] font-bold bg-white dark:bg-[#1e293b] hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 px-3 py-1.5 rounded-lg transition-all border border-gray-200 dark:border-white/5 flex items-center gap-1.5 active:scale-95"
          >
            <FiMaximize2 size={11} /> Maximizar
          </button>
        </div>
      </div>

      <pre className="text-[11px] font-mono p-4 bg-[#0b1120] text-white rounded-xl overflow-auto max-h-60 border border-white/5 scrollbar-thin scrollbar-thumb-white/10 dark:text-white shadow-inner">
        {jsonString}
      </pre>
    </div>
  );
}
