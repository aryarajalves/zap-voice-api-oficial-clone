import React, { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { FiUsers, FiCheckCircle, FiRefreshCw, FiSearch } from 'react-icons/fi';
import { fetchWithAuth } from '../AuthContext';
import { API_URL } from '../config';
import { useClient } from '../contexts/ClientContext';
import ConfirmModal from '../components/ConfirmModal';
import HumanAgentCard from './HumanAgents/components/HumanAgentCard';
import HumanAgentsBulkBar from './HumanAgents/components/HumanAgentsBulkBar';

export default function HumanAgents({ onNavigateToChat }) {
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

    const getWaitingTime = (handoverTimeIso) => {
        if (!handoverTimeIso) return 'Sem tempo registrado';
        const start = new Date(handoverTimeIso);
        const now = new Date();
        const diffMs = now - start;
        const diffMins = Math.floor(diffMs / 60000);

        if (diffMins < 1) return 'Iniciou agora';
        if (diffMins < 60) return `Há ${diffMins} minutos`;
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `Há ${diffHours} ${diffHours === 1 ? 'hora' : 'horas'}`;
        const diffDays = Math.floor(diffHours / 24);
        return `Há ${diffDays} ${diffDays === 1 ? 'dia' : 'dias'}`;
    };

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

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-[#1e293b] p-6 rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm transition-colors">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-blue-500/10 rounded-xl text-blue-500">
                        <FiUsers size={22} />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-gray-800 dark:text-white">Fila de Atendimento Humano</h2>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Gerencie conversas que estão sob atendimento manual de humanos no momento.</p>
                    </div>
                </div>
                <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500 dark:text-gray-400 font-semibold">Exibir:</span>
                        <select
                            value={limit}
                            onChange={(e) => {
                                setLimit(Number(e.target.value));
                                setPage(1);
                            }}
                            className="bg-white dark:bg-[#1e293b] border border-gray-100 dark:border-white/5 text-gray-700 dark:text-gray-300 rounded-xl px-2.5 py-1.5 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                            <option value={20}>20 por página</option>
                            <option value={50}>50 por página</option>
                            <option value={100}>100 por página</option>
                        </select>
                    </div>
                    <button
                        onClick={loadHumanConversations}
                        disabled={loading}
                        className="p-2.5 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 text-gray-600 dark:text-gray-300 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 transition-colors disabled:opacity-50 cursor-pointer"
                        title="Atualizar fila"
                    >
                        <FiRefreshCw className={loading ? "animate-spin" : ""} size={16} />
                    </button>
                </div>
            </div>

            {/* Filtro de Busca */}
            <div className="relative">
                <FiSearch className="absolute left-4 top-3.5 text-gray-400 dark:text-gray-500" size={16} />
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar por nome ou número do contato na página..."
                    className="w-full pl-11 pr-4 py-3 bg-white dark:bg-[#1e293b] border border-gray-100 dark:border-white/5 rounded-2xl text-xs text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all shadow-sm"
                />
            </div>

            {/* Barra de Seleção e Ações em Lote */}
            {filteredConversations.length > 0 && (
                <HumanAgentsBulkBar
                    totalFiltered={filteredConversations.length}
                    total={total}
                    selectedCount={selectedIds.length}
                    allSelected={allFilteredSelected}
                    isAllPagesSelected={isAllPagesSelected}
                    onToggleSelectAll={handleToggleSelectAll}
                    onSelectAllPages={handleSelectAllPages}
                    onDeleteSelected={() => handleDeleteConversations(
                        selectedIds,
                        isAllPagesSelected ? `todas as ${selectedIds.length} conversas da fila` : `${selectedIds.length} conversas selecionadas`
                    )}
                    onFinishSelected={() => handleFinishBulk(selectedIds)}
                    onClearSelection={handleClearSelection}
                    isProcessing={isProcessing}
                />
            )}

            {loading && conversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                    <FiRefreshCw className="animate-spin mb-4" size={24} />
                    <p className="text-xs font-semibold">Carregando contatos na fila...</p>
                </div>
            ) : filteredConversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 bg-white dark:bg-[#1e293b] rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm text-gray-400">
                    <FiCheckCircle size={36} className="text-green-500 mb-4 animate-pulse" />
                    <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Nenhum atendimento pendente</h3>
                    <p className="text-xs max-w-xs text-center">Todos os contatos estão sob controle do robô de IA ou a fila está limpa.</p>
                </div>
            ) : (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredConversations.map((convo) => (
                            <HumanAgentCard
                                key={convo.id}
                                convo={convo}
                                isSelected={selectedIds.includes(convo.id)}
                                onToggleSelect={handleToggleSelect}
                                onFinishHandover={handleFinishHandover}
                                onNavigateToChat={onNavigateToChat}
                                onDeleteSingle={(c) => handleDeleteConversations([c.id], `a conversa de ${c.contact_name || c.phone}`)}
                                waitingTimeStr={getWaitingTime(convo.human_handover_at)}
                            />
                        ))}
                    </div>

                    {/* Controles de Paginação */}
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white dark:bg-[#1e293b] p-4 rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm text-xs font-semibold text-gray-500 dark:text-gray-400">
                        <span>
                            Mostrando {filteredConversations.length} de {total} contatos
                        </span>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1 || loading}
                                className="px-3.5 py-2 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                            >
                                Anterior
                            </button>
                            <span className="px-3.5 py-2 bg-blue-600/10 text-blue-600 rounded-xl">
                                Página {page} de {totalPages}
                            </span>
                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page >= totalPages || loading}
                                className="px-3.5 py-2 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                            >
                                Próxima
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <ConfirmModal
                isOpen={confirmModal.isOpen}
                title={confirmModal.title}
                message={confirmModal.message}
                confirmText={confirmModal.confirmText}
                onConfirm={confirmModal.onConfirm}
                onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                isDangerous={confirmModal.isDangerous || false}
            />
        </div>
    );
}
