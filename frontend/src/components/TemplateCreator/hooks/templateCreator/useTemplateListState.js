import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { API_URL } from '../../../../config';
import { fetchWithAuth } from '../../../../AuthContext';
import { updateTemplateTagsHelper, deleteTemplateTagGlobalHelper } from '../../utils/templateCreatorUtils';

export function useTemplateListState({ activeClient, refreshKey, editingId, resetForm }) {
  const [templates, setTemplates] = useState([]);
  const [fetchingTemplates, setFetchingTemplates] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [templateSearch, setTemplateSearch] = useState('');
  const [templateCategoryFilter, setTemplateCategoryFilter] = useState('ALL');
  const [templateStatusFilter, setTemplateStatusFilter] = useState('ALL');
  const [openFilterDropdown, setOpenFilterDropdown] = useState(null);

  const fetchTemplates = useCallback(async () => {
    if (!activeClient) return;
    setFetchingTemplates(true);
    try {
      const res = await fetchWithAuth(
        `${API_URL}/whatsapp/templates?include_archived=true`,
        {},
        activeClient.id
      );
      if (res.ok) {
        const data = await res.json();
        setTemplates(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Error fetching templates:', err);
    } finally {
      setFetchingTemplates(false);
    }
  }, [activeClient]);

  useEffect(() => {
    setTemplateToDelete(null);
    setIsDeleteModalOpen(false);
    fetchTemplates();
  }, [activeClient, refreshKey, fetchTemplates]);

  const handleDeleteTemplate = async () => {
    if (!templateToDelete) return;

    const loadingToast = toast.loading('Excluindo template...');
    try {
      const res = await fetchWithAuth(
        `${API_URL}/whatsapp/templates/${templateToDelete}`,
        { method: 'DELETE' },
        activeClient?.id
      );

      if (res.ok) {
        toast.dismiss(loadingToast);
        toast.success('Template excluído com sucesso!');
        fetchTemplates();
        if (
          editingId &&
          resetForm &&
          templates.find((t) => t.id === editingId)?.name === templateToDelete
        ) {
          resetForm();
        }
      } else {
        const err = await res.json();
        toast.dismiss(loadingToast);
        toast.error(err.detail || 'Erro ao excluir template');
      }
    } catch (error) {
      console.error(error);
      toast.dismiss(loadingToast);
      toast.error('Erro de conexão ao excluir');
    } finally {
      setTemplateToDelete(null);
      setIsDeleteModalOpen(false);
    }
  };

  const updateTemplateTags = async (templateId, tagsList) => {
    if (!activeClient) return false;
    return await updateTemplateTagsHelper(templateId, tagsList, activeClient.id, setTemplates);
  };

  const deleteTemplateTagGlobal = async (tag) => {
    if (!activeClient) return false;
    return await deleteTemplateTagGlobalHelper(tag, activeClient.id, fetchTemplates);
  };

  const archiveTemplate = async (templateName) => {
    const loadingToast = toast.loading('Arquivando template...');
    try {
      const res = await fetchWithAuth(
        `${API_URL}/whatsapp/templates/${templateName}/archive`,
        { method: 'POST' },
        activeClient?.id
      );
      if (res.ok) {
        toast.dismiss(loadingToast);
        toast.success('Template arquivado com sucesso!');
        fetchTemplates();
      } else {
        const err = await res.json();
        toast.dismiss(loadingToast);
        toast.error(err.detail || 'Erro ao arquivar template');
      }
    } catch (error) {
      console.error(error);
      toast.dismiss(loadingToast);
      toast.error('Erro de conexão ao arquivar');
    }
  };

  const unarchiveTemplate = async (templateName) => {
    const loadingToast = toast.loading('Desarquivando template...');
    try {
      const res = await fetchWithAuth(
        `${API_URL}/whatsapp/templates/${templateName}/unarchive`,
        { method: 'POST' },
        activeClient?.id
      );
      if (res.ok) {
        toast.dismiss(loadingToast);
        toast.success('Template desarquivado com sucesso!');
        fetchTemplates();
      } else {
        const err = await res.json();
        toast.dismiss(loadingToast);
        toast.error(err.detail || 'Erro ao desarquivar template');
      }
    } catch (error) {
      console.error(error);
      toast.dismiss(loadingToast);
      toast.error('Erro de conexão ao desarquivar');
    }
  };

  const handlePinTemplate = async (templateId, pinStatus) => {
    if (!activeClient) return false;
    const loadingToast = toast.loading(
      pinStatus ? 'Fixando template no topo...' : 'Desafixando template...'
    );
    try {
      const res = await fetchWithAuth(
        `${API_URL}/whatsapp/templates/${templateId}/pin`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ is_pinned: pinStatus })
        },
        activeClient.id
      );

      if (res.ok) {
        toast.dismiss(loadingToast);
        toast.success(
          pinStatus ? 'Template fixado no topo!' : 'Template desafixado do topo!'
        );
        fetchTemplates();
        return true;
      } else {
        const err = await res.json();
        toast.dismiss(loadingToast);
        toast.error(err.detail || 'Erro ao fixar/desafixar template.');
        return false;
      }
    } catch (error) {
      console.error('Error pinning template:', error);
      toast.dismiss(loadingToast);
      toast.error('Erro de conexão ao fixar template.');
      return false;
    }
  };

  return {
    templates,
    setTemplates,
    fetchingTemplates,
    templateToDelete,
    setTemplateToDelete,
    isDeleteModalOpen,
    setIsDeleteModalOpen,
    templateSearch,
    setTemplateSearch,
    templateCategoryFilter,
    setTemplateCategoryFilter,
    templateStatusFilter,
    setTemplateStatusFilter,
    openFilterDropdown,
    setOpenFilterDropdown,
    fetchTemplates,
    handleDeleteTemplate,
    updateTemplateTags,
    deleteTemplateTagGlobal,
    archiveTemplate,
    unarchiveTemplate,
    handlePinTemplate
  };
}

export default useTemplateListState;
