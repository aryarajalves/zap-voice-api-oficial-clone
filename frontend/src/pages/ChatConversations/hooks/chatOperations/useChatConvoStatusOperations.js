import { toast } from 'react-hot-toast';
import { fetchWithAuth } from '../../../../AuthContext';
import { API_URL } from '../../../../config';

export function useChatConvoStatusOperations({ selectedConvo, setSelectedConvo, activeClient, engine }) {
    const handleTogglePin = async () => {
        if (!selectedConvo) return;
        const newPinned = !selectedConvo.pinned;
        try {
            const res = await fetchWithAuth(`${API_URL}/chat/conversations/${selectedConvo.id}/pin`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pinned: newPinned })
            }, activeClient.id);

            if (res.ok) {
                setSelectedConvo(prev => ({ ...prev, pinned: newPinned }));
                engine.setConversations(prev => prev.map(c => c.id === selectedConvo.id ? { ...c, pinned: newPinned } : c));
                toast.success(newPinned ? 'Conversa fixada!' : 'Conversa desafixada.');
                engine.loadConversations();
            }
        } catch (err) {
            toast.error('Erro ao fixar conversa.');
        }
    };

    const handleToggleUrgent = async () => {
        if (!selectedConvo) return;
        const newUrgent = !selectedConvo.urgent;
        try {
            const res = await fetchWithAuth(`${API_URL}/chat/conversations/${selectedConvo.id}/urgent`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ urgent: newUrgent })
            }, activeClient.id);

            if (res.ok) {
                setSelectedConvo(prev => ({ ...prev, urgent: newUrgent }));
                engine.setConversations(prev => prev.map(c => c.id === selectedConvo.id ? { ...c, urgent: newUrgent } : c));
                toast.success(newUrgent ? 'Contato marcado como urgente!' : 'Marcação de urgência removida.');
                engine.loadConversations();
            }
        } catch (err) {
            toast.error('Erro ao atualizar marcação de urgência.');
        }
    };

    const handleSaveNote = async () => {
        if (!selectedConvo) return;
        engine.setIsSavingNote(true);
        try {
            const res = await fetchWithAuth(`${API_URL}/chat/conversations/${selectedConvo.id}/note`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ private_note: engine.privateNote })
            }, activeClient.id);

            if (res.ok) {
                const data = await res.json();
                setSelectedConvo(prev => ({ ...prev, private_note: engine.privateNote }));
                engine.setConversations(prev => prev.map(c => c.id === selectedConvo.id ? { ...c, private_note: engine.privateNote } : c));
                if (data.message) {
                    engine.setMessages(prev => [...prev, data.message]);
                    engine.setShouldScrollToBottom(true);
                }
                engine.setPrivateNote('');
                engine.loadConversationMedia?.(selectedConvo.id);
                toast.success('Anotação privada salva!');
            }
        } catch (err) {
            toast.error('Erro ao salvar anotação.');
        } finally {
            engine.setIsSavingNote(false);
        }
    };

    const handleConfirmBlockContact = async (type, hours) => {
        if (!selectedConvo || !activeClient) return;
        engine.setIsBlockingContact(true);
        try {
            const endpoint = type === 'resting' ? `${API_URL}/resting/` : `${API_URL}/blocked/`;
            const body = type === 'resting'
                ? { phone: selectedConvo.phone, name: selectedConvo.contact_name, reason: 'Bloqueado via Atendimento', hours }
                : { phone: selectedConvo.phone, name: selectedConvo.contact_name, reason: 'Bloqueado via Atendimento' };

            const res = await fetchWithAuth(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            }, activeClient.id);

            if (res.ok) {
                toast.success(type === 'resting' ? 'Contato em repouso.' : 'Contato bloqueado.');
                engine.setIsBlockModalOpen(false);
                setSelectedConvo(prev => prev ? { ...prev, block_status: type === 'resting' ? 'resting' : 'blocked' } : prev);
                engine.setConversations(prev => prev.map(c => c.id === selectedConvo.id ? { ...c, block_status: type === 'resting' ? 'resting' : 'blocked' } : c));
                engine.loadConversations(false);
            }
        } catch (err) {
            toast.error('Erro ao bloquear contato.');
        } finally {
            engine.setIsBlockingContact(false);
        }
    };

    const handleUnblockContact = async () => {
        if (!selectedConvo || !activeClient) return;
        const currentStatus = selectedConvo.block_status;
        if (!currentStatus || currentStatus === 'none') return;

        const isResting = currentStatus === 'resting';
        const endpoint = isResting 
            ? `${API_URL}/resting/by_phone/${selectedConvo.phone}`
            : `${API_URL}/blocked/by_phone/${selectedConvo.phone}`;

        const loadingToast = toast.loading(isResting ? 'Removendo do repouso...' : 'Desbloqueando contato...');
        try {
            const res = await fetchWithAuth(endpoint, {
                method: 'DELETE'
            }, activeClient.id);

            if (res.ok) {
                toast.dismiss(loadingToast);
                toast.success(isResting ? 'Contato removido do repouso!' : 'Contato desbloqueado!');
                setSelectedConvo(prev => prev ? { ...prev, block_status: null } : prev);
                engine.setConversations(prev => prev.map(c => c.id === selectedConvo.id ? { ...c, block_status: null } : c));
                engine.loadConversations(false);
            } else {
                throw new Error();
            }
        } catch (err) {
            toast.dismiss(loadingToast);
            toast.error('Falha ao desbloquear o contato.');
        }
    };

    return {
        handleTogglePin,
        handleToggleUrgent,
        handleSaveNote,
        handleConfirmBlockContact,
        handleUnblockContact
    };
}
