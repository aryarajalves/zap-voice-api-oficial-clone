import React from 'react';
import { FiEye } from 'react-icons/fi';
import IntegrationSearchSelect from '../IntegrationSearchSelect';

export default function WebhookConfigSection({
  webhookIntegrations,
  loadingWebhookIntegrations,
  selectedIntegrationId,
  setSelectedIntegrationId,
  webhookSelectedEvents,
  toggleWebhookEvent,
  toggleAllEvents,
  allEventsSelected,
  eventOptions,
  platformKey,
  webhookCount,
  setWebhookCount,
  webhookConcurrency,
  setWebhookConcurrency,
  webhookDelayMs,
  setWebhookDelayMs,
  webhookSendEach,
  setWebhookSendEach,
  setPreviewEvent,
  setJsonMaximized
}) {
  const selectedIntegration = webhookIntegrations.find(i => String(i.id) === String(selectedIntegrationId));

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
          Integração de Webhook
        </label>
        {loadingWebhookIntegrations ? (
          <div className="text-xs text-gray-400 italic py-2">Carregando integrações...</div>
        ) : webhookIntegrations.length === 0 ? (
          <div className="text-xs text-amber-500 italic py-2">Nenhuma integração cadastrada.</div>
        ) : (
          <IntegrationSearchSelect
            integrations={webhookIntegrations}
            value={selectedIntegrationId}
            onChange={setSelectedIntegrationId}
          />
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Tipos de Evento
            {webhookSelectedEvents.length > 1 && (
              <span className="ml-2 text-violet-400 normal-case font-normal">(aleatório a cada envio)</span>
            )}
          </label>
          <button
            type="button"
            onClick={toggleAllEvents}
            className="text-[10px] text-violet-400 hover:text-violet-300 transition-colors font-bold uppercase tracking-wide"
          >
            {allEventsSelected ? 'Desmarcar todos' : 'Selecionar todos'}
          </button>
        </div>
        <div className="bg-gray-900/40 border border-white/10 rounded-xl p-3 space-y-1.5 max-h-52 overflow-y-auto">
          {eventOptions.map(opt => {
            const isChecked = webhookSelectedEvents.includes(opt.value);
            return (
              <div key={opt.value} className="flex items-center gap-2 group">
                <label className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleWebhookEvent(opt.value)}
                    className="w-3.5 h-3.5 rounded border-gray-600 text-violet-600 focus:ring-violet-500/20 bg-transparent transition-all shrink-0"
                  />
                  <span className={`text-xs transition-colors ${isChecked ? 'text-white font-medium' : 'text-gray-500 group-hover:text-gray-300'}`}>
                    {opt.label}
                  </span>
                  <span className="text-[10px] text-gray-600 font-mono ml-auto shrink-0">{opt.value}</span>
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setPreviewEvent({ platform: platformKey, eventType: opt.value, label: opt.label });
                    setJsonMaximized(true);
                  }}
                  className="shrink-0 text-gray-600 hover:text-violet-400 transition-colors opacity-0 group-hover:opacity-100 p-0.5"
                  title="Ver payload"
                >
                  <FiEye size={12} />
                </button>
              </div>
            );
          })}
        </div>
        {webhookSelectedEvents.length === 0 && (
          <p className="text-[10px] text-red-400 mt-1">Selecione pelo menos 1 evento</p>
        )}
      </div>

      <div>
        <label className="flex items-center gap-3 cursor-pointer mb-3 p-2.5 bg-gray-900/40 border border-white/10 rounded-xl hover:border-violet-500/30 transition-all">
          <div className="relative shrink-0">
            <input
              type="checkbox"
              className="sr-only"
              checked={webhookSendEach}
              onChange={(e) => setWebhookSendEach(e.target.checked)}
            />
            <div className={`w-9 h-5 rounded-full transition-colors ${webhookSendEach ? 'bg-violet-600' : 'bg-gray-700'}`} />
            <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${webhookSendEach ? 'translate-x-4' : 'translate-x-0'}`} />
          </div>
          <div>
            <span className="text-xs font-bold text-white block">1 vez por evento selecionado</span>
            <span className="text-[10px] text-gray-500">
              {webhookSendEach
                ? `Disparará ${webhookSelectedEvents.length} evento${webhookSelectedEvents.length !== 1 ? 's' : ''} em ordem`
                : 'Desligado — usa quantidade abaixo'}
            </span>
          </div>
        </label>
        {!webhookSendEach && (
          <input
            type="number" min="1" max="500"
            value={webhookCount}
            onChange={(e) => setWebhookCount(parseInt(e.target.value) || 1)}
            className="w-full bg-gray-900/50 border border-white/10 rounded-xl p-3 text-sm text-white focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 transition-all outline-none"
          />
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Concorrência</label>
          <input
            type="number" min="1" max="20"
            value={webhookConcurrency}
            onChange={(e) => setWebhookConcurrency(parseInt(e.target.value) || 1)}
            className="w-full bg-gray-900/50 border border-white/10 rounded-xl p-3 text-sm text-white focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 transition-all outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Delay (ms)</label>
          <input
            type="number" min="0" max="5000"
            value={webhookDelayMs}
            onChange={(e) => setWebhookDelayMs(parseInt(e.target.value) || 0)}
            className="w-full bg-gray-900/50 border border-white/10 rounded-xl p-3 text-sm text-white focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 transition-all outline-none"
          />
        </div>
      </div>

      {selectedIntegration && (
        <div className="bg-violet-500/10 border border-violet-500/20 rounded-xl p-3">
          <span className="text-[10px] font-bold text-violet-400 uppercase tracking-wider block mb-1">URL do Webhook</span>
          <span className="text-xs text-gray-400 break-all font-mono">
            /api/webhooks/{selectedIntegration.custom_slug || selectedIntegration.id}
          </span>
        </div>
      )}
    </div>
  );
}
