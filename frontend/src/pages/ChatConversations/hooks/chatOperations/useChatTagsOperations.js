import { toast } from 'react-hot-toast';
import { fetchWithAuth } from '../../../../AuthContext';
import { API_URL } from '../../../../config';

export function useChatTagsOperations({ selectedConvo, setSelectedConvo, activeClient, engine }) {
    const handleAddTagWithName = async (tagName, customColor = null) => {
        if (!tagName || !tagName.trim() || !selectedConvo) return;
        const cleanTag = tagName.trim().slice(0, 20);
        const currentTags = selectedConvo.labels || [];

        if (currentTags.map(t => t.toLowerCase()).includes(cleanTag.toLowerCase())) {
            toast.error('Esta etiqueta já foi adicionada.');
            return;
        }

        if (customColor) {
            try {
                await fetchWithAuth(`${API_URL}/chat/labels`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: cleanTag, color: customColor })
                }, activeClient.id);
            } catch (err) {
                console.error('Erro ao registrar nova etiqueta:', err);
            }
        }

        const updatedTags = [...currentTags, cleanTag];
        try {
            const res = await fetchWithAuth(`${API_URL}/chat/conversations/${selectedConvo.id}/labels`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ labels: updatedTags })
            }, activeClient.id);

            if (res.ok) {
                setSelectedConvo(prev => ({ ...prev, labels: updatedTags }));
                engine.setTagSearchQuery('');
                engine.loadConversations();
                engine.loadAvailableLabels();
                toast.success('Etiqueta adicionada!');
            }
        } catch (err) {
            toast.error('Erro ao adicionar etiqueta.');
        }
    };

    const handleRemoveTag = async (tagToRemove) => {
        if (!selectedConvo) return;
        const updatedTags = (selectedConvo.labels || []).filter(t => t !== tagToRemove);
        try {
            const res = await fetchWithAuth(`${API_URL}/chat/conversations/${selectedConvo.id}/labels`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ labels: updatedTags })
            }, activeClient.id);

            if (res.ok) {
                setSelectedConvo(prev => ({ ...prev, labels: updatedTags }));
                engine.loadConversations();
                engine.loadAvailableLabels();
                toast.success('Etiqueta removida.');
            }
        } catch (err) {
            toast.error('Erro ao remover etiqueta.');
        }
    };

    return {
        handleAddTagWithName,
        handleRemoveTag
    };
}
