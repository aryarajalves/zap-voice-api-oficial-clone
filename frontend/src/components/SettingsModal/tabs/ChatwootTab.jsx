import React from 'react';
import { FiEyeOff, FiEye, FiShield, FiPlus, FiTrash2, FiCopy, FiTag, FiEdit2 } from 'react-icons/fi';
import { API_URL } from '../../../config';
import { toast } from 'react-hot-toast';

const ChatwootTab = ({
    user, activeClient, formData, handleChange, visibleFields, handleRevealSetting,
    agents, loadingAgents, newAgent, setNewAgent, handleAddAgent, isAddingAgent, setAgentToDelete,
    labels, loadingLabels, labelForm, setLabelForm, editingLabel, setEditingLabel, isAddingLabel,
    handleUpdateLabel, handleAddLabel, handleDeleteLabel, fetchAgents, fetchLabels
}) => {
    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Chatwoot Section */}
            {['super_admin', 'admin', 'administrator', 'owner'].includes(user?.role) && (
                <div className="space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-gray-100 dark:border-white/5">
                        <span className="text-blue-600">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" />
                                <path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z" />
                            </svg>
                        </span>
                        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200">Integração Chatwoot</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1 md:col-span-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">URL da API</label>
                            <input
                                type="url"
                                name="CHATWOOT_API_URL"
                                value={formData.CHATWOOT_API_URL}
                                onChange={handleChange}
                                placeholder="https://app.chatwoot.com/api/v1"
                                className="w-full p-2.5 border border-gray-300 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white dark:bg-[#1f2937]/50 text-gray-900 dark:text-white"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Account ID</label>
                            <input
                                type="number"
                                name="CHATWOOT_ACCOUNT_ID"
                                value={formData.CHATWOOT_ACCOUNT_ID}
                                onChange={handleChange}
                                placeholder="1"
                                className="w-full p-2.5 border border-gray-300 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white dark:bg-[#1f2937]/50 text-gray-900 dark:text-white"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Inbox ID (Filtro)</label>
                            <input
                                type="text"
                                name="CHATWOOT_SELECTED_INBOX_ID"
                                value={formData.CHATWOOT_SELECTED_INBOX_ID}
                                onChange={handleChange}
                                placeholder="Opcional (Ex: 3, 5)"
                                className="w-full p-2.5 border border-gray-300 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white dark:bg-[#1f2937]/50 text-gray-900 dark:text-white"
                            />
                            <p className="text-xs text-gray-400">Deixe vazio para ver todas.</p>
                        </div>
                        <div className="space-y-1 md:col-span-2 relative">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">API Token (Admin/Bot)</label>
                            <div className="relative">
                                <input
                                    type={visibleFields['CHATWOOT_API_TOKEN'] ? "text" : "password"}
                                    name="CHATWOOT_API_TOKEN"
                                    value={formData.CHATWOOT_API_TOKEN}
                                    onChange={handleChange}
                                    placeholder="Token do usuário..."
                                    className="w-full p-2.5 pr-10 border border-gray-300 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-mono text-sm bg-white dark:bg-[#1f2937]/50 text-gray-900 dark:text-white"
                                    autoComplete="new-password"
                                />
                                <button
                                    type="button"
                                    onClick={() => handleRevealSetting('CHATWOOT_API_TOKEN')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-500 transition-colors"
                                >
                                    {visibleFields['CHATWOOT_API_TOKEN'] ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                                </button>
                            </div>
                        </div>
                        <div className="md:col-span-2 flex justify-end">
                            <button
                                onClick={fetchAgents}
                                disabled={loadingAgents}
                                type="button"
                                className="text-xs text-blue-500 hover:text-blue-600 font-medium flex items-center gap-1 transition-all"
                            >
                                {loadingAgents ? "Atualizando..." : "🔄 Atualizar Lista de Agentes"}
                            </button>
                        </div>
                    </div>

                    <div className={`p-4 rounded-xl border flex items-start gap-3 mt-4 transition-all ${
                        (formData.CHATWOOT_API_URL && formData.CHATWOOT_API_TOKEN) 
                        ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800 text-green-800 dark:text-green-300' 
                        : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300'
                    }`}>
                        <div className={`p-1 rounded-full mt-0.5 ${
                            (formData.CHATWOOT_API_URL && formData.CHATWOOT_API_TOKEN)
                            ? 'bg-green-100 dark:bg-green-800'
                            : 'bg-amber-100 dark:bg-amber-800'
                        }`}>
                            { (formData.CHATWOOT_API_URL && formData.CHATWOOT_API_TOKEN) ? (
                                <FiShield className="h-4 w-4" />
                            ) : (
                                <FiEye className="h-4 w-4" />
                            )}
                        </div>
                        <div>
                            <p className="font-bold">
                                {(formData.CHATWOOT_API_URL && formData.CHATWOOT_API_TOKEN) 
                                ? 'Conexão Pronta!' 
                                : 'Configurações do Chatwoot Incompletas'}
                            </p>
                            <p className="opacity-80 text-xs">
                                {(formData.CHATWOOT_API_URL && formData.CHATWOOT_API_TOKEN)
                                ? 'Você pode gerenciar os agentes abaixo.'
                                : 'Preencha a URL e o Token da API para gerenciar agentes.'}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* New Agent Section */}
            {['super_admin', 'admin', 'administrator', 'owner'].includes(user?.role) && (formData.CHATWOOT_API_URL && formData.CHATWOOT_API_TOKEN) && (
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
                            className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-all shadow-md active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
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
                                    {agents.length > 0 ? (
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
                                                            className="p-2 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
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
            )}

            {/* Chatwoot Events Webhook Section */}
            {['super_admin', 'admin', 'administrator', 'owner'].includes(user?.role) && (
                <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-white/5">
                    <div className="flex items-center gap-2 pb-2 border-b border-gray-100 dark:border-white/5">
                        <span className="text-indigo-600">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                                <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                            </svg>
                        </span>
                        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200">Webhook de Eventos Chatwoot</h3>
                    </div>

                    <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-lg border border-indigo-100 dark:border-indigo-800 text-sm">
                        <p className="font-semibold text-indigo-800 dark:text-indigo-300 mb-2">📍 URL do Webhook (cole no Chatwoot):</p>
                        <div className="flex items-center gap-2">
                            <code className="bg-white dark:bg-gray-900 px-3 py-1.5 rounded border border-indigo-200 dark:border-indigo-700 select-all text-xs flex-1">
                                {API_URL}/webhooks/chatwoot_events{activeClient?.id ? `?client_id=${activeClient.id}` : ''}
                            </code>
                            <button
                                type="button"
                                onClick={() => {
                                    const webhookUrl = `${API_URL}/webhooks/chatwoot_events${activeClient?.id ? `?client_id=${activeClient.id}` : ''}`;
                                    navigator.clipboard.writeText(webhookUrl);
                                    toast.success('URL copiada!');
                                }}
                                className="px-3 py-1.5 bg-indigo-500 text-white rounded hover:bg-blue-600 transition text-xs"
                            >
                                <FiCopy />
                            </button>
                        </div>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-2">Configure este webhook no Chatwoot para receber atualizações de mensagens e contatos.</p>
                    </div>
                </div>
            )}

            {/* Label Management Section */}
            {['super_admin', 'admin', 'administrator', 'owner'].includes(user?.role) && (formData.CHATWOOT_API_URL && formData.CHATWOOT_API_TOKEN) && (
                <div className="space-y-4 pt-6 border-t border-gray-100 dark:border-white/5">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="p-1.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg">
                                <FiTag className="h-5 w-5" />
                            </span>
                            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200">Gerenciar Etiquetas</h3>
                        </div>
                        <button
                            type="button"
                            onClick={fetchLabels}
                            className="text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1 transition-all"
                        >
                            {loadingLabels ? "Atualizando..." : "🔄 Atualizar"}
                        </button>
                    </div>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed italic border-l-2 border-indigo-200 dark:border-indigo-800 pl-3">
                        Gerencie as etiquetas do Chatwoot. Você pode criar novas com cores personalizadas ou editar as existentes.
                    </p>

                    <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl border border-gray-100 dark:border-white/5 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Nome da Etiqueta</label>
                                <input
                                    type="text"
                                    value={labelForm.title}
                                    onChange={(e) => setLabelForm({ ...labelForm, title: e.target.value })}
                                    placeholder="Ex: Urgente, Suporte..."
                                    className="w-full p-2 border border-gray-300 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all bg-white dark:bg-[#1f2937]/50 text-sm"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Cor da Etiqueta</label>
                                <div className="flex gap-2">
                                    <input
                                        type="color"
                                        value={labelForm.color}
                                        onChange={(e) => setLabelForm({ ...labelForm, color: e.target.value })}
                                        className="w-10 h-10 p-0.5 border border-gray-300 dark:border-white/10 rounded-lg cursor-pointer bg-white dark:bg-[#1f2937]/50"
                                    />
                                    <input
                                        type="text"
                                        value={labelForm.color}
                                        onChange={(e) => setLabelForm({ ...labelForm, color: e.target.value })}
                                        placeholder="#3352f9"
                                        className="flex-1 p-2 border border-gray-300 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all bg-white dark:bg-[#1f2937]/50 text-sm font-mono"
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={editingLabel ? handleUpdateLabel : handleAddLabel}
                                disabled={isAddingLabel || !labelForm.title}
                                className={`flex-1 py-2 ${editingLabel ? 'bg-amber-500 hover:bg-amber-600' : 'bg-indigo-600 hover:bg-indigo-700'} text-white font-bold rounded-lg transition-all shadow-md active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2`}
                            >
                                {isAddingLabel ? 'Processando...' : editingLabel ? 'Atualizar Etiqueta' : 'Criar Nova Etiqueta'}
                            </button>
                            {editingLabel && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setEditingLabel(null);
                                        setLabelForm({ title: '', color: '#3352f9' });
                                    }}
                                    className="px-4 py-2 bg-gray-200 dark:bg-[#1f2937]/50 text-gray-700 dark:text-gray-200 font-bold rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-all"
                                >
                                    Cancelar
                                </button>
                            )}
                        </div>

                        {/* List of Existing Labels */}
                        <div className="space-y-3 pt-4 border-t border-gray-100 dark:border-white/5">
                            <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Etiquetas no Chatwoot</h4>
                            {loadingLabels ? (
                                <div className="flex justify-center p-4">
                                    <div className="animate-spin h-5 w-5 border-2 border-indigo-500 border-t-transparent rounded-full"></div>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                                    {labels.length > 0 ? (
                                        labels.map(label => (
                                            <div key={label.id} className="flex items-center justify-between p-2.5 bg-white dark:bg-[#1f2937]/80 rounded-xl border border-gray-100 dark:border-white/5 hover:shadow-sm transition-all group">
                                                <div className="flex items-center gap-3">
                                                    <div 
                                                        className="w-4 h-4 rounded-full border border-gray-200 dark:border-white/10 shadow-inner"
                                                        style={{ backgroundColor: label.color }}
                                                    ></div>
                                                    <span className="text-xs font-bold text-gray-700 dark:text-gray-200 truncate max-w-[120px]">{label.title}</span>
                                                </div>
                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setEditingLabel(label);
                                                            setLabelForm({ title: label.title, color: label.color });
                                                        }}
                                                        className="p-1.5 text-gray-400 hover:text-amber-500 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-900/20"
                                                        title="Editar Etiqueta"
                                                    >
                                                        <FiEdit2 size={14} />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDeleteLabel(label.id)}
                                                        className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                                                        title="Excluir Etiqueta"
                                                    >
                                                        <FiTrash2 size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-center text-gray-400 text-xs py-4 italic col-span-2">Nenhuma etiqueta encontrada.</p>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ChatwootTab;
