import { toast } from 'react-hot-toast';
import { fetchWithAuth } from '../../../../AuthContext';
import { API_URL } from '../../../../config';

export function useChatTagsOperations({ selectedConvo, setSelectedConvo, activeClient, engine }) {
    const handleAddTagWithName = async (tagName, customColor = null) => {
        if (!tagName || !tagName.trim() || !selectedConvo) return;
        const cleanTag = tagName.trim().slice(0, 25);
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

        const seen = new Set();
        const updatedTags = [];
        [...currentTags, cleanTag].forEach(t => {
            if (!t) return;
            const clean = String(t).trim();
            if (!clean) return;
            const key = clean.toLowerCase();
            if (!seen.has(key)) {
                seen.add(key);
                updatedTags.push(clean);
            }
        });

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
        const removeLower = String(tagToRemove).trim().toLowerCase();
        const updatedTags = (selectedConvo.labels || []).filter(t => String(t).trim().toLowerCase() !== removeLower);
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
