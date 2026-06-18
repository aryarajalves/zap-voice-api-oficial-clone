import { fetchWithAuth } from '../../../AuthContext';
import { API_URL } from '../../../config';
import { toast } from 'react-hot-toast';

export const handleMediaUploadHelper = async (file, currentType, activeClientId, setMediaCache, setFormData, setMediaUploading) => {
    if (!file || !['IMAGE', 'VIDEO', 'DOCUMENT'].includes(currentType)) return;

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
            activeClientId
        );
        if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.detail || "Erro ao fazer upload da mídia");
        }

        const result = await res.json();

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

export const updateTemplateTagsHelper = async (templateId, tagsList, activeClientId, setTemplates) => {
    try {
        const res = await fetchWithAuth(
            `${API_URL}/whatsapp/templates/${templateId}/tags`,
            {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tags: tagsList })
            },
            activeClientId
        );

        if (res.ok) {
            setTemplates(prev => prev.map(t => {
                if (String(t.id) === String(templateId)) {
                    return { ...t, tags: tagsList };
                }
                return t;
            }));
            toast.success("Etiquetas salvas com sucesso!");
            return true;
        } else {
            const err = await res.json();
            toast.error(err.detail || "Erro ao salvar etiquetas.");
            return false;
        }
    } catch (error) {
        console.error("Error updating template tags:", error);
        toast.error("Erro de conexão ao salvar etiquetas.");
        return false;
    }
};

export const deleteTemplateTagGlobalHelper = async (tag, activeClientId, fetchTemplates) => {
    try {
        const res = await fetchWithAuth(
            `${API_URL}/whatsapp/templates/tags/${encodeURIComponent(tag)}`,
            {
                method: 'DELETE'
            },
            activeClientId
        );

        if (res.ok) {
            toast.success("Etiqueta excluída de todos os templates!");
            fetchTemplates();
            return true;
        } else {
            const err = await res.json();
            toast.error(err.detail || "Erro ao excluir etiqueta.");
            return false;
        }
    } catch (error) {
        console.error("Error deleting template tag globally:", error);
        toast.error("Erro de conexão ao excluir etiqueta.");
        return false;
    }
};
