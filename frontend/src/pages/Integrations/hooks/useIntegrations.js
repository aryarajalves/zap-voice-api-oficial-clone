import { useState, useEffect, useCallback } from 'react';
import { API_URL, WS_URL } from '../../../config';
import { fetchWithAuth } from '../../../AuthContext';
import { toast } from 'react-hot-toast';
import { normalizeChatwootLabel } from '../constants';

export function useIntegrations(activeClient) {
  const [integrations, setIntegrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState([]);
  const [chatwootLabels, setChatwootLabels] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingIntegration, setEditingIntegration] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [integrationToDelete, setIntegrationToDelete] = useState(null);
  const [bulkResendProgress, setBulkResendProgress] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    platform: 'hotmart',
    mappings: [],
    product_filtering: false,
    product_whitelist: [],
    discovered_products: [],
    custom_slug: ''
  });


  const fetchIntegrations = useCallback(async (isSilent = false) => {
    if (!activeClient) return;
    if (!isSilent) setLoading(true);
    try {
      const res = await fetchWithAuth(`${API_URL}/webhook-integrations?t=${Date.now()}`, {}, activeClient.id);
      if (res.ok) {
        setIntegrations(await res.json());
      }
    } catch (err) {
      console.error(err);
      if (!isSilent) toast.error('Erro ao carregar integrações');
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, [activeClient]);

  const fetchTemplates = useCallback(async () => {
    if (!activeClient) return;
    try {
      const res = await fetchWithAuth(`${API_URL}/whatsapp/templates`, {}, activeClient.id);
      if (res.ok) {
        setTemplates(await res.json());
      }
    } catch (err) {
      console.error(err);
    }
  }, [activeClient]);

  const fetchChatwootLabels = useCallback(async () => {
    if (!activeClient) return;
    try {
      const res = await fetchWithAuth(`${API_URL}/whatsapp/labels`, {}, activeClient.id);
      if (res.ok) {
        const labels = await res.json();
        setChatwootLabels(labels || []);
      }
    } catch (err) {
      console.error("Erro ao buscar etiquetas do Chatwoot:", err);
    }
  }, [activeClient]);

  useEffect(() => {
    if (activeClient) {
      fetchIntegrations();
      fetchTemplates();
      fetchChatwootLabels();
    }
  }, [activeClient, fetchIntegrations, fetchTemplates, fetchChatwootLabels]);

  const handleSaveIntegration = async () => {
    if (!formData.name.trim()) return toast.error('Nome é obrigatório');
    setIsSaving(true);
    try {
      const url = editingIntegration 
        ? `${API_URL}/webhook-integrations/${editingIntegration.id}` 
        : `${API_URL}/webhook-integrations`;
      const method = editingIntegration ? 'PUT' : 'POST';

      const res = await fetchWithAuth(url, {
        method,
        body: JSON.stringify(formData)
      }, activeClient.id);

      if (res.ok) {
        toast.success(editingIntegration ? 'Integração atualizada!' : 'Integração criada!');
        setIsModalOpen(false);
        fetchIntegrations();
      } else {
        const err = await res.json();
        toast.error(err.detail || 'Erro ao salvar');
      }
    } catch (err) {
      console.error(err);
      toast.error('Erro de conexão');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteIntegration = async () => {
    if (!integrationToDelete) return;
    try {
      const res = await fetchWithAuth(`${API_URL}/webhook-integrations/${integrationToDelete.id}`, {
        method: 'DELETE'
      }, activeClient.id);
      if (res.ok) {
        toast.success('Integração removida');
        setIsDeleteModalOpen(false);
        fetchIntegrations();
      }
    } catch (err) {
      console.error(err);
      toast.error('Erro ao remover');
    }
  };

  const openNewModal = () => {
    setEditingIntegration(null);
    setFormData({
      name: '',
      platform: 'hotmart',
      mappings: [],
      product_filtering: false,
      product_whitelist: [],
      discovered_products: [],
      custom_slug: ''
    });

    setIsModalOpen(true);
  };

  const openEditModal = (integration) => {
    setEditingIntegration(integration);
    setFormData({
      id: integration.id,
      name: integration.name,
      platform: integration.platform,
      mappings: (integration.mappings || []).map(m => ({
        ...m,
        id: m.id || Date.now() + Math.random(),
        chatwoot_label: normalizeChatwootLabel(m.chatwoot_label || m.chatwoot_labels)
      })),
      product_filtering: integration.product_filtering || false,
      product_whitelist: integration.product_whitelist || [],
      discovered_products: integration.discovered_products || [],
      custom_slug: integration.custom_slug || ''
    });

    setIsModalOpen(true);
  };

  return {
    integrations,
    loading,
    templates,
    chatwootLabels,
    isModalOpen,
    setIsModalOpen,
    isSaving,
    editingIntegration,
    formData,
    setFormData,
    isDeleteModalOpen,
    setIsDeleteModalOpen,
    integrationToDelete,
    setIntegrationToDelete,
    bulkResendProgress,
    setBulkResendProgress,
    fetchIntegrations,
    handleSaveIntegration,
    handleDeleteIntegration,
    openNewModal,
    openEditModal
  };
}
