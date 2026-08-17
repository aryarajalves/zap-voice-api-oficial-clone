import React, { useState, useEffect, useMemo } from 'react';
import { API_URL, WS_URL } from '../config';
import { useClient } from '../contexts/ClientContext';
import { fetchWithAuth } from '../AuthContext';
import { toast } from 'react-hot-toast';

// Subcomponentes Modulares
import IntegrationsHeaderBanner from './Integrations/components/IntegrationsHeaderBanner';
import IntegrationsFilterBar from './Integrations/components/IntegrationsFilterBar';
import IntegrationsTable from './Integrations/components/IntegrationsTable';
import IntegrationsModals from './Integrations/components/IntegrationsModals';

// Hooks
import { useIntegrations } from './Integrations/hooks/useIntegrations';
import { useWebhookHistory } from './Integrations/hooks/useWebhookHistory';
import { useDispatchHistory } from './Integrations/hooks/useDispatchHistory';

export default function Integrations({
  onNavigateToLeads,
  onNavigateToBulk,
  onNavigateToDispatchHistory,
  onNavigateToFunnels,
  onNavigateToChat
}) {
  const { activeClient } = useClient();
  const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);
  const [isMappingGuideOpen, setIsMappingGuideOpen] = useState(false);
  const [maximizedJson, setMaximizedJson] = useState(null);
  const [editJsonModal, setEditJsonModal] = useState({ isOpen: false, data: '', id: null });
  const [isPipelineModalOpen, setIsPipelineModalOpen] = useState(false);
  const [selectedDispatch, setSelectedDispatch] = useState(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyIntegration, setHistoryIntegration] = useState(null);
  const [isDispatchHistoryModalOpen, setIsDispatchHistoryModalOpen] = useState(false);
  const [dispatchIntegration, setDispatchIntegration] = useState(null);
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [integrationToTest, setIntegrationToTest] = useState(null);
  const [isTesting, setIsTesting] = useState(false);
  const [confirmDeleteHistory, setConfirmDeleteHistory] = useState({ isOpen: false, type: 'clear', id: null, ids: [] });
  const [confirmResendHistory, setConfirmResendHistory] = useState({ isOpen: false, ids: [] });
  const [confirmDeleteDispatch, setConfirmDeleteDispatch] = useState({ isOpen: false, type: 'single', id: null, ids: [] });

  // Paginação e filtros locais da lista de integrações
  const [listPageSize, setListPageSize] = useState(5);
  const [listCurrentPage, setListCurrentPage] = useState(1);
  const [filterPlatform, setFilterPlatform] = useState('');
  const [filterHasTriggers, setFilterHasTriggers] = useState(false);
  const [filterHasHistory, setFilterHasHistory] = useState(false);

  const {
    integrations, loading, templates, chatwootLabels, funnels, isModalOpen, setIsModalOpen,
    isSaving, editingIntegration, formData, setFormData, isDeleteModalOpen, setIsDeleteModalOpen,
    integrationToDelete, setIntegrationToDelete, bulkResendProgress, setBulkResendProgress,
    fetchIntegrations, handleSaveIntegration, handleDeleteIntegration, openNewModal, openEditModal,
    leadTags
  } = useIntegrations(activeClient);

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

  const handleOpenHistory = (item) => {
    setHistoryCurrentPage(1);
    setWebhookHistoryStatusFilter('');
    setWebhookHistoryMappingFilter('');
    setWebhookHistorySearch('');
    setHistoryIntegration(item);
    setIsHistoryModalOpen(true);
    fetchHistory(item.id, '', '');
  };

  // WebSocket for real-time updates
  useEffect(() => {
    let ws;
    let reconnectTimeout;

    const connect = () => {
      if (!activeClient) return;
      const wsBase = WS_URL.endsWith('/ws') ? WS_URL : `${WS_URL}/ws`;
      const wsToken = localStorage.getItem('token');
      const wsFinalUrl = wsToken ? `${wsBase}?token=${wsToken}` : wsBase;

      try {
        ws = new WebSocket(wsFinalUrl);
        ws.onmessage = (event) => {
          const message = JSON.parse(event.data);
          if (message.event === 'bulk_progress' && message.data.type === 'webhook_resend') {
            setBulkResendProgress(message.data);
          }
          if (message.event === 'trigger_progress' || message.event === 'bulk_progress') {
            const data = message.data;
            const triggerId = data.id || data.trigger_id;

            if (isPipelineModalOpen && selectedDispatch?.id === triggerId) {
              setSelectedDispatch(prev => ({ ...prev, ...data }));
            }

            if (isDispatchHistoryModalOpen) {
              setDispatchHistory(prev => {
                const index = prev.findIndex(item => item.id === triggerId);
                if (index !== -1) {
                  const newHistory = [...prev];
                  const existingItem = newHistory[index];
                  const mappedData = {
                    status: data.status !== undefined ? data.status : existingItem.status,
                    total_sent: data.sent !== undefined ? data.sent : (data.total_sent !== undefined ? data.total_sent : existingItem.total_sent),
                    total_failed: data.failed !== undefined ? data.failed : (data.total_failed !== undefined ? data.total_failed : existingItem.total_failed),
                    total_contacts: data.total_contacts !== undefined ? data.total_contacts : (data.total !== undefined ? data.total : existingItem.total_contacts),
                    total_delivered: data.delivered !== undefined ? data.delivered : (data.total_delivered !== undefined ? data.total_delivered : existingItem.total_delivered),
                    total_read: data.read !== undefined ? data.read : (data.total_read !== undefined ? data.total_read : existingItem.total_read),
                    total_interactions: data.interactions !== undefined ? data.interactions : (data.total_interactions !== undefined ? data.total_interactions : existingItem.total_interactions),
                    total_blocked: data.blocked !== undefined ? data.blocked : (data.total_blocked !== undefined ? data.total_blocked : existingItem.total_blocked),
                    total_cost: data.cost !== undefined ? data.cost : (data.total_cost !== undefined ? data.total_cost : existingItem.total_cost),
                    total_memory_sent: data.memory_sent !== undefined ? data.memory_sent : (data.total_memory_sent !== undefined ? data.total_memory_sent : existingItem.total_memory_sent)
                  };
                  newHistory[index] = { ...existingItem, ...data, ...mappedData };
                  return newHistory;
                }
                return prev;
              });
            }

            if (['completed', 'failed', 'cancelled'].includes(data.status)) {
              fetchIntegrations(true);
            }
          }

          if (message.event === 'webhook_history_update') {
            const data = message.data;
            if (isHistoryModalOpen && historyIntegration?.id === data.integration_id) {
              setWebhookHistory(prev => {
                const index = prev.findIndex(item => item.id === data.history_id);
                if (index !== -1) {
                  const newHistory = [...prev];
                  newHistory[index] = { ...newHistory[index], processed_data: data.processed_data };
                  return newHistory;
                }
                return prev;
              });
            }
          }
        };
        ws.onclose = () => { reconnectTimeout = setTimeout(connect, 3000); };
      } catch (err) { console.error(err); }
    };

    connect();
    return () => {
      if (ws) { ws.onclose = null; ws.close(); }
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, [activeClient, isPipelineModalOpen, selectedDispatch?.id, isDispatchHistoryModalOpen, isHistoryModalOpen, historyIntegration?.id, fetchIntegrations, setBulkResendProgress, setDispatchHistory, setWebhookHistory]);

  useEffect(() => {
    if (bulkResendProgress?.status === 'completed' || bulkResendProgress?.status === 'failed') {
      const timer = setTimeout(() => {
        setBulkResendProgress(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [bulkResendProgress?.status, setBulkResendProgress]);

  const wrappedResend = async (id) => {
    const success = await handleResendWebhook(id);
    if (success && historyIntegration?.id) {
      if (dispatchIntegration?.id === historyIntegration.id) {
        fetchDispatches(historyIntegration.id, 1, dispatchLimit, '', '', '', '', '', '', true);
      }
    }
  };

  const handleRunTest = async (payload) => {
    if (!activeClient || !integrationToTest) return;
    setIsTesting(true);
    const loadingToast = toast.loading('Enviando webhook de teste...');
    try {
      const res = await fetchWithAuth(`${API_URL}/webhook-integrations/${integrationToTest.id}/test`, {
        method: 'POST',
        body: payload
      }, activeClient.id);

      if (res.ok) {
        toast.success('Teste enviado com sucesso!', { 
          id: loadingToast,
          icon: '🧪',
          duration: 4000 
        });
        setIsTestModalOpen(false);
      } else {
        const err = await res.json().catch(() => ({}));
        let errMsg = 'Erro ao enviar teste';
        if (err.detail) {
          if (Array.isArray(err.detail)) {
            errMsg = err.detail.map(d => `${d.loc ? d.loc.join('.') : 'campo'}: ${d.msg}`).join(', ');
          } else if (typeof err.detail === 'object') {
            errMsg = JSON.stringify(err.detail);
          } else {
            errMsg = err.detail;
          }
        }
        toast.error(errMsg, { id: loadingToast });
      }
    } catch (err) { 
      console.error(err);
      toast.error('Erro de conexão ao enviar teste', { id: loadingToast }); 
    } finally { 
      setIsTesting(false); 
    }
  };

  const existingInternalTags = useMemo(() => {
    const tagsSet = new Set();
    (integrations || []).forEach(integration => {
      (integration.mappings || []).forEach(m => {
        if (m.internal_tags) {
          m.internal_tags.split(',').forEach(t => {
            const clean = t.trim();
            if (clean) tagsSet.add(clean);
          });
        }
      });
    });
    (leadTags || []).forEach(t => {
      const clean = t.trim();
      if (clean) tagsSet.add(clean);
    });
    return Array.from(tagsSet);
  }, [integrations, leadTags]);

  // Filtros locais e paginação
  let filteredIntegrations = filterPlatform
    ? integrations.filter(i => i.platform === filterPlatform)
    : integrations;

  if (filterHasTriggers) {
    filteredIntegrations = filteredIntegrations.filter(i => (i.mappings || []).length > 0);
  }

  if (filterHasHistory) {
    filteredIntegrations = filteredIntegrations.filter(i => (i.history_count || 0) > 0);
  }

  const sortedIntegrations = [...filteredIntegrations].sort((a, b) => {
    const countA = a.history_count || 0;
    const countB = b.history_count || 0;
    return countB - countA;
  });

  const totalPages = Math.max(1, Math.ceil(sortedIntegrations.length / listPageSize));
  const safePage = Math.min(listCurrentPage, Math.max(1, totalPages));
  const paginatedIntegrations = sortedIntegrations.slice((safePage - 1) * listPageSize, safePage * listPageSize);

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
