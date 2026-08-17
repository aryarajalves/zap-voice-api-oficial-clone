import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { FiAlertCircle } from 'react-icons/fi';
import PaginationControls from '../../components/PaginationControls';

export default function MemoryLogsModal({
  showMemoryLogsTable,
  setShowMemoryLogsTable,
  loadingMemoryLogs,
  fetchMemoryLogs,
  setMemoryLogsPage,
  memoryLogs = [],
  memoryLogsPage,
  memoryLogsLimit,
  memoryLogsTotal,
  setMemoryLogsLimit
}) {
  const [memoryContactFilter, setMemoryContactFilter] = useState('');
  const [memoryStatusFilter, setMemoryStatusFilter] = useState('');
  const [memoryDateFilter, setMemoryDateFilter] = useState('');
  const [memoryKindFilter, setMemoryKindFilter] = useState('');

  if (!showMemoryLogsTable) return null;

  return ReactDOM.createPortal(
    <div className="fixed top-0 left-0 w-screen h-screen z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#111827] rounded-2xl border border-gray-200 dark:border-white/10 w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
        {/* Header do Modal */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-white/5 bg-gray-50 dark:bg-[#1f2937]/30 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-gray-800 dark:text-white uppercase tracking-wider flex items-center gap-2">
              Logs de Sincronização de Memória
              {loadingMemoryLogs && <div className="w-3 h-3 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>}
            </h3>
            <button
              type="button"
              onClick={() => { setMemoryLogsPage(0); fetchMemoryLogs(); }}
              className="text-xs text-cyan-600 hover:underline font-semibold cursor-pointer"
            >
              Atualizar
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            <input
              type="text"
              placeholder="Filtrar por contato..."
              value={memoryContactFilter}
              onChange={(e) => setMemoryContactFilter(e.target.value)}
              className="flex-1 min-w-[140px] px-3 py-1.5 text-xs border border-gray-300 dark:border-white/10 rounded-lg bg-white dark:bg-[#1f2937]/50 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-cyan-500 outline-none transition-all"
            />
            <select
              value={memoryKindFilter}
              onChange={(e) => setMemoryKindFilter(e.target.value)}
              style={{ colorScheme: 'dark' }}
              className="px-3 py-1.5 text-xs border border-gray-300 dark:border-white/10 rounded-lg bg-white dark:bg-[#1f2937] text-gray-900 dark:text-white focus:ring-2 focus:ring-cyan-500 outline-none transition-all cursor-pointer"
            >
              <option value="">Todos os tipos</option>
              <option value="template">Template</option>
              <option value="funil">Nó de Funil</option>
              <option value="disparo_sessao">Disparo (Sessão)</option>
              <option value="direto">Direto</option>
            </select>
            <select
              value={memoryStatusFilter}
              onChange={(e) => setMemoryStatusFilter(e.target.value)}
              style={{ colorScheme: 'dark' }}
              className="px-3 py-1.5 text-xs border border-gray-300 dark:border-white/10 rounded-lg bg-white dark:bg-[#1f2937] text-gray-900 dark:text-white focus:ring-2 focus:ring-cyan-500 outline-none transition-all cursor-pointer"
            >
              <option value="">Todos os status</option>
              <option value="sent">Enviado</option>
              <option value="failed">Erro</option>
            </select>
            <input
              type="date"
              value={memoryDateFilter}
              onChange={(e) => setMemoryDateFilter(e.target.value)}
              className="px-3 py-1.5 text-xs border border-gray-300 dark:border-white/10 rounded-lg bg-white dark:bg-[#1f2937]/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-cyan-500 outline-none transition-all cursor-pointer"
            />
            {(memoryContactFilter || memoryStatusFilter || memoryDateFilter || memoryKindFilter) && (
              <button
                type="button"
                onClick={() => { setMemoryContactFilter(''); setMemoryStatusFilter(''); setMemoryDateFilter(''); setMemoryKindFilter(''); }}
                className="px-2.5 py-1.5 text-[10px] font-bold text-gray-500 hover:text-red-500 border border-gray-300 dark:border-white/10 rounded-lg transition-all whitespace-nowrap cursor-pointer"
              >
                Limpar
              </button>
            )}
          </div>
        </div>

        {/* Corpo com Tabela e Scroll */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-white/5 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              {memoryLogs.length === 0 && !loadingMemoryLogs ? (
                <div className="p-12 text-center text-gray-400 text-sm italic">
                  Nenhum log de memória disponível.
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-100 dark:bg-[#1f2937]/80 text-gray-600 dark:text-gray-400 border-b border-gray-200 dark:border-white/5">
                    <tr>
                      <th className="px-4 py-3 font-bold uppercase tracking-wider">Data</th>
                      <th className="px-4 py-3 font-bold uppercase tracking-wider">Contato</th>
                      <th className="px-4 py-3 font-bold uppercase tracking-wider">Tipo</th>
                      <th className="px-4 py-3 font-bold uppercase tracking-wider">Conteúdo</th>
                      <th className="px-4 py-3 font-bold uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {loadingMemoryLogs ? (
                      Array(4).fill(0).map((_, i) => (
                        <tr key={i} className="animate-pulse">
                          <td colSpan="5" className="px-4 py-5">
                            <div className="h-2.5 bg-gray-200 dark:bg-[#1f2937]/50 rounded w-full"></div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      memoryLogs.filter(log => {
                        if (memoryContactFilter && !(log.phone && log.phone.includes(memoryContactFilter))) return false;
                        if (memoryKindFilter && log.kind !== memoryKindFilter) return false;
                        if (memoryStatusFilter) {
                          const s = log.status;
                          if (memoryStatusFilter === 'sent' && s !== 'sent' && s !== 'success') return false;
                          if (memoryStatusFilter === 'failed' && s !== 'failed') return false;
                        }
                        if (memoryDateFilter && log.timestamp) {
                          const logDate = new Date(log.timestamp).toLocaleDateString('en-CA');
                          if (logDate !== memoryDateFilter) return false;
                        }
                        return true;
                      }).map((log) => (
                        <tr key={log.id} className="hover:bg-white dark:hover:bg-gray-800/50 transition-colors">
                          <td className="px-4 py-3 text-gray-400 font-mono whitespace-nowrap">
                            {new Date(log.timestamp).toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', year:'2-digit', hour:'2-digit', minute:'2-digit', second:'2-digit' })}
                          </td>
                          <td className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
                            {log.phone}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {log.kind === 'template' ? (
                              <span className="px-2 py-0.5 rounded bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400 font-bold uppercase text-[10px]">Template</span>
                            ) : log.kind === 'funil' ? (
                              <span className="px-2 py-0.5 rounded bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400 font-bold uppercase text-[10px]">Nó de Funil</span>
                            ) : log.kind === 'interacao' ? (
                              <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 font-bold uppercase text-[10px]">Interação</span>
                            ) : log.kind === 'disparo_sessao' ? (
                              <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 font-bold uppercase text-[10px]">Disparo (Sessão)</span>
                            ) : (
                              <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-500 dark:bg-[#1f2937]/80 dark:text-gray-400 font-bold uppercase text-[10px]">
                                {log.message_type || 'Direto'}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-gray-500 dark:text-gray-400 max-w-[260px] truncate" title={log.content}>
                            {log.content || (log.template_name ? `[Template: ${log.template_name}]` : '-')}
                          </td>
                          <td className="px-4 py-3">
                            {log.status === 'sent' || log.status === 'success' ? (
                              <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 font-bold uppercase text-[10px]">Enviado</span>
                            ) : log.status === 'failed' ? (
                              <span className="px-2 py-0.5 rounded bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 font-bold uppercase text-[10px] inline-flex items-center gap-1" title={log.error}>
                                <FiAlertCircle /> Erro
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-500 dark:bg-[#1f2937]/80 dark:text-gray-400 font-bold uppercase text-[10px]">{log.status}</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Paginação */}
          {!loadingMemoryLogs && memoryLogs.length > 0 && (
            <PaginationControls 
              page={memoryLogsPage} 
              limit={memoryLogsLimit} 
              total={memoryLogsTotal} 
              onPageChange={setMemoryLogsPage} 
              onLimitChange={setMemoryLogsLimit} 
            />
          )}
        </div>

        {/* Footer com botão único de Fechar */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-white/5 flex justify-end bg-gray-50 dark:bg-[#1f2937]/30">
          <button
            type="button"
            onClick={() => setShowMemoryLogsTable(false)}
            className="px-5 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-white/5 dark:hover:bg-white/10 text-gray-700 dark:text-gray-200 text-sm font-semibold rounded-lg transition-all cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
