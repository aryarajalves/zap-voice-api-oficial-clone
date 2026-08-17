import React from 'react';
import {
  FiActivity, FiClock, FiSettings, FiSlash, FiCheckCircle, FiXCircle, FiAlertCircle, FiZap
} from 'react-icons/fi';
import CountdownBadge from './CountdownBadge';

export default function StressTestMonitorPanel({
  testType,
  onNavigateToHistory,
  onNavigateToIntegrations,
  onNavigateToContacts,
  isRunning,
  setShowConfirmCancel,
  // Contacts test
  isContactsRunning,
  contactsCount,
  contactsImportResult,
  contactsTagCount,
  setContactsImportResult,
  // Webhook test
  isWebhookRunning,
  webhookTestResults,
  setWebhookTestResults,
  selectedIntegration,
  // Trigger / Funnel / Template test
  activeTriggerId,
  triggerDetails,
  messageStats,
  pricingCategory,
  recentMessages
}) {
  return (
    <div className="lg:col-span-2 space-y-6">
      <div className="bg-white dark:bg-[#131722] p-6 rounded-3xl border border-gray-200 dark:border-white/5 shadow-xl">
        <div className="flex justify-between items-center pb-4 border-b border-gray-100 dark:border-white/5 mb-6">
          <div className="flex items-center gap-2">
            <FiActivity className="text-emerald-500 text-xl" />
            <h3 className="font-bold text-lg text-gray-850 dark:text-white">Painel de Monitoramento</h3>
          </div>
          <div className="flex items-center gap-2">
            {onNavigateToHistory && (
              <button
                type="button"
                onClick={onNavigateToHistory}
                className="px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500 text-blue-400 hover:text-white rounded-xl font-bold transition-all text-xs flex items-center gap-1.5 border border-blue-500/20"
                title="Ver Histórico de Disparos"
              >
                <FiClock size={12} /> Histórico
              </button>
            )}
            {onNavigateToIntegrations && (
              <button
                type="button"
                onClick={onNavigateToIntegrations}
                className="px-3 py-1.5 bg-violet-500/10 hover:bg-violet-500 text-violet-400 hover:text-white rounded-xl font-bold transition-all text-xs flex items-center gap-1.5 border border-violet-500/20"
                title="Ir para Integrações Webhook"
              >
                <FiSettings size={12} /> Integração
              </button>
            )}
            {onNavigateToContacts && (
              <button
                type="button"
                onClick={onNavigateToContacts}
                className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-white rounded-xl font-bold transition-all text-xs flex items-center gap-1.5 border border-emerald-500/20"
                title="Ir para Contatos"
              >
                👥 Contatos
              </button>
            )}
            {isRunning && (
              <button
                type="button"
                onClick={() => setShowConfirmCancel(true)}
                className="px-4 py-1.5 bg-red-150 dark:bg-red-950/30 text-red-600 dark:text-red-400 rounded-xl font-bold hover:bg-red-200 transition-all text-xs flex items-center gap-1.5 cursor-pointer border-0"
              >
                <FiSlash /> Abortar Teste
              </button>
            )}
          </div>
        </div>

        {testType === 'contacts' ? (
          /* ── Contacts Import Results ── */
          <div className="flex flex-col items-center justify-center min-h-[220px] gap-4">
            {isContactsRunning ? (
              <div className="flex flex-col items-center gap-3 text-center">
                <span className="text-5xl animate-bounce">👥</span>
                <p className="text-white font-bold text-lg">Importando contatos...</p>
                <p className="text-gray-400 text-sm">Inserindo {Number(contactsCount).toLocaleString('pt-BR')} registros no banco de contatos.</p>
              </div>
            ) : contactsImportResult ? (
              <div className="w-full space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-5 flex flex-col gap-1">
                    <span className="text-xs text-emerald-400 font-bold uppercase tracking-wider">Importados</span>
                    <span className="text-3xl font-black text-white">{contactsImportResult.imported.toLocaleString('pt-BR')}</span>
                  </div>
                  <div className="bg-gray-800/40 border border-white/10 rounded-2xl p-5 flex flex-col gap-1">
                    <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">Etiqueta ID</span>
                    <span className="text-sm font-mono font-bold text-emerald-300 break-all">{contactsImportResult.test_tag}</span>
                  </div>
                </div>
                <div className="bg-gray-800/30 border border-white/5 rounded-2xl p-4">
                  <p className="text-xs text-gray-400 leading-relaxed">
                    Contatos inseridos com {contactsTagCount} etiqueta{contactsTagCount !== 1 ? 's' : ''} aleatória{contactsTagCount !== 1 ? 's' : ''} cada + identificador <span className="font-mono text-emerald-300">{contactsImportResult.test_tag}</span>.
                  </p>
                </div>
                <div className="flex gap-3">
                  {onNavigateToContacts && (
                    <button
                      type="button"
                      onClick={onNavigateToContacts}
                      className="flex-1 py-2.5 text-xs font-bold text-emerald-400 hover:text-white bg-emerald-500/10 hover:bg-emerald-600 border border-emerald-500/30 hover:border-emerald-500 rounded-xl transition-all flex items-center justify-center gap-1.5"
                    >
                      👥 Ver Contatos
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setContactsImportResult(null)}
                    className="flex-1 py-2.5 text-xs font-bold text-gray-400 hover:text-white border border-white/10 hover:border-white/20 rounded-xl transition-all"
                  >
                    Limpar resultado
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 text-center opacity-50">
                <span className="text-5xl">👥</span>
                <p className="text-gray-400 text-sm">Configure a quantidade e clique em <strong className="text-white">Importar</strong> para popular o banco de contatos com dados fictícios.</p>
              </div>
            )}
          </div>
        ) : testType === 'webhook' ? (
          /* ── Webhook Test Results ── */
          webhookTestResults ? (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gray-50 dark:bg-gray-800/40 p-4 rounded-2xl border border-gray-100 dark:border-white/5">
                  <span className="text-xs text-gray-550 dark:text-gray-400 block font-bold uppercase">Status</span>
                  <span className={`text-base font-black uppercase ${isWebhookRunning ? 'text-violet-500 animate-pulse' : 'text-emerald-500'}`}>
                    {isWebhookRunning ? '⚡ Enviando...' : '✓ Concluído'}
                  </span>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800/40 p-4 rounded-2xl border border-gray-100 dark:border-white/5">
                  <span className="text-xs text-gray-550 dark:text-gray-400 block font-bold uppercase">Total</span>
                  <span className="text-xl font-black text-gray-900 dark:text-white">{webhookTestResults.total}</span>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800/40 p-4 rounded-2xl border border-gray-100 dark:border-white/5">
                  <span className="text-xs text-gray-550 dark:text-gray-400 block font-bold uppercase">OK / Falhas</span>
                  <span className="text-xl font-black">
                    <span className="text-emerald-500">{webhookTestResults.success}</span>
                    <span className="text-gray-450 mx-1">/</span>
                    <span className="text-red-500">{webhookTestResults.failed}</span>
                  </span>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800/40 p-4 rounded-2xl border border-gray-100 dark:border-white/5">
                  <span className="text-xs text-gray-550 dark:text-gray-400 block font-bold uppercase">Integração</span>
                  <span className="text-sm font-black text-violet-400 truncate block">{selectedIntegration?.name || '—'}</span>
                  <span className="text-[10px] text-gray-500">{selectedIntegration?.platform}</span>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">
                  <span>Progresso</span>
                  <span>{Math.round((webhookTestResults.sent / (webhookTestResults.total || 1)) * 100)}%</span>
                </div>
                <div className="w-full bg-gray-100 dark:bg-gray-800 h-3 rounded-full overflow-hidden">
                  <div
                    className="bg-violet-600 h-full rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, Math.round((webhookTestResults.sent / (webhookTestResults.total || 1)) * 100))}%` }}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Log de Eventos</h4>
                  <button
                    type="button"
                    onClick={() => setWebhookTestResults(null)}
                    className="text-[10px] text-gray-400 hover:text-red-400 transition-colors"
                  >
                    Limpar
                  </button>
                </div>
                <div className="bg-gray-900/40 border border-white/5 rounded-2xl p-4 max-h-[300px] overflow-y-auto space-y-1.5 font-mono text-xs text-white">
                  {webhookTestResults.log.length === 0 ? (
                    <div className="text-gray-500 text-center py-4">Aguardando eventos...</div>
                  ) : (
                    [...webhookTestResults.log].reverse().map((entry, idx) => (
                      <div key={idx} className="flex gap-2 items-center py-0.5 border-b border-white/5 pb-1">
                        <span className="text-gray-500 shrink-0">#{entry.index}</span>
                        {entry.ok ? (
                          <span className="text-emerald-500 flex items-center gap-1 shrink-0 font-bold"><FiCheckCircle /> {entry.status}</span>
                        ) : (
                          <span className="text-red-500 flex items-center gap-1 shrink-0 font-bold"><FiXCircle /> {entry.status || 'ERR'}</span>
                        )}
                        {entry.event && <span className="text-violet-400 font-mono text-[10px] shrink-0">{entry.event}</span>}
                        {entry.error && <span className="text-amber-400 italic truncate">{entry.error}</span>}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 space-y-3 text-gray-500">
              <FiZap className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-700" />
              <p>Nenhum teste de webhook ativo.</p>
              <p className="text-xs text-gray-400">Selecione uma integração e clique em "Iniciar Teste de Webhook".</p>
            </div>
          )
        ) : activeTriggerId ? (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gray-50 dark:bg-gray-800/40 p-4 rounded-2xl border border-gray-100 dark:border-white/5">
                <span className="text-xs text-gray-550 dark:text-gray-400 block font-bold uppercase">Status</span>
                {triggerDetails?.processed_data?.temp_paused ? (
                  <div className="flex flex-col">
                    <span className="text-base font-black text-amber-500 uppercase animate-pulse">
                      ⏳ Pausado
                    </span>
                    <span className="text-[10px] text-amber-500 font-bold">
                      Retomando em <CountdownBadge temp_paused_until={triggerDetails.processed_data.temp_paused_until} />s
                    </span>
                  </div>
                ) : (
                  <span className="text-base font-black text-blue-500 uppercase">{triggerDetails?.status || 'Processando'}</span>
                )}
              </div>
              <div className="bg-gray-50 dark:bg-gray-800/40 p-4 rounded-2xl border border-gray-100 dark:border-white/5">
                <span className="text-xs text-gray-550 dark:text-gray-400 block font-bold uppercase">Contatos</span>
                <span className="text-xl font-black text-gray-900 dark:text-white">
                  {messageStats?.total || triggerDetails?.total_contacts || 0}
                </span>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800/40 p-4 rounded-2xl border border-gray-100 dark:border-white/5">
                <span className="text-xs text-gray-550 dark:text-gray-400 block font-bold uppercase">Sucesso / Falhas</span>
                <span className="text-xl font-black">
                  <span className="text-emerald-500">{messageStats?.sent || 0}</span>
                  <span className="text-gray-450 mx-1">/</span>
                  <span className="text-red-500">{messageStats?.failed || 0}</span>
                </span>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800/40 p-4 rounded-2xl border border-gray-100 dark:border-white/5">
                <span className="text-xs text-gray-550 dark:text-gray-400 block font-bold uppercase">Custo Estimado</span>
                <span className="text-xl font-black text-blue-450">
                  R$ {((messageStats?.sent || 0) * (pricingCategory === 'marketing' ? 0.35 : 0.07)).toFixed(2)}
                </span>
              </div>
            </div>

            {/* Banner de Pausa Temporária por instabilidade da Meta */}
            {triggerDetails?.processed_data?.temp_paused && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex items-start gap-3 animate-pulse">
                <FiAlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="text-xs font-bold text-amber-600 dark:text-amber-400 block uppercase tracking-wider">
                    Disparo Pausado Temporariamente
                  </span>
                  <p className="text-xs text-gray-650 dark:text-gray-300">
                    {triggerDetails.processed_data.temp_paused_reason || "Instabilidade detectada nos servidores da Meta. Aguardando para retomar..."}
                  </p>
                </div>
              </div>
            )}

            {/* Progress bar */}
            <div>
              <div className="flex justify-between text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">
                <span>Progresso</span>
                <span>
                  {Math.round(
                    (((messageStats?.sent || 0) + (messageStats?.failed || 0)) / 
                    (messageStats?.total || triggerDetails?.total_contacts || 1)) * 100
                  )}%
                </span>
              </div>
              <div className="w-full bg-gray-100 dark:bg-gray-800 h-3 rounded-full overflow-hidden">
                <div 
                  className="bg-blue-600 h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.min(
                      100,
                      Math.round(
                        (((messageStats?.sent || 0) + (messageStats?.failed || 0)) / 
                        (messageStats?.total || triggerDetails?.total_contacts || 1)) * 100
                      )
                    )}%`
                  }}
                />
              </div>
            </div>

            {/* Recent messages log */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Mensagens Recentes</h4>
              <div className="bg-gray-900/40 border border-white/5 rounded-2xl p-4 max-h-[300px] overflow-y-auto space-y-2 font-mono text-xs text-white">
                {recentMessages.length === 0 ? (
                  <div className="text-gray-500 text-center py-4">Nenhuma mensagem registrada ainda.</div>
                ) : (
                  recentMessages.map((msg) => (
                    <div key={msg.id} className="flex gap-2 items-start py-0.5 border-b border-gray-100 dark:border-white/5 pb-1">
                      <span className="text-gray-500 shrink-0">[{new Date(msg.updated_at).toLocaleTimeString()}]</span>
                      <span className="text-blue-500 shrink-0">{msg.phone_number}</span>
                      {msg.status === 'sent' ? (
                        <span className="text-emerald-500 flex items-center gap-1 shrink-0 font-bold"><FiCheckCircle /> OK</span>
                      ) : (
                        <span className="text-red-500 flex items-center gap-1 shrink-0 font-bold"><FiXCircle /> FALHA</span>
                      )}
                      <span className="text-gray-600 dark:text-gray-400 truncate">{msg.content || `Simulado (Ref: ${msg.message_id})`}</span>
                      {msg.failure_reason && (
                        <span className="text-amber-500 italic">( {msg.failure_reason} )</span>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 space-y-3 text-gray-500">
            <FiActivity className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-700" />
            <p>Nenhum teste de estresse ativo no momento.</p>
            <p className="text-xs text-gray-400">Configure os parâmetros na barra lateral e clique em "Iniciar Teste".</p>
          </div>
        )}
      </div>
    </div>
  );
}
