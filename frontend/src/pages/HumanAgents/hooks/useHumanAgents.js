import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { fetchWithAuth } from '../../../AuthContext';
import { API_URL } from '../../../config';
import { useClient } from '../../../contexts/ClientContext';

export function useHumanAgents() {
    const { activeClient } = useClient();
    const [conversations, setConversations] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(20);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedIds, setSelectedIds] = useState([]);
    const [isAllPagesSelected, setIsAllPagesSelected] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => {},
        confirmText: 'Confirmar',
        isDangerous: false
    });

    const loadHumanConversations = async () => {
        if (!activeClient) return;
        setLoading(true);
        try {
            const res = await fetchWithAuth(
                `${API_URL}/chat/human-conversations?page=${page}&limit=${limit}`,
                {},
                activeClient.id
            );
            if (res.ok) {
                const data = await res.json();
                setConversations(data.data || []);
                setTotal(data.total || 0);
            } else {
                toast.error("Erro ao buscar a fila de atendimento humano.");
            }
        } catch (err) {
            console.error("Erro ao buscar atendimento humano:", err);
            toast.error("Falha ao comunicar com o servidor.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadHumanConversations();
    }, [activeClient?.id, page, limit]);

    // Limpa seleção apenas se o cliente ativo for alterado
    useEffect(() => {
        setSelectedIds([]);
        setIsAllPagesSelected(false);
    }, [activeClient?.id]);

    const handleFinishHandover = (convoId, contactName) => {
        setConfirmModal({
            isOpen: true,
            title: 'Finalizar Atendimento Humano',
            message: `Tem certeza que deseja finalizar o atendimento humano de ${contactName}? O controle da conversa retornará para o agente de IA.`,
            confirmText: 'Finalizar',
            isDangerous: false,
            onConfirm: async () => {
                try {
                    const res = await fetchWithAuth(
                        `${API_URL}/chat/conversations/${convoId}/finish-human-handover`,
                        { method: 'POST' },
                        activeClient.id
                    );
                    if (res.ok) {
                        toast.success("Atendimento humano finalizado com sucesso!");
                        setSelectedIds(prev => prev.filter(id => id !== convoId));
                        loadHumanConversations();
                    } else {
                        toast.error("Erro ao finalizar atendimento.");
                    }
                } catch (err) {
                    console.error("Erro ao finalizar handover:", err);
                    toast.error("Erro de comunicação com o servidor.");
                }
            }
        });
    };

    const handleDeleteConversations = (idsToDelete, label) => {
        if (!idsToDelete || idsToDelete.length === 0) return;
        const isBulk = idsToDelete.length > 1;

        setConfirmModal({
            isOpen: true,
            title: isBulk ? `Deletar ${idsToDelete.length} Conversas` : `Deletar Conversa`,
            message: `Tem certeza que deseja deletar permanentemente ${label}? Esta ação apagará o histórico da conversa e todas as mensagens associadas.`,
            confirmText: 'Deletar Permanentemente',
            isDangerous: true,
            onConfirm: async () => {
                setIsProcessing(true);
                try {
                    const res = await fetchWithAuth(
                        `${API_URL}/chat/conversations`,
                        {
                            method: 'DELETE',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ ids: idsToDelete })
                        },
                        activeClient.id
                    );
                    if (res.ok) {
                        toast.success(isBulk ? `${idsToDelete.length} conversas deletadas com sucesso!` : "Conversa deletada com sucesso!");
                        setSelectedIds(prev => prev.filter(id => !idsToDelete.includes(id)));
                        setIsAllPagesSelected(false);
                        loadHumanConversations();
                    } else {
                        toast.error("Erro ao deletar conversa(s).");
                    }
                } catch (err) {
                    console.error("Erro ao deletar conversas:", err);
                    toast.error("Erro de comunicação com o servidor.");
                } finally {
                    setIsProcessing(false);
                }
            }
        });
    };

    const handleFinishBulk = (idsToFinish) => {
        if (!idsToFinish || idsToFinish.length === 0) return;

        setConfirmModal({
            isOpen: true,
            title: `Finalizar ${idsToFinish.length} Atendimentos`,
            message: `Tem certeza que deseja finalizar o atendimento humano das ${idsToFinish.length} conversas selecionadas? O controle retornará para o robô de IA.`,
            confirmText: 'Finalizar Todos',
            isDangerous: false,
            onConfirm: async () => {
                setIsProcessing(true);
                try {
                    const res = await fetchWithAuth(
                        `${API_URL}/chat/conversations/bulk-finish-human-handover`,
                        {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ ids: idsToFinish })
                        },
                        activeClient.id
                    );
                    if (res.ok) {
                        toast.success(`${idsToFinish.length} atendimentos finalizados com sucesso!`);
                        setSelectedIds(prev => prev.filter(id => !idsToFinish.includes(id)));
                        setIsAllPagesSelected(false);
                        loadHumanConversations();
                    } else {
                        toast.error("Erro ao finalizar atendimentos selecionados.");
                    }
                } catch (err) {
                    console.error("Erro ao finalizar em lote:", err);
                    toast.error("Erro ao finalizar atendimentos selecionados.");
                } finally {
                    setIsProcessing(false);
                }
            }
        });
    };

    const filteredConversations = conversations.filter(c =>
        (c.contact_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.phone || '').includes(searchQuery)
    );

    const handleToggleSelect = (convoId) => {
        setSelectedIds(prev => {
            const next = prev.includes(convoId) ? prev.filter(id => id !== convoId) : [...prev, convoId];
            if (prev.includes(convoId)) {
                setIsAllPagesSelected(false);
            }
            return next;
        });
    };

    const allFilteredSelected = filteredConversations.length > 0 &&
        filteredConversations.every(c => selectedIds.includes(c.id));

    const handleToggleSelectAll = () => {
        if (allFilteredSelected) {
            setSelectedIds(prev => prev.filter(id => !filteredConversations.some(c => c.id === id)));
            setIsAllPagesSelected(false);
        } else {
            const newIds = Array.from(new Set([...selectedIds, ...filteredConversations.map(c => c.id)]));
            setSelectedIds(newIds);
            setIsAllPagesSelected(false);
        }
    };

    const handleSelectAllPages = async () => {
        if (!activeClient?.id || !total) return;
        setIsProcessing(true);
        try {
            const res = await fetchWithAuth(
                `${API_URL}/chat/human-conversations?page=1&limit=${total}`,
                {},
                activeClient.id
            );
            if (res.ok) {
                const data = await res.json();
                const allConvos = data.data || [];
                const allIds = allConvos.map(c => c.id);
                setSelectedIds(allIds);
                setIsAllPagesSelected(true);
                toast.success(`Todas as ${allIds.length} conversas foram selecionadas!`);
            } else {
                toast.error("Erro ao selecionar todas as conversas.");
            }
        } catch (err) {
            console.error("Erro ao selecionar todas as páginas:", err);
            toast.error("Falha ao selecionar conversas de todas as páginas.");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleClearSelection = () => {
        setSelectedIds([]);
        setIsAllPagesSelected(false);
    };

    const totalPages = Math.max(1, Math.ceil(total / limit));

    return {
        conversations,
        total,
        page,
        setPage,
        limit,
        setLimit,
        loading,
        searchQuery,
        setSearchQuery,
        selectedIds,
        setSelectedIds,
        isAllPagesSelected,
        isProcessing,
        confirmModal,
        setConfirmModal,
        loadHumanConversations,
        handleFinishHandover,
        handleDeleteConversations,
        handleFinishBulk,
        handleToggleSelect,
        handleToggleSelectAll,
        handleSelectAllPages,
        handleClearSelection,
        filteredConversations,
        allFilteredSelected,
        totalPages
    };
}
