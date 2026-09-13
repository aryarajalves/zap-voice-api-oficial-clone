import { useState } from 'react';
import { API_URL } from '../../../config';
import { fetchWithAuth } from '../../../AuthContext';
import { toast } from 'react-hot-toast';

/**
 * Hook para gerenciar os estados de modais, diálogos de confirmação
 * e ações secundárias (teste de webhook, abertura de histórico, reenvio)
 * da página de integrações.
 */
export function useIntegrationsPageModals({
  activeClient,
  fetchHistory,
  setHistoryCurrentPage,
  setWebhookHistoryStatusFilter,
  setWebhookHistoryMappingFilter,
  setWebhookHistorySearch,
  handleResendWebhook,
  fetchDispatches,
  dispatchLimit
}) {
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

  const handleOpenHistory = (item) => {
    if (setHistoryCurrentPage) setHistoryCurrentPage(1);
    if (setWebhookHistoryStatusFilter) setWebhookHistoryStatusFilter('');
    if (setWebhookHistoryMappingFilter) setWebhookHistoryMappingFilter('');
    if (setWebhookHistorySearch) setWebhookHistorySearch('');
    setHistoryIntegration(item);
    setIsHistoryModalOpen(true);
    if (fetchHistory && item?.id) {
      fetchHistory(item.id, '', '');
    }
  };

  const wrappedResend = async (id) => {
    if (!handleResendWebhook) return;
    const success = await handleResendWebhook(id);
    if (success && historyIntegration?.id) {
      if (dispatchIntegration?.id === historyIntegration.id && fetchDispatches) {
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

  return {
    isGuideModalOpen,
    setIsGuideModalOpen,
    isMappingGuideOpen,
    setIsMappingGuideOpen,
    maximizedJson,
    setMaximizedJson,
    editJsonModal,
    setEditJsonModal,
    isPipelineModalOpen,
    setIsPipelineModalOpen,
    selectedDispatch,
    setSelectedDispatch,
    isHistoryModalOpen,
    setIsHistoryModalOpen,
    historyIntegration,
    setHistoryIntegration,
    isDispatchHistoryModalOpen,
    setIsDispatchHistoryModalOpen,
    dispatchIntegration,
    setDispatchIntegration,
    isTestModalOpen,
    setIsTestModalOpen,
    integrationToTest,
    setIntegrationToTest,
    isTesting,
    confirmDeleteHistory,
    setConfirmDeleteHistory,
    confirmResendHistory,
    setConfirmResendHistory,
    confirmDeleteDispatch,
    setConfirmDeleteDispatch,
    handleOpenHistory,
    wrappedResend,
    handleRunTest
  };
}
