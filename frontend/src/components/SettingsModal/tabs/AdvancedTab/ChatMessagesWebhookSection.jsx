import React from 'react';
import { FiChevronDown } from 'react-icons/fi';

export default function ChatMessagesWebhookSection({
  formData,
  handleChange,
  testingChatWebhook,
  handleTestChatWebhook,
  setShowChatLogsTable,
  setChatLogsPage,
  fetchChatLogs
}) {
  return (
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
        <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          URL do Webhook (POST)
        </label>
        <div className="flex gap-2">
          <input
            type="url"
            name="CHAT_MESSAGES_WEBHOOK_URL"
            value={formData?.CHAT_MESSAGES_WEBHOOK_URL || ''}
            onChange={handleChange}
            placeholder="https://seu-agentflow.com/webhook/mensagens"
            className="flex-1 p-2.5 border border-gray-300 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all bg-white dark:bg-[#1f2937]/50 text-gray-900 dark:text-white"
          />
          <button
            type="button"
            disabled={testingChatWebhook || !formData?.CHAT_MESSAGES_WEBHOOK_URL}
            onClick={handleTestChatWebhook}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-all shadow-md disabled:opacity-50 flex items-center gap-2 cursor-pointer"
          >
            {testingChatWebhook ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : "Testar"}
          </button>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Dispara o JSON de toda nova mensagem (entrada do cliente ou saída do agente) para este endereço.
        </p>
      </div>
      
      {/* Botão para abrir Logs de Integração de Mensagens */}
      <div className="pt-2">
        <button
          type="button"
          onClick={() => { setShowChatLogsTable(true); setChatLogsPage(0); fetchChatLogs(); }}
          className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 text-indigo-600 dark:text-indigo-400 text-xs font-semibold rounded-lg border border-gray-200 dark:border-white/5 transition-all shadow-sm cursor-pointer"
        >
          <FiChevronDown className="h-4 w-4 transform -rotate-90 text-indigo-500" />
          Logs de Integração de Mensagens
        </button>
      </div>
    </div>
  );
}
