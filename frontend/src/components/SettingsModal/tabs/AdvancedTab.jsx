import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { FiShare2, FiEyeOff, FiEye, FiChevronUp, FiChevronDown, FiAlertCircle, FiCopy } from 'react-icons/fi';
import PaginationControls from '../components/PaginationControls';

const AdvancedTab = ({
    user, formData, handleChange, visibleFields, handleRevealSetting,
    showContactsTable, setShowContactsTable, loadingContacts, fetchSyncedContacts, setContactsPage,
    syncedContacts, contactsPage, contactsLimit, contactsTotal, setContactsLimit,
    testingWebhook, handleTestWebhook, testingChatWebhook, handleTestChatWebhook, showMemoryLogsTable, setShowMemoryLogsTable,
    loadingMemoryLogs, fetchMemoryLogs, setMemoryLogsPage, memoryLogs,
    memoryLogsPage, memoryLogsLimit, memoryLogsTotal, setMemoryLogsLimit,
    showChatLogsTable, setShowChatLogsTable, loadingChatLogs, fetchChatLogs, setChatLogsPage,
    chatLogs, chatLogsPage, chatLogsLimit, chatLogsTotal, setChatLogsLimit
}) => {
    const [memoryContactFilter, setMemoryContactFilter] = useState('');
    const [memoryStatusFilter, setMemoryStatusFilter] = useState('');
    const [memoryDateFilter, setMemoryDateFilter] = useState('');
    const [memoryKindFilter, setMemoryKindFilter] = useState('');
    const [chatContactFilter, setChatContactFilter] = useState('');
    const [chatStatusFilter, setChatStatusFilter] = useState('');
    const [chatOriginFilter, setChatOriginFilter] = useState('');

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {['super_admin', 'admin', 'administrator', 'owner'].includes(user?.role) && (
                <>
                    {/* ManyChat API Key Section */}
                    <div className="space-y-4 mb-8">
                        <div className="flex items-center gap-2">
                            <span className="p-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
                                <FiShare2 className="h-5 w-5" />
                            </span>
                            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200">Integração ManyChat</h3>
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">API Token (Key)</label>
                            <div className="relative">
                                <input
                                    type={visibleFields['MANYCHAT_API_KEY'] ? "text" : "password"}
                                    name="MANYCHAT_API_KEY"
                                    value={formData.MANYCHAT_API_KEY || ''}
                                    onChange={handleChange}
                                    placeholder="976456:4994b0c91..."
                                    className="w-full p-2.5 pr-10 border border-gray-300 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all font-mono text-sm bg-white dark:bg-[#1f2937]/50 text-gray-900 dark:text-white"
                                    autoComplete="off"
                                />
                                <button
                                    type="button"
                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleRevealSetting('MANYCHAT_API_KEY'); }}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-500 transition-colors z-20"
                                    title={visibleFields['MANYCHAT_API_KEY'] ? "Esconder" : "Visualizar"}
                                >
                                    {visibleFields['MANYCHAT_API_KEY'] ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                                </button>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Token gerado no ManyChat em Settings {'>'} API.</p>
                        </div>
                    </div>




                    {/* Webhook Config */}
                    <div className="space-y-4 pt-4">
                        <div className="flex items-center gap-2">
                            <span className="p-1.5 bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400 rounded-lg">
                                <FiCopy className="h-5 w-5" />
                            </span>
                            <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200">Webhook de Memória do Agente</h3>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">URL do Webhook (POST)</label>
                            <div className="flex gap-2">
                                <input
                                    type="url"
                                    name="AGENT_MEMORY_WEBHOOK_URL"
                                    value={formData.AGENT_MEMORY_WEBHOOK_URL || ''}
                                    onChange={handleChange}
                                    placeholder="https://seu-n8n.com/webhook/memoria"
                                    className="flex-1 p-2.5 border border-gray-300 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-cyan-500 outline-none transition-all bg-white dark:bg-[#1f2937]/50 text-gray-900 dark:text-white"
                                />
                                <button
                                    type="button"
                                    disabled={testingWebhook || !formData.AGENT_MEMORY_WEBHOOK_URL}
                                    onClick={handleTestWebhook}
                                    className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold rounded-lg transition-all shadow-md disabled:opacity-50 flex items-center gap-2"
                                >
                                    {testingWebhook ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : "Testar"}
                                </button>
                            </div>
                        </div>
                        
                        {/* Botão para abrir Logs de Sincronização de Memória */}
                        <div className="pt-2">
                            <button
                                type="button"
                                onClick={() => { setShowMemoryLogsTable(true); setMemoryLogsPage(0); fetchMemoryLogs(); }}
                                className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 text-cyan-600 dark:text-cyan-400 text-xs font-semibold rounded-lg border border-gray-200 dark:border-white/5 transition-all shadow-sm"
                            >
                                <FiChevronDown className="h-4 w-4 transform -rotate-90 text-cyan-500" />
                                Logs de Sincronização de Memória
                            </button>
                        </div>
                    </div>

                    {/* Webhook de Integração de Mensagens (AgentFlow) */}
                    <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-white/5">
                        <div className="flex items-center gap-2">
                            <span className="p-1.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                </svg>
                            </span>
                            <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200">Webhook de Integração de Mensagens (AgentFlow)</h3>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">URL do Webhook (POST)</label>
                            <div className="flex gap-2">
                                <input
                                    type="url"
                                    name="CHAT_MESSAGES_WEBHOOK_URL"
                                    value={formData.CHAT_MESSAGES_WEBHOOK_URL || ''}
                                    onChange={handleChange}
                                    placeholder="https://seu-agentflow.com/webhook/mensagens"
                                    className="flex-1 p-2.5 border border-gray-300 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all bg-white dark:bg-[#1f2937]/50 text-gray-900 dark:text-white"
                                />
                                <button
                                    type="button"
                                    disabled={testingChatWebhook || !formData.CHAT_MESSAGES_WEBHOOK_URL}
                                    onClick={handleTestChatWebhook}
                                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-all shadow-md disabled:opacity-50 flex items-center gap-2"
                                >
                                    {testingChatWebhook ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : "Testar"}
                                </button>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Dispara o JSON de toda nova mensagem (entrada do cliente ou saída do agente) para este endereço.</p>
                        </div>
                        
                        {/* Botão para abrir Logs de Integração de Mensagens */}
                        <div className="pt-2">
                            <button
                                type="button"
                                onClick={() => { setShowChatLogsTable(true); setChatLogsPage(0); fetchChatLogs(); }}
                                className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 text-indigo-600 dark:text-indigo-400 text-xs font-semibold rounded-lg border border-gray-200 dark:border-white/5 transition-all shadow-sm"
                            >
                                <FiChevronDown className="h-4 w-4 transform -rotate-90 text-indigo-500" />
                                Logs de Integração de Mensagens
                            </button>
                        </div>
                    </div>
                </>
            )}

            {/* Modal de Logs de Sincronização de Memória (Popup Grande Centralizado) */}
            {showMemoryLogsTable && ReactDOM.createPortal(
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
                                    className="text-xs text-cyan-600 hover:underline font-semibold"
                                >
                                    Atualizar
                                </button>
                            </div>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    placeholder="Filtrar por contato..."
                                    value={memoryContactFilter}
                                    onChange={(e) => setMemoryContactFilter(e.target.value)}
                                    className="flex-1 px-3 py-1.5 text-xs border border-gray-300 dark:border-white/10 rounded-lg bg-white dark:bg-[#1f2937]/50 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-cyan-500 outline-none transition-all"
                                />
                                <select
                                    value={memoryKindFilter}
                                    onChange={(e) => setMemoryKindFilter(e.target.value)}
                                    style={{ colorScheme: 'dark' }}
                                    className="px-3 py-1.5 text-xs border border-gray-300 dark:border-white/10 rounded-lg bg-white dark:bg-[#1f2937] text-gray-900 dark:text-white focus:ring-2 focus:ring-cyan-500 outline-none transition-all"
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
                                    className="px-3 py-1.5 text-xs border border-gray-300 dark:border-white/10 rounded-lg bg-white dark:bg-[#1f2937] text-gray-900 dark:text-white focus:ring-2 focus:ring-cyan-500 outline-none transition-all"
                                >
                                    <option value="">Todos os status</option>
                                    <option value="sent">Enviado</option>
                                    <option value="failed">Erro</option>
                                </select>
                                <input
                                    type="date"
                                    value={memoryDateFilter}
                                    onChange={(e) => setMemoryDateFilter(e.target.value)}
                                    className="px-3 py-1.5 text-xs border border-gray-300 dark:border-white/10 rounded-lg bg-white dark:bg-[#1f2937]/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-cyan-500 outline-none transition-all"
                                />
                                {(memoryContactFilter || memoryStatusFilter || memoryDateFilter || memoryKindFilter) && (
                                    <button
                                        type="button"
                                        onClick={() => { setMemoryContactFilter(''); setMemoryStatusFilter(''); setMemoryDateFilter(''); setMemoryKindFilter(''); }}
                                        className="px-2.5 py-1.5 text-[10px] font-bold text-gray-500 hover:text-red-500 border border-gray-300 dark:border-white/10 rounded-lg transition-all whitespace-nowrap"
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
                                                            <td colSpan="4" className="px-4 py-5">
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

                        {/* Footer com botão único de Fechar (Conforme regra de Experiência de Usuário: 1 botão de fechar/cancelar) */}
                        <div className="px-6 py-4 border-t border-gray-200 dark:border-white/5 flex justify-end bg-gray-50 dark:bg-[#1f2937]/30">
                            <button
                                type="button"
                                onClick={() => setShowMemoryLogsTable(false)}
                                className="px-5 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-white/5 dark:hover:bg-white/10 text-gray-700 dark:text-gray-200 text-sm font-semibold rounded-lg transition-all"
                            >
                                Fechar
                            </button>
                        </div>
                    </div>
                </div>
            , document.body)}
            {/* Modal de Logs de Integração de Mensagens (AgentFlow) - Popup Grande Centralizado */}
            {showChatLogsTable && ReactDOM.createPortal(
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
                                    className="text-xs text-indigo-600 hover:underline font-semibold"
                                >
                                    Atualizar
                                </button>
                            </div>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    placeholder="Filtrar por contato..."
                                    value={chatContactFilter}
                                    onChange={(e) => setChatContactFilter(e.target.value)}
                                    className="flex-1 px-3 py-1.5 text-xs border border-gray-300 dark:border-white/10 rounded-lg bg-white dark:bg-[#1f2937]/50 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                />
                                <select
                                    value={chatOriginFilter}
                                    onChange={(e) => setChatOriginFilter(e.target.value)}
                                    style={{ colorScheme: 'dark' }}
                                    className="px-3 py-1.5 text-xs border border-gray-300 dark:border-white/10 rounded-lg bg-white dark:bg-[#1f2937] text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                >
                                    <option value="">Todas as origens</option>
                                    <option value="contact">Contact</option>
                                    <option value="user">Cliente</option>
                                </select>
                                <select
                                    value={chatStatusFilter}
                                    onChange={(e) => setChatStatusFilter(e.target.value)}
                                    style={{ colorScheme: 'dark' }}
                                    className="px-3 py-1.5 text-xs border border-gray-300 dark:border-white/10 rounded-lg bg-white dark:bg-[#1f2937] text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                >
                                    <option value="">Todos os status</option>
                                    <option value="success">Enviado</option>
                                    <option value="failed">Erro</option>
                                </select>
                                {(chatContactFilter || chatOriginFilter || chatStatusFilter) && (
                                    <button
                                        type="button"
                                        onClick={() => { setChatContactFilter(''); setChatOriginFilter(''); setChatStatusFilter(''); }}
                                        className="px-2.5 py-1.5 text-[10px] font-bold text-gray-500 hover:text-red-500 border border-gray-300 dark:border-white/10 rounded-lg transition-all whitespace-nowrap"
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
                                className="px-5 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-white/5 dark:hover:bg-white/10 text-gray-700 dark:text-gray-200 text-sm font-semibold rounded-lg transition-all"
                            >
                                Fechar
                            </button>
                        </div>
                    </div>
                </div>
            , document.body)}
        </div>
    );
};

export default AdvancedTab;
