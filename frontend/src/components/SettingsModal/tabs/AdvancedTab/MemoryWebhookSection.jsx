import React from 'react';
import { FiCopy, FiChevronDown } from 'react-icons/fi';

export default function MemoryWebhookSection({
  formData,
  handleChange,
  testingWebhook,
  handleTestWebhook,
  setShowMemoryLogsTable,
  setMemoryLogsPage,
  fetchMemoryLogs
}) {
  return (
    <div className="space-y-4 pt-4">
      <div className="flex items-center gap-2">
        <span className="p-1.5 bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400 rounded-lg">
          <FiCopy className="h-5 w-5" />
        </span>
        <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200">Webhook de Memória do Agente</h3>
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          URL do Webhook (POST)
        </label>
        <div className="flex gap-2">
          <input
            type="url"
            name="AGENT_MEMORY_WEBHOOK_URL"
            value={formData?.AGENT_MEMORY_WEBHOOK_URL || ''}
            onChange={handleChange}
            placeholder="https://seu-n8n.com/webhook/memoria"
            className="flex-1 p-2.5 border border-gray-300 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-cyan-500 outline-none transition-all bg-white dark:bg-[#1f2937]/50 text-gray-900 dark:text-white"
          />
          <button
            type="button"
            disabled={testingWebhook || !formData?.AGENT_MEMORY_WEBHOOK_URL}
            onClick={handleTestWebhook}
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold rounded-lg transition-all shadow-md disabled:opacity-50 flex items-center gap-2 cursor-pointer"
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
          className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 text-cyan-600 dark:text-cyan-400 text-xs font-semibold rounded-lg border border-gray-200 dark:border-white/5 transition-all shadow-sm cursor-pointer"
        >
          <FiChevronDown className="h-4 w-4 transform -rotate-90 text-cyan-500" />
          Logs de Sincronização de Memória
        </button>
      </div>
    </div>
  );
}
