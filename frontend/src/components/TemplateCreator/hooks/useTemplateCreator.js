import { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { API_URL } from '../../../config';
import { fetchWithAuth } from '../../../AuthContext';
import { useClient } from '../../../contexts/ClientContext';

export const useTemplateCreator = (onSuccess, refreshKey) => {
    const { activeClient } = useClient();
    const [loading, setLoading] = useState(false);
    const [templates, setTemplates] = useState([]);
    const [fetchingTemplates, setFetchingTemplates] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [templateToDelete, setTemplateToDelete] = useState(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [buttonIndexToRemove, setButtonIndexToRemove] = useState(null);
    const [isRemoveButtonModalOpen, setIsRemoveButtonModalOpen] = useState(false);
    const [isBodyExpanded, setIsBodyExpanded] = useState(false);
    const [isGuideOpen, setIsGuideOpen] = useState(false);
    const [templateSearch, setTemplateSearch] = useState('');
    const [templateCategoryFilter, setTemplateCategoryFilter] = useState('ALL');
    const [templateStatusFilter, setTemplateStatusFilter] = useState('ALL');
    const [openFilterDropdown, setOpenFilterDropdown] = useState(null);
    const [mediaUploading, setMediaUploading] = useState(false);
    const [mediaCache, setMediaCache] = useState({
        IMAGE: { url: '', fileName: '', previewUrl: null },
        VIDEO: { url: '', fileName: '', previewUrl: null },
        DOCUMENT: { url: '', fileName: '', previewUrl: null }
    });
    const fileInputRef = useRef(null);

    // Form State
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

    const fetchTemplates = useCallback(async () => {
        if (!activeClient) return;
        setFetchingTemplates(true);
        try {
            const res = await fetchWithAuth(`${API_URL}/whatsapp/templates`, {}, activeClient.id);
            if (res.ok) {
                const data = await res.json();
                setTemplates(Array.isArray(data) ? data : []);
            }
        } catch (err) {
            console.error("Error fetching templates:", err);
        } finally {
            setFetchingTemplates(false);
        }
    }, [activeClient]);

    useEffect(() => {
        fetchTemplates();
    }, [activeClient, refreshKey, fetchTemplates]);

    const handleAddButton = () => {
        if (formData.buttons.length >= 10) {
            toast.error("Máximo de 10 botões permitidos.");
            return;
        }
        setFormData(prev => ({
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
        setFormData(prev => ({
            ...prev,
            buttons: prev.buttons.filter((_, i) => i !== buttonIndexToRemove)
        }));
        setIsRemoveButtonModalOpen(false);
        setButtonIndexToRemove(null);
    };

    const updateButton = (index, field, value) => {
        const newButtons = [...formData.buttons];
        newButtons[index][field] = value;
        setFormData(prev => ({ ...prev, buttons: newButtons }));
    };

    const handleEdit = (tpl) => {
        setEditingId(tpl.id);
        const bodyComp = tpl.components?.find(c => c.type === 'BODY');
        const headerComp = tpl.components?.find(c => c.type === 'HEADER');
        const footerComp = tpl.components?.find(c => c.type === 'FOOTER');
        const buttonsComp = tpl.components?.find(c => c.type === 'BUTTONS');


        const format = headerComp ? headerComp.format : 'NONE';
        const url = headerComp && ['IMAGE', 'VIDEO', 'DOCUMENT'].includes(headerComp.format) ? (headerComp.example?.header_handle?.[0] || '') : '';

        setFormData({
            name: tpl.name,
            category: tpl.category || 'MARKETING',
            language: tpl.language || 'pt_BR',
            header_type: format,
            header_text: headerComp && headerComp.format === 'TEXT' ? headerComp.text : '',
            header_media_url: url,
            body_text: bodyComp ? bodyComp.text : '',
            footer_text: footerComp ? footerComp.text : '',
            buttons: buttonsComp ? (buttonsComp.buttons || []) : []
        });

        if (['IMAGE', 'VIDEO', 'DOCUMENT'].includes(format)) {
            setMediaCache(prev => ({
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
        Object.values(mediaCache).forEach(c => c.previewUrl && URL.revokeObjectURL(c.previewUrl));
        setMediaCache({
            IMAGE: { url: '', fileName: '', previewUrl: null },
            VIDEO: { url: '', fileName: '', previewUrl: null },
            DOCUMENT: { url: '', fileName: '', previewUrl: null }
        });
    };

    const handleDeleteTemplate = async () => {
        if (!templateToDelete) return;

        const loadingToast = toast.loading("Excluindo template...");
        try {
            const res = await fetchWithAuth(`${API_URL}/whatsapp/templates/${templateToDelete}`, {
                method: 'DELETE'
            }, activeClient?.id);

            if (res.ok) {
                toast.dismiss(loadingToast);
                toast.success("Template excluído com sucesso!");
                fetchTemplates();
                if (editingId && templates.find(t => t.id === editingId)?.name === templateToDelete) {
                    resetForm();
                }
            } else {
                const err = await res.json();
                toast.dismiss(loadingToast);
                toast.error(err.detail || "Erro ao excluir template");
            }
        } catch (error) {
            console.error(error);
            toast.dismiss(loadingToast);
            toast.error("Erro de conexão ao excluir");
        } finally {
            setTemplateToDelete(null);
            setIsDeleteModalOpen(false);
        }
    };

    const handleMediaUpload = async (file) => {
        if (!file) return;
        const currentType = formData.header_type;
        if (!['IMAGE', 'VIDEO', 'DOCUMENT'].includes(currentType)) return;

        setMediaUploading(true);
        let previewUrl = null;
        if (file.type.startsWith('image/')) {
            previewUrl = URL.createObjectURL(file);
        }

        setMediaCache(prev => ({
            ...prev,
            [currentType]: { ...prev[currentType], fileName: file.name, previewUrl }
        }));

        try {
            const formPayload = new FormData();
            formPayload.append('file', file);
            const res = await fetchWithAuth(
                `${API_URL}/whatsapp/upload-template-media`,
                { method: 'POST', body: formPayload },
                activeClient?.id
            );
            if (!res.ok) {
                const errorData = await res.json();
                console.error("❌ [TEMPLATE_CREATOR] Erro no upload:", errorData);
                throw new Error(errorData.detail || "Erro ao fazer upload da mídia");
            }

            const result = await res.json();
            console.log("✅ [TEMPLATE_CREATOR] Upload Sucesso:", result);

            setMediaCache(prev => ({
                ...prev,
                [currentType]: { ...prev[currentType], url: result.handle }
            }));
            setFormData(prev => ({ ...prev, header_media_url: result.handle }));
            
            toast.success('Mídia enviada para a Meta com sucesso!');
        } catch (err) {
            toast.error(err.message || 'Erro ao fazer upload da mídia');
            setMediaCache(prev => ({
                ...prev,
                [currentType]: { url: '', fileName: '', previewUrl: null }
            }));
        } finally {
            setMediaUploading(false);
        }
    };

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();

        // Diagnóstico de Payload
        console.log("🚀 [TEMPLATE_CREATOR] Submetendo formulário:", formData);

        if (!formData.name) {
            toast.error("O Nome do Template é obrigatório.");
            return;
        }
        if (!formData.body_text) {
            toast.error("O Corpo da Mensagem é obrigatório.");
            return;
        }

        if (!/^[a-z0-9_]+$/.test(formData.name)) {
            toast.error("Nome deve conter apenas letras minúsculas, números e sublinhados (_).");
            return;
        }

        setLoading(true);
        const actionText = editingId ? "Atualizando" : "Enviando";
        const loadingToast = toast.loading(`${actionText} template na Meta...`);

        try {
            const url = editingId
                ? `${API_URL}/whatsapp/templates/${editingId}`
                : `${API_URL}/whatsapp/templates`;

            const method = editingId ? 'PUT' : 'POST';

            const res = await fetchWithAuth(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            }, activeClient?.id);

            if (res.ok) {
                toast.dismiss(loadingToast);
                toast.success(editingId ? "Template atualizado com sucesso!" : "Template enviado com sucesso!");
                fetchTemplates();
                if (!editingId && onSuccess) onSuccess();
                resetForm();
            } else {
                const err = await res.json();
                console.error("❌ [TEMPLATE_CREATOR] Erro no servidor:", err);
                toast.dismiss(loadingToast);
                toast.error(err.detail || "Erro ao processar template na Meta");
            }
        } catch (error) {
            console.error(error);
            toast.dismiss(loadingToast);
            toast.error("Erro de conexão");
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
        activeClient,
        loading,
        templates,
        fetchingTemplates,
        editingId,
        templateToDelete,
        setTemplateToDelete,
        isDeleteModalOpen,
        setIsDeleteModalOpen,
        isRemoveButtonModalOpen,
        setIsRemoveButtonModalOpen,
        buttonIndexToRemove,
        isBodyExpanded,
        setIsBodyExpanded,
        isGuideOpen,
        setIsGuideOpen,
        templateSearch,
        setTemplateSearch,
        templateCategoryFilter,
        setTemplateCategoryFilter,
        templateStatusFilter,
        setTemplateStatusFilter,
        openFilterDropdown,
        setOpenFilterDropdown,
        mediaUploading,
        mediaCache,
        setMediaCache,
        fileInputRef,
        formData,
        setFormData,
        fetchTemplates,
        handleAddButton,
        removeButton,
        confirmRemoveButton,
        updateButton,
        handleEdit,
        resetForm,
        handleDeleteTemplate,
        handleMediaUpload,
        handleSubmit,
        fixBodyTextForMeta
    };
};
