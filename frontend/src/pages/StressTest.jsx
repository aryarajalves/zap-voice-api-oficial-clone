import React, { useState, useEffect } from 'react';
import { FiActivity, FiAlertCircle } from 'react-icons/fi';
import { useStressTest, PLATFORM_EVENT_OPTIONS } from './StressTest/hooks/useStressTest';

// Subcomponentes Modulares
import StressTestConfigForm from './StressTest/components/StressTestConfigForm';
import StressTestMonitorPanel from './StressTest/components/StressTestMonitorPanel';
import AbortConfirmModal from './StressTest/components/AbortConfirmModal';
import ExplainErrorModal from './StressTest/components/ExplainErrorModal';
import WebhookPayloadPreviewModal from './StressTest/components/WebhookPayloadPreviewModal';

export default function StressTest({
  onStartSuccess,
  onNavigateToHistory,
  onNavigateToIntegrations,
  onNavigateToContacts
}) {
  const {
    user,
    testType, setTestType, funnelId, setFunnelId, templateName, setTemplateName,
    numberOfContacts, setNumberOfContacts, delaySeconds, setDelaySeconds,
    concurrencyLimit, setConcurrencyLimit, pricingCategory, setPricingCategory,
    interactionFunnelId, setInteractionFunnelId, blockFunnelId, setBlockFunnelId,
    funnels, loadingFunnels,
    activeTriggerId, triggerDetails, messageStats, recentMessages, isRunning, isSubmitting,
    handleStartTest, handleCancelTest, selectedErrors, setSelectedErrors, ALL_ERRORS,
    // Contacts import test
    contactsCount, setContactsCount,
    contactsTagCount, setContactsTagCount,
    contactsImportResult, setContactsImportResult,
    isContactsRunning,
    handleStartContactsTest,
    // Webhook test
    webhookIntegrations, loadingWebhookIntegrations,
    selectedIntegrationId, setSelectedIntegrationId,
    webhookSelectedEvents, setWebhookSelectedEvents,
    webhookCount, setWebhookCount,
    webhookConcurrency, setWebhookConcurrency,
    webhookDelayMs, setWebhookDelayMs,
    webhookTestResults, setWebhookTestResults,
    isWebhookRunning,
    webhookSendEach, setWebhookSendEach,
    handleStartWebhookTest, handleCancelWebhookTest,
  } = useStressTest(onStartSuccess);

  const selectedIntegration = webhookIntegrations.find(i => String(i.id) === String(selectedIntegrationId));
  const platformKey = selectedIntegration?.platform?.toLowerCase() || '';
  const eventOptions = PLATFORM_EVENT_OPTIONS[platformKey] || [{ value: 'purchase_approved', label: 'Compra Aprovada' }];

  const toggleWebhookEvent = (value) => {
    setWebhookSelectedEvents(prev =>
      prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
    );
  };
  const allEventsSelected = eventOptions.every(o => webhookSelectedEvents.includes(o.value));
  const toggleAllEvents = () => {
    if (allEventsSelected) setWebhookSelectedEvents([]);
    else setWebhookSelectedEvents(eventOptions.map(o => o.value));
  };

  const [showConfirmCancel, setShowConfirmCancel] = useState(false);
  const [explainError, setExplainError] = useState(null);
  const [previewEvent, setPreviewEvent] = useState(null);
  const [jsonMaximized, setJsonMaximized] = useState(false);

  useEffect(() => {
    if (contactsImportResult && onNavigateToContacts) {
      onNavigateToContacts();
    }
  }, [contactsImportResult, onNavigateToContacts]);

  useEffect(() => {
    const mainEl = document.querySelector('main');
    if (previewEvent) {
      document.body.style.overflow = 'hidden';
      if (mainEl) mainEl.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      if (mainEl) mainEl.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      if (mainEl) mainEl.style.overflow = '';
    };
  }, [previewEvent]);

  if (user?.role !== 'super_admin') {
    return (
      <div className="flex-1 flex items-center justify-center p-6 min-h-[80vh]">
        <div className="max-w-md w-full bg-white dark:bg-[#131722] border border-gray-200 dark:border-white/5 rounded-3xl p-8 shadow-2xl text-center backdrop-blur-xl">
          <FiAlertCircle className="w-16 h-16 text-amber-500 mx-auto mb-4 animate-bounce" />
          <h2 className="text-2xl font-black text-gray-800 dark:text-white mb-2">Acesso Restrito</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
            Esta tela de Teste de Escala é restrita a administradores do sistema (Super Admin) para prevenir abusos.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto text-gray-800 dark:text-gray-200">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white flex items-center gap-3">
            <FiActivity className="text-blue-500" /> Teste de Escala
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            Dispare mensagens simuladas em lote para testar o comportamento e performance do seu servidor.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Formulário de Parâmetros */}
        <StressTestConfigForm
          testType={testType}
          setTestType={setTestType}
          funnelId={funnelId}
          setFunnelId={setFunnelId}
          templateName={templateName}
          setTemplateName={setTemplateName}
          numberOfContacts={numberOfContacts}
          setNumberOfContacts={setNumberOfContacts}
          delaySeconds={delaySeconds}
          setDelaySeconds={setDelaySeconds}
          concurrencyLimit={concurrencyLimit}
          setConcurrencyLimit={setConcurrencyLimit}
          pricingCategory={pricingCategory}
          setPricingCategory={setPricingCategory}
          interactionFunnelId={interactionFunnelId}
          setInteractionFunnelId={setInteractionFunnelId}
          blockFunnelId={blockFunnelId}
          setBlockFunnelId={setBlockFunnelId}
          funnels={funnels}
          loadingFunnels={loadingFunnels}
          isRunning={isRunning}
          isSubmitting={isSubmitting}
          handleStartTest={handleStartTest}
          selectedErrors={selectedErrors}
          setSelectedErrors={setSelectedErrors}
          ALL_ERRORS={ALL_ERRORS}
          setExplainError={setExplainError}
          contactsCount={contactsCount}
          setContactsCount={setContactsCount}
          contactsTagCount={contactsTagCount}
          setContactsTagCount={setContactsTagCount}
          isContactsRunning={isContactsRunning}
          handleStartContactsTest={handleStartContactsTest}
          webhookIntegrations={webhookIntegrations}
          loadingWebhookIntegrations={loadingWebhookIntegrations}
          selectedIntegrationId={selectedIntegrationId}
          setSelectedIntegrationId={setSelectedIntegrationId}
          webhookSelectedEvents={webhookSelectedEvents}
          toggleWebhookEvent={toggleWebhookEvent}
          toggleAllEvents={toggleAllEvents}
          allEventsSelected={allEventsSelected}
          eventOptions={eventOptions}
          platformKey={platformKey}
          webhookCount={webhookCount}
          setWebhookCount={setWebhookCount}
          webhookConcurrency={webhookConcurrency}
          setWebhookConcurrency={setWebhookConcurrency}
          webhookDelayMs={webhookDelayMs}
          setWebhookDelayMs={setWebhookDelayMs}
          isWebhookRunning={isWebhookRunning}
          webhookSendEach={webhookSendEach}
          setWebhookSendEach={setWebhookSendEach}
          handleStartWebhookTest={handleStartWebhookTest}
          handleCancelWebhookTest={handleCancelWebhookTest}
          setPreviewEvent={setPreviewEvent}
          setJsonMaximized={setJsonMaximized}
        />

        {/* Painel de Monitoramento */}
        <StressTestMonitorPanel
          testType={testType}
          onNavigateToHistory={onNavigateToHistory}
          onNavigateToIntegrations={onNavigateToIntegrations}
          onNavigateToContacts={onNavigateToContacts}
          isRunning={isRunning}
          setShowConfirmCancel={setShowConfirmCancel}
          isContactsRunning={isContactsRunning}
          contactsCount={contactsCount}
          contactsImportResult={contactsImportResult}
          contactsTagCount={contactsTagCount}
          setContactsImportResult={setContactsImportResult}
          isWebhookRunning={isWebhookRunning}
          webhookTestResults={webhookTestResults}
          setWebhookTestResults={setWebhookTestResults}
          selectedIntegration={selectedIntegration}
          activeTriggerId={activeTriggerId}
          triggerDetails={triggerDetails}
          messageStats={messageStats}
          pricingCategory={pricingCategory}
          recentMessages={recentMessages}
        />
      </div>

      {/* Modais */}
      <AbortConfirmModal
        isOpen={showConfirmCancel}
        onClose={() => setShowConfirmCancel(false)}
        onConfirm={() => {
          handleCancelTest();
          setShowConfirmCancel(false);
        }}
      />

      <ExplainErrorModal
        explainError={explainError}
        onClose={() => setExplainError(null)}
      />

      <WebhookPayloadPreviewModal
        previewEvent={previewEvent}
        jsonMaximized={jsonMaximized}
        setJsonMaximized={setJsonMaximized}
        onClose={() => setPreviewEvent(null)}
      />
    </div>
  );
}
