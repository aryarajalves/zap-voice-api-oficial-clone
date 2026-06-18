import React from 'react';
import { FiX, FiMessageSquare } from 'react-icons/fi';

const NodeStatsDetailsModal = ({
    selectedNodeStats,
    onClose,
    statsPerPage,
    setStatsPerPage,
    statsPage,
    setStatsPage,
    activeClient,
    trigger,
    onStopContact
}) => {
    if (!selectedNodeStats) return null;

    return (
        <div className="fixed inset-0 z-[21000] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-gray-900 w-full max-w-lg rounded-[2rem] shadow-2xl border border-gray-150 dark:border-white/5 overflow-hidden flex flex-col max-h-[80vh] animate-in zoom-in-95 duration-200">
                <div className="p-5 pb-3 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50">
                    <h3 className="text-lg font-black text-gray-800 dark:text-white uppercase tracking-wider">{selectedNodeStats.title}</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-250 transition-colors">
                        <FiX size={20} />
                    </button>
                </div>

                <div className="px-5 py-3 bg-gray-50/50 dark:bg-gray-900/20 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center text-xs">
                    <div className="flex items-center gap-2">
                        <span className="text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider text-[10px]">Mostrar:</span>
                        <select
                            value={statsPerPage}
                            onChange={(e) => {
                                setStatsPerPage(Number(e.target.value));
                                setStatsPage(1);
                            }}
                            className="bg-white dark:bg-gray-800 border border-gray-250 dark:border-gray-700 rounded-xl px-2.5 py-1 font-black text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all cursor-pointer shadow-sm text-xs"
                        >
                            <option value={20}>20 por vez</option>
                            <option value={50}>50 por vez</option>
                            <option value={100}>100 por vez</option>
                        </select>
                    </div>
                    <div className="text-gray-500 dark:text-gray-400 font-black text-[10px] uppercase tracking-widest bg-gray-200/50 dark:bg-gray-800 px-2.5 py-1 rounded-lg">
                        Total: {selectedNodeStats.contacts.length}
                    </div>
                </div>
                
                <div className="p-4 overflow-y-auto flex-1 divide-y divide-gray-100 dark:divide-gray-800 bg-gray-50/50 dark:bg-gray-950/20 min-h-[250px]">
                    {selectedNodeStats.contacts.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-gray-400 font-medium">
                            Nenhum contato encontrado.
                        </div>
                    ) : (
                        selectedNodeStats.contacts
                            .slice((statsPage - 1) * statsPerPage, statsPage * statsPerPage)
                            .map((c, i) => (
                            <div key={i} className="py-3 flex justify-between items-center gap-3">
                                <div className="min-w-0 flex-1">
                                    <p className="text-xs font-black text-gray-800 dark:text-white truncate">{c.name}</p>
                                    <p className="text-[10px] text-gray-500 font-bold font-mono mt-0.5">{c.phone}</p>
                                    <div className="mt-2 flex flex-col gap-1 text-[10px] text-gray-500 dark:text-gray-400 bg-gray-100/50 dark:bg-gray-800/30 p-2.5 rounded-xl border border-gray-100 dark:border-gray-800/50">
                                        {c.timestamp && (
                                            <div className="flex items-center gap-1.5">
                                                <span className="font-bold text-gray-400 dark:text-gray-550">📥 Entrada:</span>
                                                <span className="font-mono font-semibold text-gray-700 dark:text-gray-300">{new Date(c.timestamp).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</span>
                                            </div>
                                        )}
                                        {c.targetTime && (
                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                <span className="font-bold text-gray-400 dark:text-gray-550">⏱️ Prazo:</span>
                                                <span className="font-mono font-bold text-orange-500">{new Date(c.targetTime).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</span>
                                            </div>
                                        )}
                                        {c.status === 'completed' && (
                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                <span className="font-bold text-gray-400 dark:text-gray-555">📤 Saída:</span>
                                                <span className="font-mono font-bold text-emerald-500">
                                                    {c.updated_at 
                                                        ? new Date(c.updated_at).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
                                                        : new Date(c.timestamp).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                    {c.error && (
                                        <p className="text-[9px] text-red-500 font-bold bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-lg mt-1 inline-block">
                                            ❌ {c.error}
                                        </p>
                                    )}
                                </div>
                                
                                <div className="flex items-center gap-2 shrink-0">
                                    {selectedNodeStats.status === 'waiting' && (
                                        <button
                                            onClick={() => onStopContact(c)}
                                            title="Parar funil para este contato"
                                            className="px-3 py-1.5 bg-red-100 hover:bg-red-200 dark:bg-red-955/30 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all active:scale-95 flex items-center gap-1 border border-red-200/30"
                                        >
                                            <FiX size={10} /> Parar Funil
                                        </button>
                                    )}
                                    
                                    {c.convoId && c.accountId && (activeClient?.chatwoot_url || trigger.chatwoot_url) && (
                                        (() => {
                                            let baseUrl = activeClient?.chatwoot_url || '';
                                            if (!baseUrl && trigger.chatwoot_url) {
                                                const idx = trigger.chatwoot_url.indexOf('/app/accounts/');
                                                if (idx !== -1) {
                                                    baseUrl = trigger.chatwoot_url.substring(0, idx);
                                                }
                                            }
                                            if (baseUrl) {
                                                return (
                                                    <a 
                                                        href={`${baseUrl}/app/accounts/${c.accountId}/conversations/${c.convoId}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-[9px] uppercase tracking-widest transition-all shadow-md shadow-blue-500/20 active:scale-95 shrink-0 flex items-center gap-1"
                                                    >
                                                        <FiMessageSquare size={10} /> Chat
                                                    </a>
                                                );
                                            }
                                            return null;
                                        })()
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {selectedNodeStats.contacts.length > statsPerPage && (
                    <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30 flex justify-between items-center">
                        <button
                            disabled={statsPage === 1}
                            onClick={() => setStatsPage(prev => Math.max(prev - 1, 1))}
                            className="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-750 text-gray-700 dark:text-gray-300 font-black rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-all text-[10px] uppercase tracking-wider active:scale-95 border border-gray-200/20 shadow-sm"
                        >
                            ◀ Anterior
                        </button>
                        <span className="text-[10px] text-gray-500 dark:text-gray-400 font-black uppercase tracking-widest">
                            Página <span className="font-mono text-xs text-blue-500 font-black">{statsPage}</span> de <span className="font-mono text-xs font-black">{Math.ceil(selectedNodeStats.contacts.length / statsPerPage)}</span>
                        </span>
                        <button
                            disabled={statsPage >= Math.ceil(selectedNodeStats.contacts.length / statsPerPage)}
                            onClick={() => setStatsPage(prev => Math.min(prev + 1, Math.ceil(selectedNodeStats.contacts.length / statsPerPage)))}
                            className="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-750 text-gray-700 dark:text-gray-300 font-black rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-all text-[10px] uppercase tracking-wider active:scale-95 border border-gray-200/20 shadow-sm"
                        >
                            Próxima ▶
                        </button>
                    </div>
                )}
                
                <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 flex justify-end">
                    <button 
                        onClick={onClose}
                        className="px-5 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-black rounded-xl hover:scale-[1.02] active:scale-95 transition-all uppercase tracking-widest text-xs"
                    >
                        Fechar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default NodeStatsDetailsModal;
