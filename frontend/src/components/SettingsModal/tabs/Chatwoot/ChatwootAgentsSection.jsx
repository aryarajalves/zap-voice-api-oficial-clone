import React from 'react';
import { FiPlus, FiTrash2, FiShield } from 'react-icons/fi';

const ChatwootAgentsSection = ({
    user,
    formData,
    newAgent,
    setNewAgent,
    handleAddAgent,
    isAddingAgent,
    agents,
    loadingAgents,
    setAgentToDelete
}) => {
    const isAllowedRole = ['super_admin', 'admin', 'administrator', 'owner'].includes(user?.role);
    const hasCredentials = Boolean(formData.CHATWOOT_API_URL && formData.CHATWOOT_API_TOKEN);

    if (!isAllowedRole || !hasCredentials) {
        return null;
    }

    return (
        <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-white/5">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="p-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
                        <FiPlus className="h-5 w-5" />
                    </span>
                    <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200">Gerenciar Atendentes</h3>
                </div>
            </div>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed italic border-l-2 border-blue-200 dark:border-blue-800 pl-3">
                Crie novos usuários no seu Chatwoot diretamente por aqui. Eles poderão responder mensagens no painel do Chatwoot.
            </p>
            
            <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl border border-gray-100 dark:border-white/5 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Nome do Agente</label>
                        <input
                            type="text"
                            value={newAgent.name}
                            onChange={(e) => setNewAgent({ ...newAgent, name: e.target.value })}
                            placeholder="Nome completo"
                            className="w-full p-2 border border-gray-300 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all bg-white dark:bg-[#1f2937]/50 text-sm"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Tipo de Usuário</label>
                        <select
                            value={newAgent.role}
                            onChange={(e) => setNewAgent({ ...newAgent, role: e.target.value })}
                            className="w-full p-2 border border-gray-300 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all bg-white dark:bg-[#1f2937]/50 text-sm"
                        >
                            <option value="agent">Agente (Atendente)</option>
                            <option value="administrator">Administrador</option>
                        </select>
                    </div>
                    <div className="space-y-1 md:col-span-2">
                        <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Email do Agente</label>
                        <input
                            type="email"
                            value={newAgent.email}
                            onChange={(e) => setNewAgent({ ...newAgent, email: e.target.value })}
                            placeholder="atendente@empresa.com"
                            className="w-full p-2 border border-gray-300 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all bg-white dark:bg-[#1f2937]/50 text-sm"
                        />
                    </div>
                </div>
                <button
                    type="button"
                    onClick={handleAddAgent}
                    disabled={isAddingAgent}
                    className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-all shadow-md active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                    {isAddingAgent ? 'Adicionando...' : 'Adicionar Agente'}
                </button>

                {/* List of Existing Agents */}
                <div className="space-y-3 pt-4 border-t border-gray-100 dark:border-white/5">
                    <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Agentes Atuais</h4>
                    {loadingAgents ? (
                        <div className="flex justify-center p-4">
                            <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                        </div>
                    ) : (
                        <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                            {agents && agents.length > 0 ? (
                                agents.map(agent => (
                                    <div key={agent.id} className="flex items-center justify-between p-3 bg-white dark:bg-[#1f2937]/80 rounded-xl border border-gray-100 dark:border-white/5 hover:shadow-sm transition-all group">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-xs">
                                                {agent.name?.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-gray-800 dark:text-gray-200">{agent.name}</p>
                                                <p className="text-[10px] text-gray-400">{agent.email} • <span className="capitalize">{agent.role === 'administrator' ? 'Admin' : 'Agente'}</span></p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {agent.role !== 'administrator' ? (
                                                <button
                                                    type="button"
                                                    onClick={() => setAgentToDelete(agent)}
                                                    className="p-2 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 cursor-pointer"
                                                    title="Remover Agente"
                                                >
                                                    <FiTrash2 size={16} />
                                                </button>
                                            ) : (
                                                <span className="p-2 text-gray-300 dark:text-gray-600 cursor-not-allowed" title="Administradores não podem ser removidos por aqui">
                                                    <FiShield size={16} />
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-center text-gray-400 text-xs py-4 italic">Nenhum agente encontrado.</p>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ChatwootAgentsSection;
