import React from 'react';
import { FiActivity, FiNavigation } from 'react-icons/fi';

const ChildrenFunnelsModal = ({ childrenModal, setChildrenModal, setMonitoringTrigger }) => {
    if (!childrenModal.isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-gray-200 dark:border-gray-800 animate-in zoom-in-95 duration-200">
                <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-gray-800/30">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-xl flex items-center justify-center text-2xl">🚀</div>
                        <div>
                            <h3 className="text-xl font-black text-gray-900 dark:text-gray-100 leading-tight">Funis Iniciados</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                                A partir de: <span className="text-orange-600 dark:text-orange-400 font-bold">{childrenModal.triggerName}</span>
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    {childrenModal.isLoading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4">
                            <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                            <p className="text-gray-500 font-bold animate-pulse uppercase tracking-widest text-xs">Carregando execuções...</p>
                        </div>
                    ) : childrenModal.children.length === 0 ? (
                        <div className="text-center py-20 flex flex-col items-center gap-4">
                            <span className="text-5xl">🏜️</span>
                            <p className="text-gray-400 font-bold uppercase tracking-widest text-sm">Nenhum funil iniciado ainda.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {childrenModal.children.map(child => (
                                <div key={child.id} className="bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/50 rounded-xl p-4 flex items-center justify-between group hover:border-orange-200 dark:hover:border-orange-900/50 transition-all hover:shadow-lg">
                                    <div className="flex items-center gap-4">
                                        <div className="flex flex-col">
                                             <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">
                                                {(() => {
                                                    try {
                                                        const date = new Date(child.updated_at || child.created_at);
                                                        return isNaN(date.getTime()) ? 'Data inválida' : date.toLocaleString('pt-BR');
                                                    } catch (e) { return 'Sem data'; }
                                                })()}
                                            </span>
                                            <span className="font-bold text-gray-800 dark:text-gray-200 transition-colors">
                                                {child.template_name || child.funnel?.name || 'Sem nome'}
                                            </span>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                                                    Para: {child.contact_name || child.contact_phone}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex flex-col items-end gap-2">
                                        <div className="flex items-center gap-3">
                                            <div className="flex flex-col items-center px-3 py-1 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-lg shadow-sm">
                                                <span className="text-[10px] font-bold text-gray-400 uppercase leading-none mb-1">Status Funil</span>
                                                <span className={`text-xs font-black px-2 py-0.5 rounded-full ${
                                                    child.status === 'completed' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                                    child.status === 'failed' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                                                    child.status === 'processing' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 animate-pulse' :
                                                    'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                                                }`}>
                                                    {child.status === 'completed' ? 'CONCLUÍDO' : child.status === 'failed' ? 'FALHA' : child.status === 'processing' ? 'EM EXECUÇÃO...' : child.status.toUpperCase()}
                                                </span>
                                            </div>
                                            
                                            {(child.total_delivered > 0 || child.total_sent > 0) && (
                                                <div className="flex flex-col items-center px-3 py-1 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-lg shadow-sm">
                                                    <span className="text-[10px] font-bold text-gray-400 uppercase leading-none mb-1">Envios</span>
                                                    <div className="flex items-center gap-1">
                                                        <span className="text-xs font-black text-green-600">{child.total_sent} env</span>
                                                        {child.total_delivered > 0 && <span className="text-[10px] font-bold text-blue-500">({child.total_delivered} ent)</span>}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-2 mt-3">
                                            <button
                                                onClick={() => setMonitoringTrigger(child)}
                                                className="flex items-center gap-1.5 px-3 py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500 rounded text-[10px] font-black text-gray-600 dark:text-gray-300 transition-all shadow-sm active:scale-95"
                                            >
                                                <FiActivity className="text-blue-500" /> MONITORAR AO VIVO
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="p-6 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30 flex justify-end">
                    <button onClick={() => setChildrenModal(prev => ({ ...prev, isOpen: false }))} className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm font-black rounded-xl transition-all uppercase tracking-widest">Fechar</button>
                </div>
            </div>
        </div>
    );
};

export default ChildrenFunnelsModal;
