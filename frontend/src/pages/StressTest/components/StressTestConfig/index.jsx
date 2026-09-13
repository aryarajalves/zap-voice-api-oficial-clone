import React from 'react';
import TestTypeSelector from './TestTypeSelector';
import WebhookConfigSection from './WebhookConfigSection';
import ContactsConfigSection from './ContactsConfigSection';
import FunnelAndTemplateConfigSection from './FunnelAndTemplateConfigSection';
import ExecutionParamsSection from './ExecutionParamsSection';
import TestActionButtons from './TestActionButtons';

export {
  TestTypeSelector,
  WebhookConfigSection,
  ContactsConfigSection,
  FunnelAndTemplateConfigSection,
  ExecutionParamsSection,
  TestActionButtons
};

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
  isSubmitting,
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
  return (
    <div className="lg:col-span-1 bg-white dark:bg-[#131722] border border-gray-200 dark:border-white/5 rounded-3xl p-6 shadow-xl space-y-6">
      <form onSubmit={handleStartTest} className="space-y-4">
        <TestTypeSelector
          testType={testType}
          setTestType={setTestType}
        />

        {testType === 'webhook' ? (
          <WebhookConfigSection
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
            webhookSendEach={webhookSendEach}
            setWebhookSendEach={setWebhookSendEach}
            setPreviewEvent={setPreviewEvent}
            setJsonMaximized={setJsonMaximized}
          />
        ) : testType === 'contacts' ? (
          <ContactsConfigSection
            contactsCount={contactsCount}
            setContactsCount={setContactsCount}
            contactsTagCount={contactsTagCount}
            setContactsTagCount={setContactsTagCount}
          />
        ) : (
          <FunnelAndTemplateConfigSection
            testType={testType}
            funnelId={funnelId}
            setFunnelId={setFunnelId}
            templateName={templateName}
            setTemplateName={setTemplateName}
            pricingCategory={pricingCategory}
            setPricingCategory={setPricingCategory}
            interactionFunnelId={interactionFunnelId}
            setInteractionFunnelId={setInteractionFunnelId}
            blockFunnelId={blockFunnelId}
            setBlockFunnelId={setBlockFunnelId}
            funnels={funnels}
            loadingFunnels={loadingFunnels}
          />
        )}

        {testType !== 'webhook' && testType !== 'contacts' && (
          <ExecutionParamsSection
            numberOfContacts={numberOfContacts}
            setNumberOfContacts={setNumberOfContacts}
            delaySeconds={delaySeconds}
            setDelaySeconds={setDelaySeconds}
            concurrencyLimit={concurrencyLimit}
            setConcurrencyLimit={setConcurrencyLimit}
            ALL_ERRORS={ALL_ERRORS}
            selectedErrors={selectedErrors}
            setSelectedErrors={setSelectedErrors}
            setExplainError={setExplainError}
          />
        )}

        <TestActionButtons
          testType={testType}
          isWebhookRunning={isWebhookRunning}
          handleCancelWebhookTest={handleCancelWebhookTest}
          handleStartWebhookTest={handleStartWebhookTest}
          selectedIntegrationId={selectedIntegrationId}
          loadingWebhookIntegrations={loadingWebhookIntegrations}
          handleStartContactsTest={handleStartContactsTest}
          isContactsRunning={isContactsRunning}
          contactsCount={contactsCount}
          isSubmitting={isSubmitting}
        />
      </form>
    </div>
  );
}
