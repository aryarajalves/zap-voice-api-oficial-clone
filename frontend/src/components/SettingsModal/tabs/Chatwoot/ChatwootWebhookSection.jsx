import React from 'react';
import { FiCopy } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { API_URL, WEBHOOK_BASE_URL } from '../../../../config';

const ChatwootWebhookSection = ({ user, activeClient, formData }) => {
    if (!['super_admin', 'admin', 'administrator', 'owner'].includes(user?.role)) {
        return null;
    }

    const baseUrl = formData.WEBHOOK_BASE_URL || WEBHOOK_BASE_URL || API_URL.replace(/\/api\/*$/, '');
    const webhookUrl = `${baseUrl}/api/webhooks/chatwoot_events${activeClient?.id ? `?client_id=${activeClient.id}` : ''}`;

    const handleCopy = () => {
        navigator.clipboard.writeText(webhookUrl);
        toast.success('URL copiada!');
    };

    return (
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
                        {webhookUrl}
                    </code>
                    <button
                        type="button"
                        onClick={handleCopy}
                        className="px-3 py-1.5 bg-indigo-500 text-white rounded hover:bg-blue-600 transition text-xs cursor-pointer"
                        title="Copiar URL"
                    >
                        <FiCopy />
                    </button>
                </div>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-2">
                    Configure este webhook no Chatwoot para receber atualizações de mensagens e contatos.
                </p>
            </div>
        </div>
    );
};

export default ChatwootWebhookSection;
