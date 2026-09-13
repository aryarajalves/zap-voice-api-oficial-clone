import React from 'react';
import { toast } from 'react-hot-toast';
import { useClient } from '../contexts/ClientContext';

// Subcomponentes Modulares
import IntegrationsHeaderBanner from './Integrations/components/IntegrationsHeaderBanner';
import IntegrationsFilterBar from './Integrations/components/IntegrationsFilterBar';
import IntegrationsTable from './Integrations/components/IntegrationsTable';
import IntegrationsModals from './Integrations/components/IntegrationsModals';

// Hooks Modulares
import { useIntegrations } from './Integrations/hooks/useIntegrations';
import { useWebhookHistory } from './Integrations/hooks/useWebhookHistory';
import { useDispatchHistory } from './Integrations/hooks/useDispatchHistory';
import { useIntegrationsTableFilter } from './Integrations/hooks/useIntegrationsTableFilter';
import { useIntegrationsSocket } from './Integrations/hooks/useIntegrationsSocket';
import { useIntegrationsPageModals } from './Integrations/hooks/useIntegrationsPageModals';

export default function Integrations({
  onNavigateToLeads,
  onNavigateToBulk,
  onNavigateToDispatchHistory,
  onNavigateToFunnels,
  onNavigateToChat
}) {
  const { activeClient } = useClient();

  // 1. Hook de Integrações (Listagem, Criação, Edição, Deleção, Templates e Tags)
  const {
    integrations, loading, templates, chatwootLabels, funnels, isModalOpen, setIsModalOpen,
    isSaving, editingIntegration, formData, setFormData, isDeleteModalOpen, setIsDeleteModalOpen,
    integrationToDelete, setIntegrationToDelete, bulkResendProgress, setBulkResendProgress,
    fetchIntegrations, handleSaveIntegration, handleDeleteIntegration, openNewModal, openEditModal,
    leadTags
  } = useIntegrations(activeClient);

  // 2. Hook de Histórico de Webhooks (Registros, Sincronização, Reenvio e Mapeamento)
  const {
    webhookHistory, setWebhookHistory, loadingHistory, isResending, isSyncing, isSyncingAll, selectedHistoryIds, setSelectedHistoryIds,
    historyPageSize, setHistoryPageSize, historyCurrentPage, setHistoryCurrentPage,
    webhookHistoryStatusFilter, setWebhookHistoryStatusFilter,
    webhookHistoryMappingFilter, setWebhookHistoryMappingFilter,
    webhookHistorySearch, setWebhookHistorySearch,
    isSavingJson, syncProgress, fetchHistory, handleResendWebhook, handleSyncHistory, handleSyncAllHistory,
    handleBulkResendHistory,
    handleExportHistory, handleImportHistory, handleDeleteHistory, handleSaveJson,
    handleUpdateCustomFieldsMapping
  } = useWebhookHistory(activeClient, fetchIntegrations);

  // 3. Hook de Histórico de Disparos
  const {
    dispatchHistory, setDispatchHistory, loadingDispatchHistory, isPlaying, isCancelling,
    dispatchSearch, setDispatchSearch, dispatchEventFilter, setDispatchEventFilter,
    dispatchTypeFilter, setDispatchTypeFilter, dispatchStatusFilter, setDispatchStatusFilter,
    dispatchTemplateFilter, setDispatchTemplateFilter,
    distinctTemplates, dispatchStartDate, setDispatchStartDate,
    dispatchEndDate, setDispatchEndDate, dispatchPage, setDispatchPage, dispatchLimit, setDispatchLimit,
    dispatchTotal, selectedDispatchIds, setSelectedDispatchIds, isBackfillingCosts, isBulkPlayingDispatches,
    contactsModal, setContactsModal, contactsFilter, setContactsFilter, loadingContacts,
    childrenModal, setChildrenModal, dispatchStats,
    fetchDispatches, handlePlayDispatch, handleDeleteDispatch, handleBulkDispatchPlay,
    handleBackfillCosts, fetchChildren
  } = useDispatchHistory(activeClient);

  // 4. Hook de Modais e Ações da Página
  const {
    isGuideModalOpen, setIsGuideModalOpen,
    isMappingGuideOpen, setIsMappingGuideOpen,
    maximizedJson, setMaximizedJson,
    editJsonModal, setEditJsonModal,
    isPipelineModalOpen, setIsPipelineModalOpen,
    selectedDispatch, setSelectedDispatch,
    isHistoryModalOpen, setIsHistoryModalOpen,
    historyIntegration, setHistoryIntegration,
    isDispatchHistoryModalOpen, setIsDispatchHistoryModalOpen,
    dispatchIntegration, setDispatchIntegration,
    isTestModalOpen, setIsTestModalOpen,
    integrationToTest, setIntegrationToTest,
    isTesting,
    confirmDeleteHistory, setConfirmDeleteHistory,
    confirmResendHistory, setConfirmResendHistory,
    confirmDeleteDispatch, setConfirmDeleteDispatch,
    handleOpenHistory,
    wrappedResend,
    handleRunTest
  } = useIntegrationsPageModals({
    activeClient,
    fetchHistory,
    setHistoryCurrentPage,
    setWebhookHistoryStatusFilter,
    setWebhookHistoryMappingFilter,
    setWebhookHistorySearch,
    handleResendWebhook,
    fetchDispatches,
    dispatchLimit
  });

  // 5. Hook de WebSocket em Tempo Real
  useIntegrationsSocket({
    activeClient,
    isPipelineModalOpen,
    selectedDispatchId: selectedDispatch?.id,
    isDispatchHistoryModalOpen,
    isHistoryModalOpen,
    historyIntegrationId: historyIntegration?.id,
    fetchIntegrations,
    setBulkResendProgress,
    setSelectedDispatch,
    setDispatchHistory,
    setWebhookHistory,
    bulkResendProgress
  });

  // 6. Hook de Filtros da Tabela, Ordenação e Paginação
  const {
    listPageSize, setListPageSize,
    listCurrentPage, setListCurrentPage,
    filterPlatform, setFilterPlatform,
    filterHasTriggers, setFilterHasTriggers,
    filterHasHistory, setFilterHasHistory,
    existingInternalTags,
    filteredIntegrations,
    sortedIntegrations,
    totalPages,
    safePage,
    paginatedIntegrations
  } = useIntegrationsTableFilter(integrations, leadTags);

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-700">
      {/* Banner de Boas-vindas e Navegação */}
      <IntegrationsHeaderBanner
        onNavigateToLeads={onNavigateToLeads}
        onNavigateToBulk={onNavigateToBulk}
        onNavigateToDispatchHistory={onNavigateToDispatchHistory}
        onNavigateToFunnels={onNavigateToFunnels}
        onOpenMappingGuide={() => setIsMappingGuideOpen(true)}
        onOpenNewModal={openNewModal}
      />
      
      {/* Tabela de Integrações */}
      <div className="bg-white/50 dark:bg-[#1e293b]/40 rounded-2xl border border-gray-100 dark:border-white/5 backdrop-blur-xl shadow-xl overflow-hidden">
        {!loading && integrations.length > 0 && (
          <IntegrationsFilterBar
            integrations={integrations}
            filterPlatform={filterPlatform}
            setFilterPlatform={setFilterPlatform}
            filterHasTriggers={filterHasTriggers}
            setFilterHasTriggers={setFilterHasTriggers}
            filterHasHistory={filterHasHistory}
            setFilterHasHistory={setFilterHasHistory}
            onResetPage={() => setListCurrentPage(1)}
          />
        )}

        <IntegrationsTable
          loading={loading}
          filteredIntegrations={filteredIntegrations}
          paginatedIntegrations={paginatedIntegrations}
          listPageSize={listPageSize}
          setListPageSize={setListPageSize}
          listCurrentPage={listCurrentPage}
          setListCurrentPage={setListCurrentPage}
          safePage={safePage}
          totalPages={totalPages}
          filterPlatform={filterPlatform}
          totalIntegrationsCount={integrations.length}
          onOpenHistory={handleOpenHistory}
          onOpenDispatchHistory={(item) => { setDispatchIntegration(item); setIsDispatchHistoryModalOpen(true); }}
          onOpenTestModal={(item) => { setIntegrationToTest(item); setIsTestModalOpen(true); }}
          onOpenEditModal={openEditModal}
          onOpenDeleteModal={(item) => { setIntegrationToDelete(item); setIsDeleteModalOpen(true); }}
        />
      </div>

      {/* Modais da Tela */}
      <IntegrationsModals
        isModalOpen={isModalOpen}
        setIsModalOpen={setIsModalOpen}
        formData={formData}
        setFormData={setFormData}
        isSaving={isSaving}
        handleSaveIntegration={handleSaveIntegration}
        editingIntegration={editingIntegration}
        templates={templates}
        funnels={funnels}
        chatwootLabels={chatwootLabels}
        setIsMappingGuideOpen={setIsMappingGuideOpen}
        existingInternalTags={existingInternalTags}
        isHistoryModalOpen={isHistoryModalOpen}
        setIsHistoryModalOpen={setIsHistoryModalOpen}
        setSelectedHistoryIds={setSelectedHistoryIds}
        historyIntegration={historyIntegration}
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
        wrappedResend={wrappedResend}
        handleSyncHistory={handleSyncHistory}
        handleSyncAllHistory={handleSyncAllHistory}
        handleExportHistory={() => handleExportHistory(historyIntegration)}
        handleImportHistory={(f) => handleImportHistory(f, historyIntegration?.id)}
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
        isDispatchHistoryModalOpen={isDispatchHistoryModalOpen}
        setIsDispatchHistoryModalOpen={setIsDispatchHistoryModalOpen}
        dispatchIntegration={dispatchIntegration}
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
        handleBulkDispatchPlay={() => handleBulkDispatchPlay(dispatchIntegration?.id)}
        handleDeleteDispatch={() => handleDeleteDispatch(dispatchIntegration?.id, 'bulk', null, selectedDispatchIds)}
        handlePlayDispatch={(id) => handlePlayDispatch(id, dispatchIntegration?.id)}
        handleBackfillCosts={() => handleBackfillCosts(dispatchIntegration?.id)}
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
        isTestModalOpen={isTestModalOpen}
        setIsTestModalOpen={setIsTestModalOpen}
        integrationToTest={integrationToTest}
        handleRunTest={handleRunTest}
        isTesting={isTesting}
        isPipelineModalOpen={isPipelineModalOpen}
        selectedDispatch={selectedDispatch}
        childrenModal={childrenModal}
        setChildrenModal={setChildrenModal}
        contactsModal={contactsModal}
        setContactsModal={setContactsModal}
        contactsFilter={contactsFilter}
        setContactsFilter={setContactsFilter}
        loadingContacts={loadingContacts}
        maximizedJson={maximizedJson}
        editJsonModal={editJsonModal}
        handleSaveJson={handleSaveJson}
        isSavingJson={isSavingJson}
        isGuideModalOpen={isGuideModalOpen}
        setIsGuideModalOpen={setIsGuideModalOpen}
        isMappingGuideOpen={isMappingGuideOpen}
        isDeleteModalOpen={isDeleteModalOpen}
        setIsDeleteModalOpen={setIsDeleteModalOpen}
        handleDeleteIntegration={handleDeleteIntegration}
        integrationToDelete={integrationToDelete}
        confirmDeleteHistory={confirmDeleteHistory}
        handleDeleteHistory={handleDeleteHistory}
        confirmResendHistory={confirmResendHistory}
        handleBulkResendHistory={handleBulkResendHistory}
        confirmDeleteDispatch={confirmDeleteDispatch}
      />
    </div>
  );
}
