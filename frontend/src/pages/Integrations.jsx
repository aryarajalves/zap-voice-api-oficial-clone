import React, { useState, useEffect, useCallback } from 'react';
import { FiPlus, FiTrash2, FiEdit2, FiCopy, FiZap, FiSettings, FiPlay, FiRefreshCw, FiEye, FiActivity, FiUsers, FiClock, FiShare2 } from 'react-icons/fi';
import { API_URL, WS_URL, WEBHOOK_BASE_URL } from '../config';

import { useClient } from '../contexts/ClientContext';
import { fetchWithAuth } from '../AuthContext';
import { toast } from 'react-hot-toast';
import ConfirmModal from '../components/ConfirmModal';

// Components
import PipelineCountdown from './Integrations/components/PipelineCountdown';
import IntegrationFormModal from './Integrations/components/IntegrationFormModal';
import HistoryModal from './Integrations/components/HistoryModal';
import DispatchHistoryModal from './Integrations/components/DispatchHistoryModal';
import TestWebhookModal from './Integrations/components/TestWebhookModal';
import PipelineModal from './Integrations/components/PipelineModal';
import ContactsViewerModal from './Integrations/components/ContactsViewerModal';
import { MaximizedJsonModal, EditJsonModal } from './Integrations/components/JsonModals';
import { GuideModal, MappingGuideModal } from './Integrations/components/GuideModals';

// Hooks
import { useIntegrations } from './Integrations/hooks/useIntegrations';
import { useWebhookHistory } from './Integrations/hooks/useWebhookHistory';
import { useDispatchHistory } from './Integrations/hooks/useDispatchHistory';

