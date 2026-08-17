import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { FiAlertCircle, FiRefreshCw } from 'react-icons/fi';
import PaginationControls from '../../components/PaginationControls';

export default function ChatLogsModal({
  showChatLogsTable,
  setShowChatLogsTable,
  loadingChatLogs,
  fetchChatLogs,
  setChatLogsPage,
  chatLogs = [],
  chatLogsPage,
  chatLogsLimit,
  chatLogsTotal,
  setChatLogsLimit
}) {
  const [chatContactFilter, setChatContactFilter] = useState('');
  const [chatStatusFilter, setChatStatusFilter] = useState('');
  const [chatOriginFilter, setChatOriginFilter] = useState('');

  if (!showChatLogsTable) return null;

  return ReactDOM.createPortal(
    <div className="fixed top-0 left-0 w-screen h-screen z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#111827] rounded-2xl border border-gray-200 dark:border-white/10 w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
        {/* Header do Modal */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-white/5 bg-gray-50 dark:bg-[#1f2937]/30 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-gray-800 dark:text-white uppercase tracking-wider flex items-center gap-2">
              Logs de Integração de Mensagens (AgentFlow)
              {loadingChatLogs && <div className="w-3 h-3 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>}
            </h3>
            <button
              type="button"
              onClick={() => { setChatLogsPage(0); fetchChatLogs(); }}
              className="text-xs text-indigo-600 hover:underline font-semibold cursor-pointer"
            >
              Atualizar
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            <input
              type="text"
              placeholder="Filtrar por contato..."
              value={chatContactFilter}
              onChange={(e) => setChatContactFilter(e.target.value)}
              className="flex-1 min-w-[140px] px-3 py-1.5 text-xs border border-gray-300 dark:border-white/10 rounded-lg bg-white dark:bg-[#1f2937]/50 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            />
            <select
              value={chatOriginFilter}
              onChange={(e) => setChatOriginFilter(e.target.value)}
              style={{ colorScheme: 'dark' }}
              className="px-3 py-1.5 text-xs border border-gray-300 dark:border-white/10 rounded-lg bg-white dark:bg-[#1f2937] text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all cursor-pointer"
            >
              <option value="">Todas as origens</option>
              <option value="contact">Contact</option>
              <option value="user">Cliente</option>
            </select>
            <select
              value={chatStatusFilter}
              onChange={(e) => setChatStatusFilter(e.target.value)}
              style={{ colorScheme: 'dark' }}
              className="px-3 py-1.5 text-xs border border-gray-300 dark:border-white/10 rounded-lg bg-white dark:bg-[#1f2937] text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all cursor-pointer"
            >
              <option value="">Todos os status</option>
              <option value="success">Enviado</option>
              <option value="failed">Erro</option>
            </select>
            {(chatContactFilter || chatOriginFilter || chatStatusFilter) && (
              <button
                type="button"
                onClick={() => { setChatContactFilter(''); setChatOriginFilter(''); setChatStatusFilter(''); }}
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
              {chatLogs.length === 0 && !loadingChatLogs ? (
                <div className="p-12 text-center text-gray-400 text-sm italic">
                  Nenhum log de integração de mensagens disponível.
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-100 dark:bg-[#1f2937]/80 text-gray-600 dark:text-gray-400 border-b border-gray-200 dark:border-white/5">
                    <tr>
                      <th className="px-4 py-3 font-bold uppercase tracking-wider">Data</th>
                      <th className="px-4 py-3 font-bold uppercase tracking-wider">Contato</th>
                      <th className="px-4 py-3 font-bold uppercase tracking-wider">Origem</th>
                      <th className="px-4 py-3 font-bold uppercase tracking-wider">Conteúdo</th>
                      <th className="px-4 py-3 font-bold uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {loadingChatLogs ? (
                      Array(4).fill(0).map((_, i) => (
                        <tr key={i} className="animate-pulse">
                          <td colSpan="5" className="px-4 py-5">
                            <div className="h-2.5 bg-gray-200 dark:bg-[#1f2937]/50 rounded w-full"></div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      chatLogs.filter(log => {
                        if (chatContactFilter && !(log.phone && log.phone.includes(chatContactFilter))) return false;
                        if (chatOriginFilter && log.sender_type !== chatOriginFilter) return false;
                        if (chatStatusFilter) {
                          const s = log.status;
                          if (chatStatusFilter === 'success' && s !== 'success' && s !== 'sent') return false;
                          if (chatStatusFilter === 'failed' && s !== 'failed') return false;
                        }
                        return true;
                      }).map((log) => (
                        <tr key={log.id} className="hover:bg-white dark:hover:bg-gray-800/50 transition-colors">
                          <td className="px-4 py-3 text-gray-400 font-mono whitespace-nowrap">
                            {new Date(log.timestamp).toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', year:'2-digit', hour:'2-digit', minute:'2-digit', second:'2-digit' })}
                          </td>
                          <td className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">
                            {log.phone}
                          </td>
                          <td className="px-4 py-3 text-gray-400 capitalize">
                            {log.sender_type === 'user' ? 'Cliente' : log.sender_type === 'agent' ? 'Agente' : log.sender_type}
                          </td>
                          <td className="px-4 py-3 text-gray-500 dark:text-gray-400 max-w-[300px] truncate" title={log.content}>
                            {log.content || '-'}
                          </td>
                          <td className="px-4 py-3">
                            {log.status === 'sent' || log.status === 'success' ? (
                              <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 font-bold uppercase text-[10px]">Enviado</span>
                            ) : log.status === 'cancelled' || log.status === 'canceled' ? (
                              <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 font-bold uppercase text-[10px] inline-flex items-center gap-1" title={log.error}>
                                <FiAlertCircle /> Cancelado
                              </span>
                            ) : log.status === 'failed' ? (
                              <span className="px-2 py-0.5 rounded bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 font-bold uppercase text-[10px] inline-flex items-center gap-1" title={log.error}>
                                <FiAlertCircle /> Erro
                              </span>
                            ) : log.status === 'sending' ? (
                              <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 font-bold uppercase text-[10px] inline-flex items-center gap-1">
                                <FiRefreshCw className="animate-spin" /> Enviando
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
          {!loadingChatLogs && chatLogs.length > 0 && (
            <PaginationControls 
              page={chatLogsPage} 
              limit={chatLogsLimit} 
              total={chatLogsTotal} 
              onPageChange={setChatLogsPage} 
              onLimitChange={setChatLogsLimit} 
            />
          )}
        </div>

        {/* Footer com botão único de Fechar */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-white/5 flex justify-end bg-gray-50 dark:bg-[#1f2937]/30">
          <button
            type="button"
            onClick={() => setShowChatLogsTable(false)}
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
