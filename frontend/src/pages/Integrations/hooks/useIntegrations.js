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
  const [funnels, setFunnels] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingIntegration, setEditingIntegration] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [integrationToDelete, setIntegrationToDelete] = useState(null);
  const [bulkResendProgress, setBulkResendProgress] = useState(null);

  const [leadTags, setLeadTags] = useState([]);
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
      const res = await fetchWithAuth(`${API_URL}/whatsapp/templates?include_paused=false`, {}, activeClient.id);
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

  const fetchFunnels = useCallback(async () => {
    if (!activeClient) return;
    try {
      const res = await fetchWithAuth(`${API_URL}/funnels`, {}, activeClient.id);
      if (res.ok) {
        setFunnels(await res.json());
      }
    } catch (err) {
      console.error("Erro ao buscar funis:", err);
    }
  }, [activeClient]);

  const fetchLeadTags = useCallback(async () => {
    if (!activeClient) return;
    try {
      const res = await fetchWithAuth(`${API_URL}/leads/filters`, {}, activeClient.id);
      if (res.ok) {
        const data = await res.json();
        setLeadTags(data.tags || []);
      }
    } catch (err) {
      console.error("Erro ao buscar tags de leads:", err);
    }
  }, [activeClient]);

  useEffect(() => {
    if (activeClient) {
      fetchIntegrations();
      fetchTemplates();
      fetchChatwootLabels();
      fetchFunnels();
      fetchLeadTags();
    }
  }, [activeClient, fetchIntegrations, fetchTemplates, fetchChatwootLabels, fetchFunnels, fetchLeadTags]);

  const handleSaveIntegration = async () => {
    if (!formData.name.trim()) return toast.error('Nome é obrigatório');

    // Validar se follow-up está ativo mas o tempo de espera é menor que 1 ou nulo/NaN
    const hasInvalidFollowup = (formData.mappings || []).some(mapping => {
      const active = mapping.followup_active === true || 
                     String(mapping.followup_active).toLowerCase() === 'true' ||
                     mapping.followup_active === 1 || 
                     String(mapping.followup_active) === '1';
      if (!active) return false;
      const val = Number(mapping.followup_delay_value);
      return isNaN(val) || val < 1;
    });
    if (hasInvalidFollowup) {
      return toast.error('O tempo de espera do Follow-up deve ser no mínimo 1.');
    }

    // Validar se follow-up está ativo mas o template não foi selecionado
    const hasMissingFollowupTemplate = (formData.mappings || []).some(mapping => {
      const active = mapping.followup_active === true || 
                     String(mapping.followup_active).toLowerCase() === 'true' ||
                     mapping.followup_active === 1 || 
                     String(mapping.followup_active) === '1';
      if (!active) return false;
      return !mapping.followup_template_name || !mapping.followup_template_name.trim();
    });
    if (hasMissingFollowupTemplate) {
      return toast.error('Você deve selecionar um Template para o Follow-up.');
    }

    setIsSaving(true);

    const savePromise = new Promise(async (resolve, reject) => {
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
          setIsModalOpen(false);
          fetchIntegrations();
          resolve(editingIntegration ? 'Integração atualizada!' : 'Integração criada!');
        } else {
          const err = await res.json().catch(() => ({}));
          let errMsg = 'Erro ao salvar';
          if (err.detail) {
            if (Array.isArray(err.detail)) {
              errMsg = err.detail.map(d => `${d.loc ? d.loc.join('.') : 'campo'}: ${d.msg}`).join(', ');
            } else if (typeof err.detail === 'object') {
              errMsg = JSON.stringify(err.detail);
            } else {
              errMsg = err.detail;
            }
          }
          reject(errMsg);
        }
      } catch (err) {
        console.error(err);
        reject('Erro de conexão');
      } finally {
        setIsSaving(false);
      }
    });

    toast.promise(savePromise, {
      loading: 'Salvando alterações...',
      success: (msg) => msg,
      error: (err) => err,
    }, {
      style: {
        minWidth: '250px',
      },
      success: {
        duration: 4000,
        icon: '✅',
      },
      error: {
        duration: 4000,
        icon: '❌',
      }
    });
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
        chatwoot_label: normalizeChatwootLabel(m.chatwoot_label || m.chatwoot_labels),
        variables_mapping: Array.isArray(m.variables_mapping) ? m.variables_mapping : [],
        followup_variables_mapping: Array.isArray(m.followup_variables_mapping) ? m.followup_variables_mapping : [],
        private_note: "true",
        publish_external_event: true
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
    funnels,
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
    openEditModal,
    leadTags
  };
}