export default function Integrations() {
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

  const {
    integrations, loading, templates, chatwootLabels, isModalOpen, setIsModalOpen,
    isSaving, editingIntegration, formData, setFormData, isDeleteModalOpen, setIsDeleteModalOpen,
    integrationToDelete, setIntegrationToDelete, bulkResendProgress, setBulkResendProgress,
    fetchIntegrations, handleSaveIntegration, handleDeleteIntegration, openNewModal, openEditModal
  } = useIntegrations(activeClient);

  const {
    webhookHistory, loadingHistory, isResending, isSyncing, isSyncingAll, selectedHistoryIds, setSelectedHistoryIds,
    historyPageSize, setHistoryPageSize, historyCurrentPage, setHistoryCurrentPage,
    webhookHistoryStatusFilter, setWebhookHistoryStatusFilter, webhookHistorySearch, setWebhookHistorySearch,
    isSavingJson, syncProgress, fetchHistory, handleResendWebhook, handleSyncHistory, handleSyncAllHistory,
    handleExportHistory, handleImportHistory, handleDeleteHistory, handleSaveJson
  } = useWebhookHistory(activeClient);

  const {
    dispatchHistory, setDispatchHistory, loadingDispatchHistory, isPlaying, isCancelling,
    dispatchSearch, setDispatchSearch, dispatchEventFilter, setDispatchEventFilter,
    dispatchTypeFilter, setDispatchTypeFilter, dispatchStartDate, setDispatchStartDate,
    dispatchEndDate, setDispatchEndDate, dispatchPage, setDispatchPage, dispatchLimit, setDispatchLimit,
    dispatchTotal, selectedDispatchIds, setSelectedDispatchIds, isBackfillingCosts, isBulkPlayingDispatches,
    contactsModal, setContactsModal, contactsFilter, setContactsFilter, loadingContacts,
    fetchDispatches, handlePlayDispatch, handleDeleteDispatch, handleBulkDispatchPlay,
    handleBackfillCosts, fetchDispatchContacts
  } = useDispatchHistory(activeClient);

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
                  newHistory[index] = { ...newHistory[index], ...data };
                  return newHistory;
                }
                return prev;
              });
            }

            if (['completed', 'failed', 'cancelled'].includes(data.status)) {
              fetchIntegrations(true);
            }
          }

          // Real-time update for Webhook History (ManyChat status, etc)
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
  }, [activeClient, isPipelineModalOpen, selectedDispatch?.id, isDispatchHistoryModalOpen, fetchIntegrations]);

  const wrappedResend = async (id) => {
    const success = await handleResendWebhook(id);
    if (success && historyIntegration?.id) {
      // Se estivermos visualizando o histórico de disparos da mesma integração, atualiza
      if (dispatchIntegration?.id === historyIntegration.id) {
        fetchDispatches(historyIntegration.id, 1, dispatchLimit, '', '', '', '', '', true);
      }
    }
  };

  const handleRunTest = async (payload) => {
    if (!activeClient || !integrationToTest) return;
    setIsTesting(true);
    try {
      const res = await fetchWithAuth(`${API_URL}/webhook-integrations/${integrationToTest.id}/test`, {
        method: 'POST',
        body: payload // payload is already a stringified JSON from the modal
      }, activeClient.id);

      if (res.ok) {
        toast.success('Teste enviado com sucesso!');
        setIsTestModalOpen(false);
      } else {
        const err = await res.json();
        toast.error(err.detail || 'Erro ao enviar teste');
      }
    } catch (err) { 
      console.error(err);
      toast.error('Erro de conexão ao enviar teste'); 
    } finally { 
      setIsTesting(false); 
    }
  };

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-700">
      {/* Banner de Boas-vindas (Conforme Imagem Original) */}
      <div className="bg-[#1e293b]/80 backdrop-blur-xl rounded-3xl p-6 border border-white/5 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-5">
          <div className="w-12 h-12 bg-yellow-500/10 rounded-2xl flex items-center justify-center text-yellow-500 border border-yellow-500/20 shadow-[0_0_15px_rgba(234,179,8,0.1)]">
            <FiZap size={24} fill="currentColor" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
              Webhook Integrations
            </h2>
            <p className="text-gray-400 text-[11px] font-medium mt-0.5">
              Conecte a Hotmart, Kiwify, Eduzz para Automações de Eventos.
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMappingGuideOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gray-800/50 hover:bg-gray-800 text-gray-400 transition-all font-bold text-[9px] border border-white/5 uppercase tracking-widest"
          >
            <FiShare2 size={14} /> Guia
          </button>
          <button
            onClick={openNewModal}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white transition-all font-black text-[10px] shadow-lg shadow-blue-600/20 active:scale-95 uppercase tracking-widest"
          >
            <FiZap size={14} fill="currentColor" /> Nova Integração
          </button>
        </div>
      </div>
      
      {/* Tabela de Integrações */}
      <div className="bg-white/50 dark:bg-[#1e293b]/40 rounded-2xl border border-gray-100 dark:border-white/5 backdrop-blur-xl shadow-xl overflow-x-auto custom-scrollbar">
        <table className="w-full text-left min-w-[900px]">
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-800/50">
              <th className="px-5 py-3 text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]">Nome</th>
              <th className="px-5 py-3 text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]">Plataforma</th>
              <th className="px-5 py-3 text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]">Webhook URL</th>
              <th className="px-5 py-3 text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]">Mapeamentos</th>
              <th className="px-5 py-3 text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {loading ? (
              <tr><td colSpan="5" className="px-8 py-20 text-center text-gray-500 italic">Carregando integrações...</td></tr>
            ) : integrations.length === 0 ? (
              <tr><td colSpan="5" className="px-8 py-20 text-center text-gray-500 italic">Nenhuma integração encontrada.</td></tr>
            ) : integrations.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-white/[0.01] transition-all group">
                <td className="px-8 py-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500 font-bold text-xs">{item.name.charAt(0).toUpperCase()}</div>
                    <span className="font-bold text-gray-900 dark:text-white">{item.name}</span>
                  </div>
                </td>
                <td className="px-8 py-6">
                  <span className="px-3 py-1 bg-gray-100 dark:bg-gray-800 text-blue-600 dark:text-blue-400 rounded-lg text-[10px] font-black uppercase tracking-widest">{item.platform}</span>
                </td>
                <td className="px-8 py-6">
                  <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded-lg border border-transparent group-hover:border-blue-500/20 transition-all max-w-[250px]">
                    <span className="truncate text-[11px] font-mono text-gray-500 dark:text-gray-400">
                      {`${WEBHOOK_BASE_URL}/api/webhooks/${item.custom_slug || item.id}`}
                    </span>

                    <FiCopy 
                      className="cursor-pointer text-gray-400 hover:text-blue-500 transition-colors shrink-0" 
                      onClick={() => { 
                        navigator.clipboard.writeText(`${WEBHOOK_BASE_URL}/api/webhooks/${item.custom_slug || item.id}`); 
                        toast.success('URL copiada!'); 
                      }} 
                    />
                  </div>
                </td>
                <td className="px-8 py-6">
                  <span className="text-sm font-bold text-gray-700 dark:text-gray-300">{(item.mappings || []).length} eventos</span>
                </td>
                <td className="px-5 py-2.5">
                  <div className="flex items-center justify-end gap-2">
                    <button 
                      onClick={() => { setDispatchIntegration(item); setIsDispatchHistoryModalOpen(true); }} 
                      className="shrink-0 text-[9px] font-black bg-indigo-500/10 text-indigo-500 px-2 py-1 rounded-md hover:bg-indigo-500 hover:text-white transition-all flex items-center gap-1 uppercase tracking-tighter"
                    >
                      <FiPlay size={10} /> Disparos
                    </button>
                    <button 
                      onClick={() => { setHistoryIntegration(item); setIsHistoryModalOpen(true); fetchHistory(item.id); }} 
                      className="shrink-0 text-[9px] font-black bg-blue-500/10 text-blue-500 px-2 py-1 rounded-md hover:bg-blue-500 hover:text-white transition-all flex items-center gap-1 uppercase tracking-tighter"
                    >
                      <FiActivity size={10} /> Histórico
                    </button>
                    <button 
                      onClick={() => { setIntegrationToTest(item); setIsTestModalOpen(true); }} 
                      className="shrink-0 text-[9px] font-black bg-emerald-500/10 text-emerald-500 px-2 py-1 rounded-md hover:bg-emerald-500 hover:text-white transition-all flex items-center gap-1 uppercase tracking-tighter"
                    >
                      <FiZap size={10} fill="currentColor" /> Testar
                    </button>
                    <button onClick={() => openEditModal(item)} className="shrink-0 p-1.5 text-gray-400 hover:text-blue-500 transition-all active:scale-90" title="Editar"><FiEdit2 size={14} /></button>
                    <button onClick={() => { setIntegrationToDelete(item); setIsDeleteModalOpen(true); }} className="shrink-0 p-1.5 text-gray-400 hover:text-red-500 transition-all active:scale-90" title="Excluir"><FiTrash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modals */}
      <IntegrationFormModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} formData={formData} setFormData={setFormData} isSaving={isSaving} onSave={handleSaveIntegration} editingIntegration={editingIntegration} templates={templates} chatwootLabels={chatwootLabels} setIsMappingGuideOpen={setIsMappingGuideOpen} />
      <HistoryModal isOpen={isHistoryModalOpen} onClose={() => setIsHistoryModalOpen(false)} integration={historyIntegration} webhookHistory={webhookHistory} loadingHistory={loadingHistory} webhookHistorySearch={webhookHistorySearch} setWebhookHistorySearch={setWebhookHistorySearch} webhookHistoryStatusFilter={webhookHistoryStatusFilter} setWebhookHistoryStatusFilter={setWebhookHistoryStatusFilter} historyCurrentPage={historyCurrentPage} setHistoryCurrentPage={setHistoryCurrentPage} historyPageSize={historyPageSize} setHistoryPageSize={setHistoryPageSize} selectedHistoryIds={selectedHistoryIds} handleSelectAll={(e) => setSelectedHistoryIds(e.target.checked ? webhookHistory.map(i => i.id) : [])} handleToggleSelect={(id) => setSelectedHistoryIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])} handleResendWebhook={wrappedResend} handleSyncHistory={handleSyncHistory} handleSyncAllHistory={handleSyncAllHistory} handleExportHistory={() => handleExportHistory(historyIntegration)} handleImportHistory={(f) => handleImportHistory(f, historyIntegration.id)} isSyncingAll={isSyncingAll} syncProgress={syncProgress} isSyncing={isSyncing} isResending={isResending} setConfirmDeleteHistory={setConfirmDeleteHistory} setConfirmResendHistory={setConfirmResendHistory} setEditJsonModal={setEditJsonModal} setMaximizedJson={setMaximizedJson} fetchHistory={fetchHistory} toast={toast} />
      <DispatchHistoryModal isOpen={isDispatchHistoryModalOpen} onClose={() => setIsDispatchHistoryModalOpen(false)} integration={dispatchIntegration} dispatchHistory={dispatchHistory} loadingDispatchHistory={loadingDispatchHistory} dispatchSearch={dispatchSearch} setDispatchSearch={setDispatchSearch} dispatchEventFilter={dispatchEventFilter} setDispatchEventFilter={setDispatchEventFilter} dispatchTypeFilter={dispatchTypeFilter} setDispatchTypeFilter={setDispatchTypeFilter} dispatchStartDate={dispatchStartDate} setDispatchStartDate={setDispatchStartDate} dispatchEndDate={dispatchEndDate} setDispatchEndDate={setDispatchEndDate} dispatchPage={dispatchPage} setDispatchPage={setDispatchPage} dispatchLimit={dispatchLimit} setDispatchLimit={setDispatchLimit} dispatchTotal={dispatchTotal} selectedDispatchIds={selectedDispatchIds} setSelectedDispatchIds={setSelectedDispatchIds} handleSelectAllDispatches={(e, list) => setSelectedDispatchIds(e.target.checked ? list.map(i => i.id) : [])} handleToggleSelectDispatch={(id) => setSelectedDispatchIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])} handleBulkDispatchPlay={() => handleBulkDispatchPlay(dispatchIntegration.id)} handleBulkDispatchDelete={() => handleDeleteDispatch(dispatchIntegration.id, 'bulk', null, selectedDispatchIds)} handlePlayDispatch={(id) => handlePlayDispatch(id, dispatchIntegration.id)} handleCancelDispatch={() => {}} handleBackfillCosts={() => handleBackfillCosts(dispatchIntegration.id)} isBackfillingCosts={isBackfillingCosts} isBulkPlayingDispatches={isBulkPlayingDispatches} isPlaying={isPlaying} isCancelling={isCancelling} setSelectedDispatch={setSelectedDispatch} setIsPipelineModalOpen={setIsPipelineModalOpen} fetchDispatches={fetchDispatches} setConfirmDeleteDispatch={setConfirmDeleteDispatch} />
      <TestWebhookModal isOpen={isTestModalOpen} onClose={() => setIsTestModalOpen(false)} integration={integrationToTest} onTest={handleRunTest} isTesting={isTesting} />
      <PipelineModal isOpen={isPipelineModalOpen} onClose={() => setIsPipelineModalOpen(false)} dispatch={selectedDispatch} />
      <ContactsViewerModal isOpen={contactsModal.isOpen} onClose={() => setContactsModal(prev => ({ ...prev, isOpen: false }))} triggerId={contactsModal.triggerId} contacts={contactsModal.contacts} counts={contactsModal.counts} filter={contactsFilter} setFilter={setContactsFilter} loading={loadingContacts} title={contactsModal.title} />
      <MaximizedJsonModal isOpen={!!maximizedJson} data={maximizedJson} onClose={() => setMaximizedJson(null)} toast={toast} />
      <EditJsonModal isOpen={editJsonModal.isOpen} data={editJsonModal.data} onClose={() => setEditJsonModal({ isOpen: false, data: '', id: null })} onSave={(data) => handleSaveJson(editJsonModal.id, data, historyIntegration.id).then(success => success && setEditJsonModal({ isOpen: false, data: '', id: null }))} isSaving={isSavingJson} />
      <GuideModal isOpen={isGuideModalOpen} onClose={() => setIsGuideModalOpen(false)} />
      <MappingGuideModal isOpen={isMappingGuideOpen} onClose={() => setIsMappingGuideOpen(false)} />
      <ConfirmModal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} onConfirm={handleDeleteIntegration} title="Excluir Integração" message={`Tem certeza que deseja excluir "${integrationToDelete?.name}"? Esta ação não pode ser desfeita.`} />
      <ConfirmModal isOpen={confirmDeleteHistory.isOpen} onClose={() => setConfirmDeleteHistory({ ...confirmDeleteHistory, isOpen: false })} onConfirm={() => handleDeleteHistory(historyIntegration.id, confirmDeleteHistory.type, confirmDeleteHistory.id, confirmDeleteHistory.ids).then(() => setConfirmDeleteHistory({ ...confirmDeleteHistory, isOpen: false }))} title="Excluir Histórico" message="Deseja realmente excluir os registros selecionados?" />
      <ConfirmModal isOpen={confirmDeleteDispatch.isOpen} onClose={() => setConfirmDeleteDispatch({ ...confirmDeleteDispatch, isOpen: false })} onConfirm={() => handleDeleteDispatch(dispatchIntegration.id, confirmDeleteDispatch.type, confirmDeleteDispatch.id, confirmDeleteDispatch.ids).then(() => setConfirmDeleteDispatch({ ...confirmDeleteDispatch, isOpen: false }))} title="Excluir Disparo" message="Deseja realmente excluir os disparos selecionados?" />
    </div>
  );
}
