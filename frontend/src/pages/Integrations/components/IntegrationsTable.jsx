import React from 'react';
import { FiCopy, FiActivity, FiPlay, FiZap, FiEdit2, FiTrash2 } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { WEBHOOK_BASE_URL } from '../../../config';

export default function IntegrationsTable({
  loading,
  filteredIntegrations,
  paginatedIntegrations,
  listPageSize,
  setListPageSize,
  listCurrentPage,
  setListCurrentPage,
  safePage,
  totalPages,
  filterPlatform,
  totalIntegrationsCount,
  onOpenHistory,
  onOpenDispatchHistory,
  onOpenTestModal,
  onOpenEditModal,
  onOpenDeleteModal
}) {
  return (
    <>
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-gray-100 dark:border-gray-800/50">
            <th className="px-4 py-3 text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]">Nome</th>
            <th className="px-4 py-3 text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]">Plataforma</th>
            <th className="px-4 py-3 text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]">Webhook URL</th>
            <th className="px-4 py-3 text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]">Gatilhos</th>
            <th className="px-4 py-3 text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]">Histórico</th>
            <th className="px-4 py-3 text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] text-right">Ações</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
          {loading ? (
            <tr><td colSpan="6" className="px-8 py-20 text-center text-gray-500 italic">Carregando integrações...</td></tr>
          ) : filteredIntegrations.length === 0 ? (
            <tr><td colSpan="6" className="px-8 py-20 text-center text-gray-500 italic">Nenhuma integração encontrada.</td></tr>
          ) : paginatedIntegrations.map((item) => (
            <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-white/[0.01] transition-all group">
              <td className="px-4 py-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500 font-bold text-xs shrink-0">
                    {(item.name || '?').charAt(0).toUpperCase()}
                  </div>
                  <span className="font-bold text-sm text-gray-900 dark:text-white whitespace-nowrap">{item.name}</span>
                </div>
              </td>
              <td className="px-4 py-4">
                <span className="px-2 py-1 bg-gray-100 dark:bg-gray-800 text-blue-600 dark:text-blue-400 rounded-lg text-[10px] font-black uppercase tracking-widest whitespace-nowrap">
                  {item.platform}
                </span>
              </td>
              <td className="px-4 py-4">
                <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-800 px-2 py-1.5 rounded-lg border border-transparent group-hover:border-blue-500/20 transition-all w-[190px]">
                  <span className="truncate text-[10px] font-mono text-gray-500 dark:text-gray-400">
                    {`${WEBHOOK_BASE_URL}/api/webhooks/${item.custom_slug || item.id}`}
                  </span>
                  <FiCopy
                    size={11}
                    className="cursor-pointer text-gray-400 hover:text-blue-500 transition-colors shrink-0"
                    onClick={() => {
                      navigator.clipboard.writeText(`${WEBHOOK_BASE_URL}/api/webhooks/${item.custom_slug || item.id}`);
                      toast.success('URL copiada!');
                    }}
                  />
                </div>
              </td>
              <td className="px-4 py-4">
                <span className="text-xs font-bold text-gray-700 dark:text-gray-300 whitespace-nowrap">
                  {(item.mappings || []).length} gatilhos
                </span>
              </td>
              <td className="px-4 py-4">
                <span className={`inline-flex items-center gap-1 text-xs font-black px-2 py-1 rounded-lg whitespace-nowrap ${
                  (item.history_count || 0) > 0
                    ? 'bg-blue-500/10 text-blue-400'
                    : 'bg-white/5 text-gray-500'
                }`}>
                  <FiActivity size={10} />
                  {(item.history_count || 0).toLocaleString('pt-BR')}
                </span>
              </td>
              <td className="px-4 py-4">
                <div className="flex items-center justify-end gap-1.5 flex-nowrap">
                  <button
                    onClick={() => onOpenDispatchHistory(item)}
                    className="shrink-0 text-[9px] font-black bg-indigo-500/10 text-indigo-500 px-2 py-1 rounded-md hover:bg-indigo-500 hover:text-white transition-all flex items-center gap-1 uppercase tracking-tighter whitespace-nowrap cursor-pointer"
                  >
                    <FiPlay size={10} /> Disparos
                  </button>
                  <button
                    onClick={() => onOpenHistory(item)}
                    className="shrink-0 text-[9px] font-black bg-blue-500/10 text-blue-500 px-2 py-1 rounded-md hover:bg-blue-500 hover:text-white transition-all flex items-center gap-1 uppercase tracking-tighter whitespace-nowrap cursor-pointer"
                  >
                    <FiActivity size={10} /> Histórico
                  </button>
                  <button
                    onClick={() => onOpenTestModal(item)}
                    className="shrink-0 text-[9px] font-black bg-emerald-500/10 text-emerald-500 px-2 py-1 rounded-md hover:bg-emerald-500 hover:text-white transition-all flex items-center gap-1 uppercase tracking-tighter whitespace-nowrap cursor-pointer"
                  >
                    <FiZap size={10} fill="currentColor" /> Testar
                  </button>
                  <button
                    onClick={() => onOpenEditModal(item)}
                    className="shrink-0 p-1 text-gray-400 hover:text-blue-500 transition-all active:scale-90 cursor-pointer"
                    title="Editar"
                  >
                    <FiEdit2 size={13} />
                  </button>
                  <button
                    onClick={() => onOpenDeleteModal(item)}
                    className="shrink-0 p-1 text-gray-400 hover:text-red-500 transition-all active:scale-90 cursor-pointer"
                    title="Excluir"
                  >
                    <FiTrash2 size={13} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Rodapé de Paginação */}
      {!loading && totalIntegrationsCount > 0 && (
        <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 dark:border-white/5">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Exibir</span>
            <select
              value={listPageSize}
              onChange={e => { setListPageSize(Number(e.target.value)); setListCurrentPage(1); }}
              className="bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 text-[11px] font-bold rounded-lg px-2 py-1 outline-none cursor-pointer"
            >
              {[5, 10, 20].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
            <span className="text-[10px] text-gray-400 font-medium">
              de {filteredIntegrations.length}{filterPlatform ? ` (${totalIntegrationsCount} total)` : ''} integrações
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setListCurrentPage(p => Math.max(1, p - 1))}
              disabled={safePage === 1}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-xs font-black cursor-pointer"
            >‹</button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button
                key={p}
                onClick={() => setListCurrentPage(p)}
                className={`w-7 h-7 flex items-center justify-center rounded-lg text-[11px] font-black transition-all cursor-pointer ${
                  p === safePage
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                    : 'text-gray-400 hover:text-white hover:bg-white/10'
                }`}
              >{p}</button>
            ))}

            <button
              onClick={() => setListCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={safePage === totalPages}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-xs font-black cursor-pointer"
            >›</button>
          </div>
        </div>
      )}
    </>
  );
}
