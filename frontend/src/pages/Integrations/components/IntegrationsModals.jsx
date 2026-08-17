import React from 'react';
import ConfirmModal from '../../../components/ConfirmModal';
import IntegrationFormModal from './IntegrationFormModal';
import HistoryModal from './HistoryModal';
import DispatchHistoryModal from './DispatchHistoryModal';
import TestWebhookModal from './TestWebhookModal';
import PipelineModal from './PipelineModal';
import ContactsViewerModal from './ContactsViewerModal';
import { MaximizedJsonModal, EditJsonModal } from './JsonModals';
import { GuideModal, MappingGuideModal } from './GuideModals';
import ChildrenFunnelsModal from '../../../components/TriggerHistory/components/ChildrenFunnelsModal';

export default function IntegrationsModals({
  // Form Modal
  isModalOpen,
  setIsModalOpen,
  formData,
  setFormData,
  isSaving,
  handleSaveIntegration,
  editingIntegration,
  templates,
  funnels,
  chatwootLabels,
  setIsMappingGuideOpen,
  existingInternalTags,

  // History Modal
  isHistoryModalOpen,
  setIsHistoryModalOpen,
  setSelectedHistoryIds,
  historyIntegration,
  webhookHistory,
  loadingHistory,
  webhookHistorySearch,
  setWebhookHistorySearch,
  webhookHistoryStatusFilter,
  setWebhookHistoryStatusFilter,
  webhookHistoryMappingFilter,
  setWebhookHistoryMappingFilter,
  historyCurrentPage,
  setHistoryCurrentPage,
  historyPageSize,
  setHistoryPageSize,
  selectedHistoryIds,
  wrappedResend,
  handleSyncHistory,
  handleSyncAllHistory,
  handleExportHistory,
  handleImportHistory,
  isSyncingAll,
  syncProgress,
  isSyncing,
  isResending,
  setConfirmDeleteHistory,
  setConfirmResendHistory,
  setEditJsonModal,
  setMaximizedJson,
  fetchHistory,
  bulkResendProgress,
  setBulkResendProgress,
  toast,
  handleUpdateCustomFieldsMapping,

  // Dispatch History Modal
  isDispatchHistoryModalOpen,
  setIsDispatchHistoryModalOpen,
  dispatchIntegration,
  dispatchHistory,
  loadingDispatchHistory,
  dispatchSearch,
  setDispatchSearch,
  dispatchEventFilter,
  setDispatchEventFilter,
  dispatchTypeFilter,
  setDispatchTypeFilter,
  dispatchStatusFilter,
  setDispatchStatusFilter,
  dispatchTemplateFilter,
  setDispatchTemplateFilter,
  distinctTemplates,
  dispatchStartDate,
  setDispatchStartDate,
  dispatchEndDate,
  setDispatchEndDate,
  dispatchPage,
  setDispatchPage,
  dispatchLimit,
  setDispatchLimit,
  dispatchTotal,
  selectedDispatchIds,
  setSelectedDispatchIds,
  handleBulkDispatchPlay,
  handleDeleteDispatch,
  handlePlayDispatch,
  handleBackfillCosts,
  isBackfillingCosts,
  isBulkPlayingDispatches,
  isPlaying,
  isCancelling,
  setSelectedDispatch,
  setIsPipelineModalOpen,
  fetchDispatches,
  setConfirmDeleteDispatch,
  fetchChildren,
  dispatchStats,
  onNavigateToChat,

  // Test Modal
  isTestModalOpen,
  setIsTestModalOpen,
  integrationToTest,
  handleRunTest,
  isTesting,

  // Pipeline Modal
  isPipelineModalOpen,
  selectedDispatch,

  // Children Funnels Modal
  childrenModal,
  setChildrenModal,

  // Contacts Viewer Modal
  contactsModal,
  setContactsModal,
  contactsFilter,
  setContactsFilter,
  loadingContacts,

  // JSON Modals
  maximizedJson,
  editJsonModal,
  handleSaveJson,
  isSavingJson,

  // Guide Modals
  isGuideModalOpen,
  setIsGuideModalOpen,
  isMappingGuideOpen,

  // Delete / Resend Confirmations
  isDeleteModalOpen,
  setIsDeleteModalOpen,
  handleDeleteIntegration,
  integrationToDelete,
  confirmDeleteHistory,
  handleDeleteHistory,
  confirmResendHistory,
  handleBulkResendHistory,
  confirmDeleteDispatch
}) {
  return (
    <>
      <IntegrationFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        formData={formData}
        setFormData={setFormData}
        isSaving={isSaving}
        onSave={handleSaveIntegration}
        editingIntegration={editingIntegration}
        templates={templates}
        funnels={funnels}
        chatwootLabels={chatwootLabels}
        setIsMappingGuideOpen={setIsMappingGuideOpen}
        existingInternalTags={existingInternalTags}
      />

      <HistoryModal 
        isOpen={isHistoryModalOpen} 
        onClose={() => {
          setIsHistoryModalOpen(false);
          setSelectedHistoryIds([]);
        }} 
        integration={historyIntegration} 
        webhookHistory={webhookHistory} 
        loadingHistory={loadingHistory} 
        webhookHistorySearch={webhookHistorySearch} 
        setWebhookHistorySearch={setWebhookHistorySearch} 
        webhookHistoryStatusFilter={webhookHistoryStatusFilter} 
        setWebhookHistoryStatusFilter={setWebhookHistoryStatusFilter} 
        webhookHistoryMappingFilter={webhookHistoryMappingFilter}
        setWebhookHistoryMappingFilter={setWebhookHistoryMappingFilter} 
        historyCurrentPage={historyCurrentPage} 
        setHistoryCurrentPage={setHistoryCurrentPage} 
        historyPageSize={historyPageSize} 
        setHistoryPageSize={setHistoryPageSize} 
        selectedHistoryIds={selectedHistoryIds} 
        handleSelectAll={(e) => setSelectedHistoryIds(e.target.checked ? webhookHistory.map(i => i.id) : [])} 
        handleToggleSelect={(id) => setSelectedHistoryIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])} 
        handleResendWebhook={wrappedResend} 
        handleSyncHistory={handleSyncHistory} 
        handleSyncAllHistory={handleSyncAllHistory} 
        handleExportHistory={() => handleExportHistory(historyIntegration)} 
        handleImportHistory={(f) => handleImportHistory(f, historyIntegration.id)} 
        isSyncingAll={isSyncingAll} 
        syncProgress={syncProgress} 
        isSyncing={isSyncing} 
        isResending={isResending} 
        setConfirmDeleteHistory={setConfirmDeleteHistory} 
        setConfirmResendHistory={setConfirmResendHistory} 
        setEditJsonModal={setEditJsonModal} 
        setMaximizedJson={setMaximizedJson} 
        fetchHistory={fetchHistory} 
        bulkResendProgress={bulkResendProgress}
        setBulkResendProgress={setBulkResendProgress}
        toast={toast} 
        handleUpdateCustomFieldsMapping={handleUpdateCustomFieldsMapping}
      />

      <DispatchHistoryModal
        isOpen={isDispatchHistoryModalOpen}
        onClose={() => setIsDispatchHistoryModalOpen(false)}
        integration={dispatchIntegration}
        dispatchHistory={dispatchHistory}
        loadingDispatchHistory={loadingDispatchHistory}
        dispatchSearch={dispatchSearch}
        setDispatchSearch={setDispatchSearch}
        dispatchEventFilter={dispatchEventFilter}
        setDispatchEventFilter={setDispatchEventFilter}
        dispatchTypeFilter={dispatchTypeFilter}
        setDispatchTypeFilter={setDispatchTypeFilter}
        dispatchStatusFilter={dispatchStatusFilter}
        setDispatchStatusFilter={setDispatchStatusFilter}
        dispatchTemplateFilter={dispatchTemplateFilter}
        setDispatchTemplateFilter={setDispatchTemplateFilter}
        distinctTemplates={distinctTemplates}
        dispatchStartDate={dispatchStartDate}
        setDispatchStartDate={setDispatchStartDate}
        dispatchEndDate={dispatchEndDate}
        setDispatchEndDate={setDispatchEndDate}
        dispatchPage={dispatchPage}
        setDispatchPage={setDispatchPage}
        dispatchLimit={dispatchLimit}
        setDispatchLimit={setDispatchLimit}
        dispatchTotal={dispatchTotal}
        selectedDispatchIds={selectedDispatchIds}
        setSelectedDispatchIds={setSelectedDispatchIds}
        handleSelectAllDispatches={(e, list) => setSelectedDispatchIds(e.target.checked ? list.map(i => i.id) : [])}
        handleToggleSelectDispatch={(id) => setSelectedDispatchIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])}
        handleBulkDispatchPlay={() => handleBulkDispatchPlay(dispatchIntegration.id)}
        handleBulkDispatchDelete={() => handleDeleteDispatch(dispatchIntegration.id, 'bulk', null, selectedDispatchIds)}
        handlePlayDispatch={(id) => handlePlayDispatch(id, dispatchIntegration.id)}
        handleCancelDispatch={() => {}}
        handleBackfillCosts={() => handleBackfillCosts(dispatchIntegration.id)}
        isBackfillingCosts={isBackfillingCosts}
        isBulkPlayingDispatches={isBulkPlayingDispatches}
        isPlaying={isPlaying}
        isCancelling={isCancelling}
        setSelectedDispatch={setSelectedDispatch}
        setIsPipelineModalOpen={setIsPipelineModalOpen}
        fetchDispatches={fetchDispatches}
        setConfirmDeleteDispatch={setConfirmDeleteDispatch}
        fetchChildren={fetchChildren}
        dispatchStats={dispatchStats}
        onNavigateToChat={(phone, name) => {
          setIsDispatchHistoryModalOpen(false);
          if (onNavigateToChat) onNavigateToChat(phone, name);
        }}
      />

      <TestWebhookModal
        isOpen={isTestModalOpen}
        onClose={() => setIsTestModalOpen(false)}
        integration={integrationToTest}
        onTest={handleRunTest}
        isTesting={isTesting}
      />

      <PipelineModal
        isOpen={isPipelineModalOpen}
        onClose={() => setIsPipelineModalOpen(false)}
        dispatch={selectedDispatch}
      />

      <ChildrenFunnelsModal 
        childrenModal={childrenModal} 
        setChildrenModal={setChildrenModal} 
        setMonitoringTrigger={(trigger) => {
          setSelectedDispatch(trigger);
          setIsPipelineModalOpen(true);
        }} 
        fetchChildren={fetchChildren}
      />

      <ContactsViewerModal
        isOpen={contactsModal.isOpen}
        onClose={() => setContactsModal(prev => ({ ...prev, isOpen: false }))}
        triggerId={contactsModal.triggerId}
        contacts={contactsModal.contacts}
        counts={contactsModal.counts}
        filter={contactsFilter}
        setFilter={setContactsFilter}
        loading={loadingContacts}
        title={contactsModal.title}
        setContactsModal={setContactsModal}
      />

      <MaximizedJsonModal
        isOpen={!!maximizedJson}
        data={maximizedJson}
        onClose={() => setMaximizedJson(null)}
        toast={toast}
      />

      <EditJsonModal
        isOpen={editJsonModal.isOpen}
        data={editJsonModal.data}
        onClose={() => setEditJsonModal({ isOpen: false, data: '', id: null })}
        onSave={(data) => handleSaveJson(editJsonModal.id, data, historyIntegration?.id).then(success => success && setEditJsonModal({ isOpen: false, data: '', id: null }))}
        isSaving={isSavingJson}
      />

      <GuideModal
        isOpen={isGuideModalOpen}
        onClose={() => setIsGuideModalOpen(false)}
      />

      <MappingGuideModal
        isOpen={isMappingGuideOpen}
        onClose={() => setIsMappingGuideOpen(false)}
      />

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteIntegration}
        title="Excluir Integração"
        message={`Tem certeza que deseja excluir "${integrationToDelete?.name}"? Esta ação não pode ser desfeita.`}
      />

      <ConfirmModal
        isOpen={confirmDeleteHistory.isOpen}
        onClose={() => setConfirmDeleteHistory({ ...confirmDeleteHistory, isOpen: false })}
        onConfirm={() => handleDeleteHistory(historyIntegration?.id, confirmDeleteHistory.type, confirmDeleteHistory.id, confirmDeleteHistory.ids).then(() => setConfirmDeleteHistory({ ...confirmDeleteHistory, isOpen: false }))}
        title="Excluir Histórico"
        message="Deseja realmente excluir os registros selecionados?"
      />

      <ConfirmModal 
        isOpen={confirmResendHistory.isOpen} 
        onClose={() => setConfirmResendHistory({ isOpen: false, ids: [] })} 
        onConfirm={() => {
          handleBulkResendHistory(historyIntegration?.id, confirmResendHistory.ids);
          setConfirmResendHistory({ isOpen: false, ids: [] });
          setBulkResendProgress({
            status: 'pending',
            current: 0,
            total: confirmResendHistory.ids.length,
            type: 'webhook_resend'
          });
        }} 
        title="Reenviar Webhooks" 
        message={`Deseja realmente reenviar ${confirmResendHistory.ids?.length} webhooks selecionados para processamento?`} 
      />

      <ConfirmModal
        isOpen={confirmDeleteDispatch.isOpen}
        onClose={() => setConfirmDeleteDispatch({ ...confirmDeleteDispatch, isOpen: false })}
        onConfirm={() => handleDeleteDispatch(dispatchIntegration?.id, confirmDeleteDispatch.type, confirmDeleteDispatch.id, confirmDeleteDispatch.ids).then(() => setConfirmDeleteDispatch({ ...confirmDeleteDispatch, isOpen: false }))}
        title="Excluir Disparo"
        message="Deseja realmente excluir os disparos selecionados?"
      />
    </>
  );
}
