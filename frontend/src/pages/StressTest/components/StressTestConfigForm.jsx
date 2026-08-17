import React from 'react';
import { FiZap, FiPlay, FiSlash, FiAlertCircle, FiEye } from 'react-icons/fi';
import IntegrationSearchSelect from './IntegrationSearchSelect';

export default function StressTestConfigForm({
  testType,
  setTestType,
  funnelId,
  setFunnelId,
  templateName,
  setTemplateName,
  numberOfContacts,
  setNumberOfContacts,
  delaySeconds,
  setDelaySeconds,
  concurrencyLimit,
  setConcurrencyLimit,
  pricingCategory,
  setPricingCategory,
  interactionFunnelId,
  setInteractionFunnelId,
  blockFunnelId,
  setBlockFunnelId,
  funnels,
  loadingFunnels,
  isRunning,
  handleStartTest,
  selectedErrors,
  setSelectedErrors,
  ALL_ERRORS,
  setExplainError,
  // Contacts import test
  contactsCount,
  setContactsCount,
  contactsTagCount,
  setContactsTagCount,
  isContactsRunning,
  handleStartContactsTest,
  // Webhook test
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
  isWebhookRunning,
  webhookSendEach,
  setWebhookSendEach,
  handleStartWebhookTest,
  handleCancelWebhookTest,
  setPreviewEvent,
  setJsonMaximized
}) {
  const selectedIntegration = webhookIntegrations.find(i => String(i.id) === String(selectedIntegrationId));

  return (
    <div className="lg:col-span-1 bg-white dark:bg-[#131722] border border-gray-200 dark:border-white/5 rounded-3xl p-6 shadow-xl space-y-6">
      <form onSubmit={handleStartTest} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
            Tipo de Teste
          </label>
          <div className="grid grid-cols-2 gap-1.5 bg-gray-100 dark:bg-gray-800/50 p-1.5 rounded-xl">
            <button
              type="button"
              onClick={() => setTestType('funnel')}
              className={`py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                testType === 'funnel'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              Funil
            </button>
            <button
              type="button"
              onClick={() => setTestType('template')}
              className={`py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                testType === 'template'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              Template
            </button>
            <button
              type="button"
              onClick={() => setTestType('webhook')}
              className={`py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1 ${
                testType === 'webhook'
                  ? 'bg-violet-600 text-white shadow-md'
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              <FiZap size={11} className="shrink-0" /> Webhook
            </button>
            <button
              type="button"
              onClick={() => setTestType('contacts')}
              className={`py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1 ${
                testType === 'contacts'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              👥 Contatos
            </button>
          </div>
        </div>

        {testType === 'webhook' ? (
          /* ── Webhook Test Form ── */
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
        ) : testType === 'contacts' ? (
          /* ── Contacts Import Form ── */
          <div className="space-y-4">
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3">
              <p className="text-xs text-emerald-300 leading-relaxed">
                Gera contatos fictícios com nomes, e-mails e etiquetas aleatórias e os insere diretamente no banco de contatos.
              </p>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Quantidade de Contatos</label>
              <input
                type="number"
                min="1"
                max="50000"
                value={contactsCount}
                onChange={(e) => setContactsCount(parseInt(e.target.value) || 1)}
                className="w-full bg-gray-900/50 border border-white/10 rounded-xl p-3 text-sm text-white focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition-all outline-none"
              />
              <p className="text-[10px] text-gray-500 mt-1">Máximo 50.000 por vez</p>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Etiquetas Aleatórias por Contato</label>
              <input
                type="number"
                min="1"
                max="15"
                value={contactsTagCount}
                onChange={(e) => setContactsTagCount(parseInt(e.target.value) || 1)}
                className="w-full bg-gray-900/50 border border-white/10 rounded-xl p-3 text-sm text-white focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition-all outline-none"
              />
            </div>
          </div>
        ) : testType === 'funnel' ? (
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Funil de Teste</label>
            <select
              value={funnelId}
              onChange={(e) => setFunnelId(e.target.value)}
              className="w-full bg-gray-900/50 border border-white/10 rounded-xl p-3 text-sm text-white focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all outline-none"
              disabled={loadingFunnels}
            >
              {funnels.map(f => (
                <option key={f.id} value={f.id} className="bg-[#131722] text-white">{f.is_pinned ? '📌 ' : ''}{f.name}{f.tag ? ` [${f.tag}]` : ''}</option>
              ))}
            </select>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Nome do Template</label>
              <input
                type="text"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="Ex: welcome_message"
                className="w-full bg-gray-900/50 border border-white/10 rounded-xl p-3 text-sm text-white focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Categoria do Template (Custo)</label>
              <div className="flex gap-2 bg-gray-100 dark:bg-gray-800/50 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setPricingCategory('marketing')}
                  className={`flex-1 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                    pricingCategory === 'marketing'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-200'
                  }`}
                >
                  Marketing (R$ 0,35)
                </button>
                <button
                  type="button"
                  onClick={() => setPricingCategory('utility')}
                  className={`flex-1 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                    pricingCategory === 'utility'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-200'
                  }`}
                >
                  Utility (R$ 0,07)
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Funil de Interação</label>
              <select
                value={interactionFunnelId}
                onChange={(e) => setInteractionFunnelId(e.target.value)}
                className="w-full bg-gray-900/50 border border-white/10 rounded-xl p-3 text-sm text-white focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all outline-none"
              >
                <option value="" className="bg-[#131722] text-white">Nenhum (Apenas envia template)</option>
                {funnels.map(f => (
                  <option key={f.id} value={f.id} className="bg-[#131722] text-white">{f.is_pinned ? '📌 ' : ''}{f.name}{f.tag ? ` [${f.tag}]` : ''}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Funil de Bloqueio</label>
              <select
                value={blockFunnelId}
                onChange={(e) => setBlockFunnelId(e.target.value)}
                className="w-full bg-gray-950/50 border border-white/10 rounded-xl p-3 text-sm text-white focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all outline-none"
              >
                <option value="" className="bg-[#131722] text-white">Nenhum</option>
                {funnels.map(f => (
                  <option key={f.id} value={f.id} className="bg-[#131722] text-white">{f.is_pinned ? '📌 ' : ''}{f.name}{f.tag ? ` [${f.tag}]` : ''}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {testType !== 'webhook' && testType !== 'contacts' && (
          <>
            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Quantidade de Contatos</label>
              <input
                type="number"
                min="1"
                max="20000"
                value={numberOfContacts}
                onChange={(e) => setNumberOfContacts(parseInt(e.target.value) || 1)}
                className="w-full bg-gray-900/50 border border-white/10 rounded-xl p-3 text-sm text-white focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Delay (segundos)</label>
                <input
                  type="number"
                  min="0"
                  value={delaySeconds}
                  onChange={(e) => setDelaySeconds(parseInt(e.target.value) || 0)}
                  className="w-full bg-gray-900/50 border border-white/10 rounded-xl p-3 text-sm text-white focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Concorrência</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={concurrencyLimit}
                  onChange={(e) => setConcurrencyLimit(parseInt(e.target.value) || 1)}
                  className="w-full bg-gray-900/50 border border-white/10 rounded-xl p-3 text-sm text-white focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all outline-none"
                />
              </div>
            </div>

            <div className="bg-amber-500/10 dark:bg-yellow-500/5 border border-amber-500/20 rounded-2xl p-4 mt-2 space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                <FiAlertCircle className="shrink-0" /> Erros Simulados (Taxa de 10%)
              </span>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                Selecione quais tipos de erro deseja que ocorram aleatoriamente durante o teste:
              </p>
              <div className="space-y-2.5 pt-1 border-l border-amber-500/20 pl-2">
                {ALL_ERRORS.map((errorReason) => {
                  const isChecked = selectedErrors.includes(errorReason);
                  return (
                    <div key={errorReason} className="flex items-start justify-between gap-2 text-[11px] font-mono text-gray-650 dark:text-gray-400">
                      <label className="flex items-start gap-2 cursor-pointer select-none flex-1">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            if (isChecked) {
                              setSelectedErrors(prev => prev.filter(e => e !== errorReason));
                            } else {
                              setSelectedErrors(prev => [...prev, errorReason]);
                            }
                          }}
                          className="mt-0.5 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500/20 w-3.5 h-3.5 bg-transparent transition-all"
                        />
                        <span className={isChecked ? "text-gray-800 dark:text-gray-200" : "text-gray-450 line-through"}>
                          {errorReason}
                        </span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setExplainError(errorReason)}
                        className="shrink-0 p-1 text-blue-500 hover:text-blue-600 hover:bg-blue-500/10 dark:hover:bg-blue-500/5 rounded transition-all"
                        title="Explicar erro"
                      >
                        <FiAlertCircle className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

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
              disabled={isRunning}
              className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-bold shadow-lg hover:shadow-blue-500/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FiPlay /> Iniciar Teste de Escala
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
