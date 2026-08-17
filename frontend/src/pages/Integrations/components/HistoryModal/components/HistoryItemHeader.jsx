import React from 'react';
import { FiTrash2, FiPlay, FiZap } from 'react-icons/fi';
import { EVENT_TYPES } from '../../../constants';

export default function HistoryItemHeader({
  item,
  selectedHistoryIds,
  handleToggleSelect,
  handleResendWebhook,
  isResending,
  setConfirmDeleteHistory
}) {
  return (
    <div className="p-5 flex justify-between items-center bg-gray-50/50 dark:bg-[#0f172a]/40 border-b border-gray-200 dark:border-white/5">
      <div className="flex items-center gap-5">
        <input
          type="checkbox"
          className="w-5 h-5 rounded-md border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer transition-all active:scale-90"
          checked={selectedHistoryIds.includes(item?.id)}
          onChange={() => handleToggleSelect(item?.id)}
        />
        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
          item.status === 'processed' ? 'bg-green-100 text-green-700 dark:bg-green-400/10 dark:text-green-400' :
          item.status === 'error' ? 'bg-red-100 text-red-700 dark:bg-red-400/10 dark:text-red-400' :
          item.status === 'skipped' ? 'bg-amber-100 text-amber-700 dark:bg-amber-400/10 dark:text-amber-400' :
          'bg-gray-100 text-gray-700 dark:bg-gray-400/10 dark:text-gray-400'
        }`}>
          {item.status === 'processed' ? 'Processado' :
           item.status === 'error' ? 'Erro' :
           item.status === 'skipped' ? 'Sem Mapeamento' :
           item.status === 'pending' ? 'Pendente' :
           item.status === 'ignored' ? 'Ignorado' :
           item.status === 'received' ? 'Recebido' :
           item.status}
        </span>
        {item.processed_data?.is_stress_test && (
          <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-violet-500/10 text-violet-400 border border-violet-500/20 flex items-center gap-1">
            <FiZap size={10} fill="currentColor" /> Teste de Escala
          </span>
        )}
        <span className="text-xs text-gray-500 font-mono font-medium">
          {new Date(item.created_at).toLocaleString()}
        </span>
        <span className="px-3 py-1 bg-blue-50 dark:bg-blue-400/5 rounded-full text-xs font-bold text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-400/10">
          {EVENT_TYPES.find(e => e.value === item.event_type)?.label || item.event_type || 'Evento não detectado'}
        </span>
        {item.duplicate_count > 0 && (
          <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-red-500/10 text-red-400 border border-red-500/20">
            +{item.duplicate_count} Duplicidades Evitadas
          </span>
        )}
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => handleResendWebhook(item.id)}
          disabled={isResending}
          className="text-[11px] font-black bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 transition-all active:scale-95 shadow-lg shadow-blue-500/20 uppercase tracking-wider"
        >
          <FiPlay size={11} fill="currentColor" /> Reenviar
        </button>
        <button
          type="button"
          onClick={() => setConfirmDeleteHistory({ isOpen: true, type: 'single', id: item.id })}
          className="p-2.5 text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-all active:scale-90"
          title="Excluir Registro"
        >
          <FiTrash2 size={16} />
        </button>
      </div>
    </div>
  );
}
