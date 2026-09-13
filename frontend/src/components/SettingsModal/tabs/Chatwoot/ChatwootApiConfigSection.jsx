import React from 'react';
import { FiEyeOff, FiEye, FiShield } from 'react-icons/fi';

const ChatwootApiConfigSection = ({
    user,
    formData,
    handleChange,
    visibleFields,
    handleRevealSetting,
    fetchAgents,
    loadingAgents
}) => {
    if (!['super_admin', 'admin', 'administrator', 'owner'].includes(user?.role)) {
        return null;
    }

    const isConnectionReady = Boolean(formData.CHATWOOT_API_URL && formData.CHATWOOT_API_TOKEN);

    return (
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
                        value={formData.CHATWOOT_API_URL || ''}
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
                        value={formData.CHATWOOT_ACCOUNT_ID || ''}
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
                        value={formData.CHATWOOT_SELECTED_INBOX_ID || ''}
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
                            value={formData.CHATWOOT_API_TOKEN || ''}
                            onChange={handleChange}
                            placeholder="Token do usuário..."
                            className="w-full p-2.5 pr-10 border border-gray-300 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-mono text-sm bg-white dark:bg-[#1f2937]/50 text-gray-900 dark:text-white"
                            autoComplete="new-password"
                        />
                        <button
                            type="button"
                            onClick={() => handleRevealSetting('CHATWOOT_API_TOKEN')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-500 transition-colors cursor-pointer"
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
                        className="text-xs text-blue-500 hover:text-blue-600 font-medium flex items-center gap-1 transition-all cursor-pointer disabled:opacity-50"
                    >
                        {loadingAgents ? "Atualizando..." : "🔄 Atualizar Lista de Agentes"}
                    </button>
                </div>
            </div>

            <div className={`p-4 rounded-xl border flex items-start gap-3 mt-4 transition-all ${
                isConnectionReady
                ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800 text-green-800 dark:text-green-300' 
                : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300'
            }`}>
                <div className={`p-1 rounded-full mt-0.5 ${
                    isConnectionReady
                    ? 'bg-green-100 dark:bg-green-800'
                    : 'bg-amber-100 dark:bg-amber-800'
                }`}>
                    {isConnectionReady ? (
                        <FiShield className="h-4 w-4" />
                    ) : (
                        <FiEye className="h-4 w-4" />
                    )}
                </div>
                <div>
                    <p className="font-bold">
                        {isConnectionReady
                        ? 'Conexão Pronta!' 
                        : 'Configurações do Chatwoot Incompletas'}
                    </p>
                    <p className="opacity-80 text-xs">
                        {isConnectionReady
                        ? 'Você pode gerenciar os agentes abaixo.'
                        : 'Preencha a URL e o Token da API para gerenciar agentes.'}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ChatwootApiConfigSection;
