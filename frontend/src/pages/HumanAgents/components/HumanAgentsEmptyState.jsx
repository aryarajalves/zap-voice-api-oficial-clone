import React from 'react';
import { FiCheckCircle, FiRefreshCw } from 'react-icons/fi';

export default function HumanAgentsEmptyState({ loading, hasConversations }) {
    if (loading && !hasConversations) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                <FiRefreshCw className="animate-spin mb-4" size={24} />
                <p className="text-xs font-semibold">Carregando contatos na fila...</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center py-24 bg-white dark:bg-[#1e293b] rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm text-gray-400">
            <FiCheckCircle size={36} className="text-green-500 mb-4 animate-pulse" />
            <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Nenhum atendimento pendente</h3>
            <p className="text-xs max-w-xs text-center">Todos os contatos estão sob controle do robô de IA ou a fila está limpa.</p>
        </div>
    );
}
