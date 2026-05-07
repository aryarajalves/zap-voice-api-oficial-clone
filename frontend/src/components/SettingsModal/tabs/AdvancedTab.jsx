import React from 'react';
import { FiShare2, FiEyeOff, FiEye, FiChevronUp, FiChevronDown, FiAlertCircle, FiCopy } from 'react-icons/fi';
import PaginationControls from '../components/PaginationControls';

const AdvancedTab = ({
    user, formData, handleChange, visibleFields, handleRevealSetting,
    showContactsTable, setShowContactsTable, loadingContacts, fetchSyncedContacts, setContactsPage,
    syncedContacts, contactsPage, contactsLimit, contactsTotal, setContactsLimit,
    testingWebhook, handleTestWebhook, showMemoryLogsTable, setShowMemoryLogsTable,
    loadingMemoryLogs, fetchMemoryLogs, setMemoryLogsPage, memoryLogs,
    memoryLogsPage, memoryLogsLimit, memoryLogsTotal, setMemoryLogsLimit
}) => {
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

                    {/* Contact Sync Table Section */}
                    <div className="space-y-4 pt-6 border-t border-gray-100 dark:border-white/5">
                        <div className="flex items-center gap-2 pb-2 border-b border-gray-100 dark:border-white/5">
                            <span className="text-orange-600">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M3 12v3c0 1.1.9 2 2 2h10a2 2 0 002-2v-3a2 2 0 00-2-2H5a2 2 0 00-2 2zm2-1h10a1 1 0 011 1v3a1 1 0 01-1 1H5a1 1 0 01-1-1v-3a1 1 0 011-1z" />
                                    <path d="M3 6v3c0 1.1.9 2 2 2h10a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2zm2-1h10a1 1 0 011 1v3a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1z" />
                                </svg>
                            </span>
                            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200">Monitoramento de Contatos</h3>
                        </div>
                        <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg border border-orange-100 dark:border-orange-800 text-sm">
                            <p className="text-orange-800 dark:text-orange-300">
                                Os contatos que interagem com o sistema são sincronizados automaticamente na tabela <b>contatos_monitorados</b> do seu banco de dados.
                            </p>
                        </div>
                    </div>

                    {/* Lista de Contatos Sincronizados */}
                    <div className="mt-6 space-y-3">
                        <div 
                            className="flex items-center justify-between cursor-pointer group"
                            onClick={() => setShowContactsTable(!showContactsTable)}
                        >
                            <h4 className="text-sm font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider flex items-center gap-2">
                                {showContactsTable ? <FiChevronUp className="text-orange-500" /> : <FiChevronDown className="text-orange-500" />}
                                Contatos Sincronizados
                                {loadingContacts && <div className="w-3 h-3 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>}
                            </h4>
                            {showContactsTable && (
                                <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); setContactsPage(0); fetchSyncedContacts(); }}
                                    className="text-xs text-orange-600 hover:underline font-medium"
                                >
                                    Atualizar
                                </button>
                            )}
                        </div>

                        {showContactsTable && (
                            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-white/5 overflow-hidden shadow-sm animate-in fade-in slide-in-from-top-1 duration-200">
                                <div className="overflow-x-auto">
                                    {syncedContacts.length === 0 && !loadingContacts ? (
                                        <div className="p-8 text-center text-gray-400 text-sm italic">
                                            Nenhum contato sincronizado nesta tabela ainda.
                                        </div>
                                    ) : (
                                        <>
                                            <table className="w-full text-left text-xs">
                                                <thead className="bg-gray-100 dark:bg-[#1f2937]/80 text-gray-600 dark:text-gray-400 border-b border-gray-200 dark:border-white/5">
                                                    <tr>
                                                        <th className="px-4 py-3 font-bold uppercase tracking-wider">Nome</th>
                                                        <th className="px-4 py-3 font-bold uppercase tracking-wider">Telefone</th>
                                                        <th className="px-4 py-3 font-bold uppercase tracking-wider">Última Interação</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                                    {loadingContacts ? (
                                                        Array(3).fill(0).map((_, i) => (
                                                            <tr key={i} className="animate-pulse">
                                                                <td colSpan="3" className="px-4 py-4"><div className="h-2 bg-gray-200 dark:bg-[#1f2937]/50 rounded w-full"></div></td>
                                                            </tr>
                                                        ))
                                                    ) : (
                                                        syncedContacts.map((contact, idx) => (
                                                            <tr key={idx} className="hover:bg-white dark:hover:bg-gray-800/50 transition-colors">
                                                                <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-200">{contact.name || 'Sem Nome'}</td>
                                                                <td className="px-4 py-3 font-mono text-gray-500 dark:text-gray-400">{contact.phone}</td>
                                                                <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                                                                    {contact.last_interaction_at ? new Date(contact.last_interaction_at).toLocaleString('pt-BR', {
                                                                        day: '2-digit',
                                                                        month: '2-digit',
                                                                        year: '2-digit',
                                                                        hour: '2-digit',
                                                                        minute: '2-digit'
                                                                    }) : '-'}
                                                                </td>
                                                            </tr>
                                                        ))
                                                    )}
                                                </tbody>
                                            </table>
                                            <PaginationControls 
                                                page={contactsPage} 
                                                limit={contactsLimit} 
                                                total={contactsTotal} 
                                                onPageChange={setContactsPage} 
                                                onLimitChange={setContactsLimit} 
                                            />
                                        </>
                                    )}
                                </div>
                            </div>
                        )}
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
                    </div>

                    {/* LISTA DE LOGS DE MEMÓRIA */}
                    <div className="mt-8 space-y-3">
                        <div 
                            className="flex items-center justify-between cursor-pointer group"
                            onClick={() => setShowMemoryLogsTable(!showMemoryLogsTable)}
                        >
                            <h4 className="text-sm font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider flex items-center gap-2">
                                {showMemoryLogsTable ? <FiChevronUp className="text-cyan-500" /> : <FiChevronDown className="text-cyan-500" />}
                                Logs de Sincronização de Memória
                                {loadingMemoryLogs && <div className="w-3 h-3 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>}
                            </h4>
                            {showMemoryLogsTable && (
                                <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); setMemoryLogsPage(0); fetchMemoryLogs(); }}
                                    className="text-xs text-cyan-600 hover:underline font-medium"
                                >
                                    Atualizar
                                </button>
                            )}
                        </div>

                        {showMemoryLogsTable && (
                            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-white/5 overflow-hidden shadow-sm animate-in fade-in slide-in-from-top-1 duration-200">
                                <div className="overflow-x-auto">
                                    {memoryLogs.length === 0 && !loadingMemoryLogs ? (
                                        <div className="p-8 text-center text-gray-400 text-sm italic">
                                            Nenhum log de memória disponível.
                                        </div>
                                    ) : (
                                        <>
                                            <table className="w-full text-left text-[10px] md:text-xs">
                                                <thead className="bg-gray-100 dark:bg-[#1f2937]/80 text-gray-600 dark:text-gray-400 border-b border-gray-200 dark:border-white/5">
                                                    <tr>
                                                        <th className="px-3 py-2 font-bold uppercase tracking-wider">Data</th>
                                                        <th className="px-3 py-2 font-bold uppercase tracking-wider">Contato</th>
                                                        <th className="px-3 py-2 font-bold uppercase tracking-wider">Conteúdo</th>
                                                        <th className="px-3 py-2 font-bold uppercase tracking-wider">Status</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                                    {loadingMemoryLogs ? (
                                                        Array(3).fill(0).map((_, i) => (
                                                            <tr key={i} className="animate-pulse">
                                                                <td colSpan="4" className="px-3 py-4"><div className="h-2 bg-gray-200 dark:bg-[#1f2937]/50 rounded w-full"></div></td>
                                                            </tr>
                                                        ))
                                                    ) : (
                                                        memoryLogs.map((log) => (
                                                            <tr key={log.id} className="hover:bg-white dark:hover:bg-gray-800/50 transition-colors">
                                                                <td className="px-3 py-2 text-gray-400 font-mono whitespace-nowrap">
                                                                    {new Date(log.timestamp).toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' })}
                                                                </td>
                                                                <td className="px-3 py-2 font-medium text-gray-700 dark:text-gray-300">
                                                                    {log.phone}
                                                                </td>
                                                                <td className="px-3 py-2 text-gray-500 dark:text-gray-400 max-w-[200px] truncate" title={log.content}>
                                                                    {log.content || (log.template_name ? `[Template: ${log.template_name}]` : '-')}
                                                                </td>
                                                                <td className="px-3 py-2">
                                                                    {log.status === 'sent' || log.status === 'success' ? (
                                                                        <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 font-bold uppercase text-[9px]">Enviado</span>
                                                                    ) : log.status === 'failed' ? (
                                                                        <span className="px-1.5 py-0.5 rounded bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 font-bold uppercase text-[9px] flex items-center gap-1" title={log.error}>
                                                                            <FiAlertCircle /> Erro
                                                                        </span>
                                                                    ) : (
                                                                        <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 dark:bg-[#1f2937]/80 dark:text-gray-400 font-bold uppercase text-[9px]">{log.status}</span>
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        ))
                                                    )}
                                                </tbody>
                                            </table>
                                            <PaginationControls 
                                                page={memoryLogsPage} 
                                                limit={memoryLogsLimit} 
                                                total={memoryLogsTotal} 
                                                onPageChange={setMemoryLogsPage} 
                                                onLimitChange={setMemoryLogsLimit} 
                                            />
                                        </>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

export default AdvancedTab;
