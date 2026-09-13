import { useState, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { API_URL } from '../../../../config';
import { fetchWithAuth } from '../../../../AuthContext';
import { handleMediaUploadHelper } from '../../utils/templateCreatorUtils';

export function useTemplateFormData({ activeClient, fetchTemplates, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [buttonIndexToRemove, setButtonIndexToRemove] = useState(null);
  const [isRemoveButtonModalOpen, setIsRemoveButtonModalOpen] = useState(false);
  const [mediaUploading, setMediaUploading] = useState(false);
  const [mediaCache, setMediaCache] = useState({
    IMAGE: { url: '', fileName: '', previewUrl: null },
    VIDEO: { url: '', fileName: '', previewUrl: null },
    DOCUMENT: { url: '', fileName: '', previewUrl: null }
  });
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    name: '',
    category: 'MARKETING',
    language: 'pt_BR',
    header_type: 'NONE',
    header_text: '',
    header_media_url: '',
    body_text: '',
    footer_text: '',
    buttons: []
  });

  const handleAddButton = () => {
    if (formData.buttons.length >= 10) {
      toast.error('Máximo de 10 botões permitidos.');
      return;
    }
    setFormData((prev) => ({
      ...prev,
      buttons: [...prev.buttons, { type: 'QUICK_REPLY', text: '' }]
    }));
  };

  const removeButton = (index) => {
    setButtonIndexToRemove(index);
    setIsRemoveButtonModalOpen(true);
  };

  const confirmRemoveButton = () => {
    if (buttonIndexToRemove === null) return;
    setFormData((prev) => ({
      ...prev,
      buttons: prev.buttons.filter((_, i) => i !== buttonIndexToRemove)
    }));
    setIsRemoveButtonModalOpen(false);
    setButtonIndexToRemove(null);
  };

  const updateButton = (index, field, value) => {
    const newButtons = [...formData.buttons];
    newButtons[index][field] = value;
    setFormData((prev) => ({ ...prev, buttons: newButtons }));
  };

  const handleEdit = (tpl) => {
    setEditingId(tpl.id);
    const bodyComp = tpl.components?.find((c) => c.type === 'BODY');
    const headerComp = tpl.components?.find((c) => c.type === 'HEADER');
    const footerComp = tpl.components?.find((c) => c.type === 'FOOTER');
    const buttonsComp = tpl.components?.find((c) => c.type === 'BUTTONS');

    const format = headerComp ? headerComp.format : 'NONE';
    const url =
      headerComp && ['IMAGE', 'VIDEO', 'DOCUMENT'].includes(headerComp.format)
        ? headerComp.example?.header_handle?.[0] || ''
        : '';

    setFormData({
      name: tpl.name,
      category: tpl.category || 'MARKETING',
      language: tpl.language || 'pt_BR',
      header_type: format,
      header_text: headerComp && headerComp.format === 'TEXT' ? headerComp.text : '',
      header_media_url: url,
      body_text: bodyComp ? bodyComp.text : '',
      footer_text: footerComp ? footerComp.text : '',
      buttons: buttonsComp ? buttonsComp.buttons || [] : []
    });

    if (['IMAGE', 'VIDEO', 'DOCUMENT'].includes(format)) {
      setMediaCache((prev) => ({
        ...prev,
        [format]: { url: url, fileName: 'Arquivo do Template', previewUrl: null }
      }));
    }

    const formEl = document.getElementById('templateForm');
    if (formEl) {
      formEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      name: '',
      category: 'MARKETING',
      language: 'pt_BR',
      header_type: 'NONE',
      header_text: '',
      header_media_url: '',
      body_text: '',
      footer_text: '',
      buttons: []
    });
    Object.values(mediaCache).forEach(
      (c) => c.previewUrl && URL.revokeObjectURL(c.previewUrl)
    );
    setMediaCache({
      IMAGE: { url: '', fileName: '', previewUrl: null },
      VIDEO: { url: '', fileName: '', previewUrl: null },
      DOCUMENT: { url: '', fileName: '', previewUrl: null }
    });
  };

  const handleMediaUpload = async (file) => {
    await handleMediaUploadHelper(
      file,
      formData.header_type,
      activeClient?.id,
      setMediaCache,
      setFormData,
      setMediaUploading
    );
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();

    console.log('🚀 [TEMPLATE_CREATOR] Submetendo formulário:', formData);

    if (!formData.name) {
      toast.error('O Nome do Template é obrigatório.');
      return;
    }
    if (!formData.body_text) {
      toast.error('O Corpo da Mensagem é obrigatório.');
      return;
    }

    if (!/^[a-z0-9_]+$/.test(formData.name)) {
      toast.error('Nome deve conter apenas letras minúsculas, números e sublinhados (_).');
      return;
    }

    setLoading(true);
    const actionText = editingId ? 'Atualizando' : 'Enviando';
    const loadingToast = toast.loading(`${actionText} template na Meta...`);

    try {
      const url = editingId
        ? `${API_URL}/whatsapp/templates/${editingId}`
        : `${API_URL}/whatsapp/templates`;

      const method = editingId ? 'PUT' : 'POST';

      const res = await fetchWithAuth(
        url,
        {
          method: method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        },
        activeClient?.id
      );

      if (res.ok) {
        toast.dismiss(loadingToast);
        toast.success(
          editingId
            ? 'Template atualizado com sucesso!'
            : 'Template enviado com sucesso!'
        );
        if (fetchTemplates) fetchTemplates();
        if (!editingId && onSuccess) onSuccess();
        resetForm();
      } else {
        const err = await res.json();
        console.error('❌ [TEMPLATE_CREATOR] Erro no servidor:', err);
        toast.dismiss(loadingToast);
        toast.error(err.detail || 'Erro ao processar template na Meta');
      }
    } catch (error) {
      console.error(error);
      toast.dismiss(loadingToast);
      toast.error('Erro de conexão');
    } finally {
      setLoading(false);
    }
  };

  const fixBodyTextForMeta = () => {
    let fixed = formData.body_text.trim();
    if (/^\{\{\d+\}\}/.test(fixed)) {
      fixed = 'Olá ' + fixed;
    }
    fixed = fixed.replace(/(\{\{\d+\}\})[\s\W]*$/, '$1, tudo bem?');
    setFormData({ ...formData, body_text: fixed });
    toast.success('Texto corrigido para o formato da Meta!');
  };

  return {
    loading,
    setLoading,
    editingId,
    setEditingId,
    buttonIndexToRemove,
    isRemoveButtonModalOpen,
    setIsRemoveButtonModalOpen,
    mediaUploading,
    mediaCache,
    setMediaCache,
    fileInputRef,
    formData,
    setFormData,
    handleAddButton,
    removeButton,
    confirmRemoveButton,
    updateButton,
    handleEdit,
    resetForm,
    handleMediaUpload,
    handleSubmit,
    fixBodyTextForMeta
  };
}

export default useTemplateFormData;
