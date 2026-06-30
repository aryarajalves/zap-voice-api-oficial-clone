import React, { useState, useEffect, useCallback, useRef } from 'react';
import { FiPlus, FiTrash2, FiEdit2, FiCopy, FiZap, FiSettings, FiPlay, FiRefreshCw, FiEye, FiActivity, FiUsers, FiClock, FiShare2, FiChevronDown, FiSearch, FiSend, FiGitMerge } from 'react-icons/fi';
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
import ChildrenFunnelsModal from '../components/TriggerHistory/components/ChildrenFunnelsModal';

// Hooks
import { useIntegrations } from './Integrations/hooks/useIntegrations';
import { useWebhookHistory } from './Integrations/hooks/useWebhookHistory';
import { useDispatchHistory } from './Integrations/hooks/useDispatchHistory';

export default function Integrations({ onNavigateToLeads, onNavigateToBulk, onNavigateToDispatchHistory, onNavigateToFunnels, onNavigateToChat }) {
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

  // Paginação + filtro da lista de integrações
  const [listPageSize, setListPageSize] = useState(5);
  const [listCurrentPage, setListCurrentPage] = useState(1);
  const [filterPlatform, setFilterPlatform] = useState('');
  const [filterHasTriggers, setFilterHasTriggers] = useState(false);
  const [filterHasHistory, setFilterHasHistory] = useState(false);
  const [searchPlatformText, setSearchPlatformText] = useState('');
  const [isPlatformDropdownOpen, setIsPlatformDropdownOpen] = useState(false);
  const platformDropdownRef = useRef(null);

  // Fecha o dropdown de plataformas ao clicar fora
  useEffect(() => {
    function handleClickOutside(event) {
      if (platformDropdownRef.current && !platformDropdownRef.current.contains(event.target)) {
        setIsPlatformDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const {
    integrations, loading, templates, chatwootLabels, funnels, isModalOpen, setIsModalOpen,
    isSaving, editingIntegration, formData, setFormData, isDeleteModalOpen, setIsDeleteModalOpen,
    integrationToDelete, setIntegrationToDelete, bulkResendProgress, setBulkResendProgress,
    fetchIntegrations, handleSaveIntegration, handleDeleteIntegration, openNewModal, openEditModal,
    leadTags
  } = useIntegrations(activeClient);

  const {
    webhookHistory, loadingHistory, isResending, isSyncing, isSyncingAll, selectedHistoryIds, setSelectedHistoryIds,
    historyPageSize, setHistoryPageSize, historyCurrentPage, setHistoryCurrentPage,
    webhookHistoryStatusFilter, setWebhookHistoryStatusFilter,
    webhookHistoryMappingFilter, setWebhookHistoryMappingFilter,
    webhookHistorySearch, setWebhookHistorySearch,
    isSavingJson, syncProgress, fetchHistory, handleResendWebhook, handleSyncHistory, handleSyncAllHistory,
    handleBulkResendHistory,
    handleExportHistory, handleImportHistory, handleDeleteHistory, handleSaveJson
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
    handleBackfillCosts, fetchDispatchContacts, fetchChildren
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

  // Limpa o progresso de reenvio após 3 segundos de conclusão
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
      // Se estivermos visualizando o histórico de disparos da mesma integração, atualiza
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
        body: payload // payload is already a stringified JSON from the modal
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

  const existingInternalTags = React.useMemo(() => {
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

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-700">
      {/* Banner de Boas-vindas (Conforme Imagem Original) */}
      <div className="bg-[#1e293b]/80 backdrop-blur-xl rounded-3xl p-6 border border-white/5 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-5">
          <div className="w-12 h-12 bg-yellow-500/10 rounded-2xl flex items-center justify-center text-yellow-500 border border-yellow-500/20 shadow-[0_0_15px_rgba(234,179,8,0.1)]">
            <FiZap size={24} fill="currentColor" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-3">
              Webhook Integrations
              {onNavigateToLeads && (
                <button
                  onClick={onNavigateToLeads}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-500/10 hover:bg-blue-500 text-blue-400 hover:text-white transition-all text-[9px] font-black uppercase tracking-widest border border-blue-500/20"
                  title="Ir para Contatos"
                >
                  <FiUsers size={11} /> Contatos
                </button>
              )}
              {onNavigateToBulk && (
                <button
                  onClick={onNavigateToBulk}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500 text-indigo-400 hover:text-white transition-all text-[9px] font-black uppercase tracking-widest border border-indigo-500/20"
                  title="Ir para Disparo em Massa"
                >
                  <FiSend size={11} /> Disparo em Massa
                </button>
              )}
              {onNavigateToDispatchHistory && (
                <button
                  onClick={onNavigateToDispatchHistory}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-violet-500/10 hover:bg-violet-500 text-violet-400 hover:text-white transition-all text-[9px] font-black uppercase tracking-widest border border-violet-500/20"
                  title="Ir para Histórico de Disparos"
                >
                  <FiActivity size={11} /> Hist. Disparos
                </button>
              )}
              {onNavigateToFunnels && (
                <button
                  onClick={onNavigateToFunnels}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-white transition-all text-[9px] font-black uppercase tracking-widest border border-emerald-500/20"
                  title="Ir para Funis"
                >
                  <FiGitMerge size={11} /> Funis
                </button>
              )}
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
      {(() => {
        // Plataformas únicas presentes nas integrações (para o filtro)
        const platformsPresent = [...new Set(integrations.map(i => i.platform).filter(Boolean))].sort();

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
      <div className="bg-white/50 dark:bg-[#1e293b]/40 rounded-2xl border border-gray-100 dark:border-white/5 backdrop-blur-xl shadow-xl overflow-hidden">
        {/* Barra de filtro */}
        {!loading && integrations.length > 0 && (
          <div className="flex items-center gap-3 px-5 py-3 border-b border-gray-100 dark:border-white/5 bg-white/30 dark:bg-white/[0.02]">
            <FiSettings size={12} className="text-gray-400 shrink-0" />
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">Plataforma</span>
            <div className="relative" ref={platformDropdownRef}>
              <button
                type="button"
                onClick={() => {
                  setIsPlatformDropdownOpen(!isPlatformDropdownOpen);
                  setSearchPlatformText('');
                }}
                className="bg-white dark:bg-[#0b1120] border border-gray-100 dark:border-white/5 rounded-xl px-3 py-1.5 text-[10px] font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 outline-none shadow-inner flex items-center gap-2 select-none min-w-[140px] justify-between cursor-pointer hover:border-gray-300 dark:hover:border-white/10"
              >
                <span>
                  {filterPlatform 
                    ? `${filterPlatform.charAt(0).toUpperCase() + filterPlatform.slice(1)} (${integrations.filter(i => i.platform === filterPlatform).length})`
                    : `Todas (${integrations.length})`}
                </span>
                <FiChevronDown size={12} className={`text-gray-400 transition-transform ${isPlatformDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {isPlatformDropdownOpen && (
                <div className="absolute top-full left-0 mt-1.5 w-64 bg-white dark:bg-[#0f172a] border border-gray-100 dark:border-white/5 rounded-xl shadow-2xl z-50 p-2 space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-100">
                  {/* Campo de pesquisa por texto */}
                  <div className="relative flex items-center">
                    <FiSearch size={12} className="absolute left-2.5 text-gray-400 pointer-events-none" />
                    <input
                      type="text"
                      autoFocus
                      placeholder="Pesquisar plataforma..."
                      value={searchPlatformText}
                      onChange={e => setSearchPlatformText(e.target.value)}
                      className="w-full bg-gray-50 dark:bg-[#070b13] border border-gray-100 dark:border-white/5 rounded-lg pl-8 pr-3 py-1.5 text-[10px] font-bold text-gray-900 dark:text-white outline-none focus:border-blue-500/30 focus:ring-1 focus:ring-blue-500/20 transition-all shadow-inner"
                    />
                  </div>

                  {/* Opções filtradas */}
                  <div className="max-h-56 overflow-y-auto space-y-0.5 select-none pr-1">
                    {/* Opção "Todas" */}
                    {('todas'.includes(searchPlatformText.toLowerCase()) || !searchPlatformText) && (
                      <button
                        type="button"
                        onClick={() => {
                          setFilterPlatform('');
                          setListCurrentPage(1);
                          setIsPlatformDropdownOpen(false);
                        }}
                        className={`w-full text-left px-2.5 py-1.5 rounded-lg text-[10px] font-bold flex items-center justify-between ${
                          !filterPlatform
                            ? 'bg-blue-500/10 text-blue-500'
                            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/[0.02] hover:text-gray-900 dark:hover:text-white'
                        }`}
                      >
                        <span>Todas</span>
                        <span className="text-[9px] opacity-70">({integrations.length})</span>
                      </button>
                    )}

                    {/* Plataformas correspondentes */}
                    {(() => {
                      const filteredOptions = platformsPresent.filter(p => 
                        p.toLowerCase().includes(searchPlatformText.toLowerCase())
                      );

                      if (filteredOptions.length === 0 && searchPlatformText) {
                        return (
                          <div className="text-center py-4 text-[9px] text-gray-500 italic">
                            Nenhuma plataforma encontrada
                          </div>
                        );
                      }

                      return filteredOptions.map(p => {
                        const cnt = integrations.filter(i => i.platform === p).length;
                        const isSelected = filterPlatform === p;
                        return (
                          <button
                            key={p}
                            type="button"
                            onClick={() => {
                              setFilterPlatform(p);
                              setListCurrentPage(1);
                              setIsPlatformDropdownOpen(false);
                            }}
                            className={`w-full text-left px-2.5 py-1.5 rounded-lg text-[10px] font-bold flex items-center justify-between ${
                              isSelected
                                ? 'bg-blue-500/10 text-blue-500'
                                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/[0.02] hover:text-gray-900 dark:hover:text-white'
                            }`}
                          >
                            <span>{p.charAt(0).toUpperCase() + p.slice(1)}</span>
                            <span className="text-[9px] opacity-70">({cnt})</span>
                          </button>
                        );
                      });
                    })()}
                  </div>
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => { setFilterHasTriggers(!filterHasTriggers); setListCurrentPage(1); }}
              className={`px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all select-none cursor-pointer flex items-center gap-1.5 ${
                filterHasTriggers
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                  : 'bg-white dark:bg-[#0b1120] text-gray-500 dark:text-gray-400 border border-gray-100 dark:border-white/5 hover:border-gray-300 dark:hover:border-white/10'
              }`}
            >
              <span>Com Gatilhos</span>
            </button>

            <button
              type="button"
              onClick={() => { setFilterHasHistory(!filterHasHistory); setListCurrentPage(1); }}
              className={`px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all select-none cursor-pointer flex items-center gap-1.5 ${
                filterHasHistory
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                  : 'bg-white dark:bg-[#0b1120] text-gray-500 dark:text-gray-400 border border-gray-100 dark:border-white/5 hover:border-gray-300 dark:hover:border-white/10'
              }`}
            >
              <span>Com Histórico</span>
            </button>

            {(filterPlatform || filterHasTriggers || filterHasHistory) && (
              <button
                onClick={() => {
                  setFilterPlatform('');
                  setFilterHasTriggers(false);
                  setFilterHasHistory(false);
                  setListCurrentPage(1);
                }}
                className="text-[10px] text-gray-400 hover:text-white font-bold transition-all cursor-pointer ml-auto"
              >
                ✕ Limpar Filtros
              </button>
            )}
          </div>
        )}

        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-800/50">
              <th className="px-4 py-3 text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]">Nome</th>
              <th className="px-4 py-3 text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]">Plataforma</th>
              <th className="px-4 py-3 text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]">Webhook URL</th>
              <th className="px-4 py-3 text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]">Gatilhos</th>
              <th className="px-4 py-3 text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]">Histórico</th>
              <th className="px-4 py-3 text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {loading ? (
              <tr><td colSpan="6" className="px-8 py-20 text-center text-gray-500 italic">Carregando integrações...</td></tr>
            ) : filteredIntegrations.length === 0 ? (
              <tr><td colSpan="6" className="px-8 py-20 text-center text-gray-500 italic">Nenhuma integração encontrada.</td></tr>
            ) : paginatedIntegrations.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-white/[0.01] transition-all group">
                <td className="px-4 py-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500 font-bold text-xs shrink-0">{(item.name || '?').charAt(0).toUpperCase()}</div>
                    <span className="font-bold text-sm text-gray-900 dark:text-white whitespace-nowrap">{item.name}</span>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <span className="px-2 py-1 bg-gray-100 dark:bg-gray-800 text-blue-600 dark:text-blue-400 rounded-lg text-[10px] font-black uppercase tracking-widest whitespace-nowrap">{item.platform}</span>
                </td>
                <td className="px-4 py-4">
                  <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-800 px-2 py-1.5 rounded-lg border border-transparent group-hover:border-blue-500/20 transition-all w-[190px]">
                    <span className="truncate text-[10px] font-mono text-gray-500 dark:text-gray-400">
                      {`${WEBHOOK_BASE_URL}/api/webhooks/${item.custom_slug || item.id}`}
                    </span>
                    <FiCopy
                      size={11}
                      className="cursor-pointer text-gray-400 hover:text-blue-500 transition-colors shrink-0"
                      onClick={() => {
                        navigator.clipboard.writeText(`${WEBHOOK_BASE_URL}/api/webhooks/${item.custom_slug || item.id}`);
                        toast.success('URL copiada!');
                      }}
                    />
                  </div>
                </td>
                <td className="px-4 py-4">
                  <span className="text-xs font-bold text-gray-700 dark:text-gray-300 whitespace-nowrap">{(item.mappings || []).length} gatilhos</span>
                </td>
                <td className="px-4 py-4">
                  <span className={`inline-flex items-center gap-1 text-xs font-black px-2 py-1 rounded-lg whitespace-nowrap ${
                    (item.history_count || 0) > 0
                      ? 'bg-blue-500/10 text-blue-400'
                      : 'bg-white/5 text-gray-500'
                  }`}>
                    <FiActivity size={10} />
                    {(item.history_count || 0).toLocaleString('pt-BR')}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <div className="flex items-center justify-end gap-1.5 flex-nowrap">
                    <button
                      onClick={() => { setDispatchIntegration(item); setIsDispatchHistoryModalOpen(true); }}
                      className="shrink-0 text-[9px] font-black bg-indigo-500/10 text-indigo-500 px-2 py-1 rounded-md hover:bg-indigo-500 hover:text-white transition-all flex items-center gap-1 uppercase tracking-tighter whitespace-nowrap"
                    >
                      <FiPlay size={10} /> Disparos
                    </button>
                    <button
                      onClick={() => { setHistoryIntegration(item); setIsHistoryModalOpen(true); fetchHistory(item.id); }}
                      className="shrink-0 text-[9px] font-black bg-blue-500/10 text-blue-500 px-2 py-1 rounded-md hover:bg-blue-500 hover:text-white transition-all flex items-center gap-1 uppercase tracking-tighter whitespace-nowrap"
                    >
                      <FiActivity size={10} /> Histórico
                    </button>
                    <button
                      onClick={() => { setIntegrationToTest(item); setIsTestModalOpen(true); }}
                      className="shrink-0 text-[9px] font-black bg-emerald-500/10 text-emerald-500 px-2 py-1 rounded-md hover:bg-emerald-500 hover:text-white transition-all flex items-center gap-1 uppercase tracking-tighter whitespace-nowrap"
                    >
                      <FiZap size={10} fill="currentColor" /> Testar
                    </button>
                    <button onClick={() => openEditModal(item)} className="shrink-0 p-1 text-gray-400 hover:text-blue-500 transition-all active:scale-90" title="Editar"><FiEdit2 size={13} /></button>
                    <button onClick={() => { setIntegrationToDelete(item); setIsDeleteModalOpen(true); }} className="shrink-0 p-1 text-gray-400 hover:text-red-500 transition-all active:scale-90" title="Excluir"><FiTrash2 size={13} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Rodapé de Paginação */}
        {!loading && integrations.length > 0 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 dark:border-white/5">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Exibir</span>
              <select
                value={listPageSize}
                onChange={e => { setListPageSize(Number(e.target.value)); setListCurrentPage(1); }}
                className="bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 text-[11px] font-bold rounded-lg px-2 py-1 outline-none cursor-pointer"
              >
                {[5, 10, 20].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
              <span className="text-[10px] text-gray-400 font-medium">
                de {filteredIntegrations.length}{filterPlatform ? ` (${integrations.length} total)` : ''} integrações
              </span>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setListCurrentPage(p => Math.max(1, p - 1))}
                disabled={safePage === 1}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-xs font-black"
              >‹</button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button
                  key={p}
                  onClick={() => setListCurrentPage(p)}
                  className={`w-7 h-7 flex items-center justify-center rounded-lg text-[11px] font-black transition-all ${
                    p === safePage
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                      : 'text-gray-400 hover:text-white hover:bg-white/10'
                  }`}
                >{p}</button>
              ))}

              <button
                onClick={() => setListCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={safePage === totalPages}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-xs font-black"
              >›</button>
            </div>
          </div>
        )}
      </div>
        );
      })()}

      {/* Modals */}
      <IntegrationFormModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} formData={formData} setFormData={setFormData} isSaving={isSaving} onSave={handleSaveIntegration} editingIntegration={editingIntegration} templates={templates} funnels={funnels} chatwootLabels={chatwootLabels} setIsMappingGuideOpen={setIsMappingGuideOpen} existingInternalTags={existingInternalTags} />
      <HistoryModal 
        isOpen={isHistoryModalOpen} 
        onClose={() => {
          setIsHistoryModalOpen(false);
          setSelectedHistoryIds([]); // Limpa seleção ao fechar o painel
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
      />
      <DispatchHistoryModal isOpen={isDispatchHistoryModalOpen} onClose={() => setIsDispatchHistoryModalOpen(false)} integration={dispatchIntegration} dispatchHistory={dispatchHistory} loadingDispatchHistory={loadingDispatchHistory} dispatchSearch={dispatchSearch} setDispatchSearch={setDispatchSearch} dispatchEventFilter={dispatchEventFilter} setDispatchEventFilter={setDispatchEventFilter} dispatchTypeFilter={dispatchTypeFilter} setDispatchTypeFilter={setDispatchTypeFilter} dispatchStatusFilter={dispatchStatusFilter} setDispatchStatusFilter={setDispatchStatusFilter} dispatchTemplateFilter={dispatchTemplateFilter} setDispatchTemplateFilter={setDispatchTemplateFilter} distinctTemplates={distinctTemplates} dispatchStartDate={dispatchStartDate} setDispatchStartDate={setDispatchStartDate} dispatchEndDate={dispatchEndDate} setDispatchEndDate={setDispatchEndDate} dispatchPage={dispatchPage} setDispatchPage={setDispatchPage} dispatchLimit={dispatchLimit} setDispatchLimit={setDispatchLimit} dispatchTotal={dispatchTotal} selectedDispatchIds={selectedDispatchIds} setSelectedDispatchIds={setSelectedDispatchIds} handleSelectAllDispatches={(e, list) => setSelectedDispatchIds(e.target.checked ? list.map(i => i.id) : [])} handleToggleSelectDispatch={(id) => setSelectedDispatchIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])} handleBulkDispatchPlay={() => handleBulkDispatchPlay(dispatchIntegration.id)} handleBulkDispatchDelete={() => handleDeleteDispatch(dispatchIntegration.id, 'bulk', null, selectedDispatchIds)} handlePlayDispatch={(id) => handlePlayDispatch(id, dispatchIntegration.id)} handleCancelDispatch={() => {}} handleBackfillCosts={() => handleBackfillCosts(dispatchIntegration.id)} isBackfillingCosts={isBackfillingCosts} isBulkPlayingDispatches={isBulkPlayingDispatches} isPlaying={isPlaying} isCancelling={isCancelling} setSelectedDispatch={setSelectedDispatch} setIsPipelineModalOpen={setIsPipelineModalOpen} fetchDispatches={fetchDispatches} setConfirmDeleteDispatch={setConfirmDeleteDispatch} fetchChildren={fetchChildren} dispatchStats={dispatchStats} onNavigateToChat={(phone, name) => { setIsDispatchHistoryModalOpen(false); onNavigateToChat && onNavigateToChat(phone, name); }} />
      <TestWebhookModal isOpen={isTestModalOpen} onClose={() => setIsTestModalOpen(false)} integration={integrationToTest} onTest={handleRunTest} isTesting={isTesting} />
      <PipelineModal isOpen={isPipelineModalOpen} onClose={() => setIsPipelineModalOpen(false)} dispatch={selectedDispatch} />
      <ChildrenFunnelsModal 
        childrenModal={childrenModal} 
        setChildrenModal={setChildrenModal} 
        setMonitoringTrigger={(trigger) => {
          setSelectedDispatch(trigger);
          setIsPipelineModalOpen(true);
        }} 
        fetchChildren={fetchChildren}
      />
      <ContactsViewerModal isOpen={contactsModal.isOpen} onClose={() => setContactsModal(prev => ({ ...prev, isOpen: false }))} triggerId={contactsModal.triggerId} contacts={contactsModal.contacts} counts={contactsModal.counts} filter={contactsFilter} setFilter={setContactsFilter} loading={loadingContacts} title={contactsModal.title} setContactsModal={setContactsModal} />
      <MaximizedJsonModal isOpen={!!maximizedJson} data={maximizedJson} onClose={() => setMaximizedJson(null)} toast={toast} />
      <EditJsonModal isOpen={editJsonModal.isOpen} data={editJsonModal.data} onClose={() => setEditJsonModal({ isOpen: false, data: '', id: null })} onSave={(data) => handleSaveJson(editJsonModal.id, data, historyIntegration.id).then(success => success && setEditJsonModal({ isOpen: false, data: '', id: null }))} isSaving={isSavingJson} />
      <GuideModal isOpen={isGuideModalOpen} onClose={() => setIsGuideModalOpen(false)} />
      <MappingGuideModal isOpen={isMappingGuideOpen} onClose={() => setIsMappingGuideOpen(false)} />
      <ConfirmModal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} onConfirm={handleDeleteIntegration} title="Excluir Integração" message={`Tem certeza que deseja excluir "${integrationToDelete?.name}"? Esta ação não pode ser desfeita.`} />
      <ConfirmModal isOpen={confirmDeleteHistory.isOpen} onClose={() => setConfirmDeleteHistory({ ...confirmDeleteHistory, isOpen: false })} onConfirm={() => handleDeleteHistory(historyIntegration.id, confirmDeleteHistory.type, confirmDeleteHistory.id, confirmDeleteHistory.ids).then(() => setConfirmDeleteHistory({ ...confirmDeleteHistory, isOpen: false }))} title="Excluir Histórico" message="Deseja realmente excluir os registros selecionados?" />
      <ConfirmModal 
        isOpen={confirmResendHistory.isOpen} 
        onClose={() => setConfirmResendHistory({ isOpen: false, ids: [] })} 
        onConfirm={() => {
          handleBulkResendHistory(historyIntegration.id, confirmResendHistory.ids);
          setConfirmResendHistory({ isOpen: false, ids: [] });
          // Inicializa o progresso visual imediatamente para dar feedback ao usuário
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
      <ConfirmModal isOpen={confirmDeleteDispatch.isOpen} onClose={() => setConfirmDeleteDispatch({ ...confirmDeleteDispatch, isOpen: false })} onConfirm={() => handleDeleteDispatch(dispatchIntegration.id, confirmDeleteDispatch.type, confirmDeleteDispatch.id, confirmDeleteDispatch.ids).then(() => setConfirmDeleteDispatch({ ...confirmDeleteDispatch, isOpen: false }))} title="Excluir Disparo" message="Deseja realmente excluir os disparos selecionados?" />
    </div>
  );
}
