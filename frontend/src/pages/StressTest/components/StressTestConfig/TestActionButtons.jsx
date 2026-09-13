import React from 'react';
import { FiPlay, FiSlash, FiZap } from 'react-icons/fi';

export default function TestActionButtons({
  testType,
  isWebhookRunning,
  handleCancelWebhookTest,
  handleStartWebhookTest,
  selectedIntegrationId,
  loadingWebhookIntegrations,
  handleStartContactsTest,
  isContactsRunning,
  contactsCount,
  isSubmitting
}) {
  return (
    <div className="flex items-center gap-3 pt-2">
      {testType === 'webhook' ? (
        isWebhookRunning ? (
          <button
            type="button"
            onClick={handleCancelWebhookTest}
            className="w-full py-4 bg-gradient-to-r from-red-600 to-rose-600 text-white rounded-2xl font-bold shadow-lg hover:shadow-red-500/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <FiSlash /> Parar Teste
          </button>
        ) : (
          <button
            type="button"
            onClick={handleStartWebhookTest}
            disabled={!selectedIntegrationId || loadingWebhookIntegrations}
            className="w-full py-4 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-2xl font-bold shadow-lg hover:shadow-violet-500/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FiZap /> Iniciar Teste de Webhook
          </button>
        )
      ) : testType === 'contacts' ? (
        <button
          type="button"
          onClick={handleStartContactsTest}
          disabled={isContactsRunning}
          className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-2xl font-bold shadow-lg hover:shadow-emerald-500/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isContactsRunning
            ? <><span className="animate-spin inline-block">⏳</span>&nbsp;Importando {Number(contactsCount).toLocaleString('pt-BR')} contatos...</>
            : <>👥 Importar {Number(contactsCount).toLocaleString('pt-BR')} Contatos Fictícios</>
          }
        </button>
      ) : (
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-bold shadow-lg hover:shadow-blue-500/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {isSubmitting ? (
            <><span className="animate-spin inline-block">⏳</span>&nbsp;Enfileirando Teste de Escala...</>
          ) : (
            <><FiPlay /> Iniciar Teste de Escala</>
          )}
        </button>
      )}
    </div>
  );
}
