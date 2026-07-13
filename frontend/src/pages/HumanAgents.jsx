import React, { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { FiUsers, FiCheckCircle, FiMessageSquare, FiRefreshCw, FiClock, FiSearch } from 'react-icons/fi';
import { fetchWithAuth } from '../AuthContext';
import { API_URL } from '../config';
import { useClient } from '../contexts/ClientContext';
import ConfirmModal from '../components/ConfirmModal';

export default function HumanAgents({ onNavigateToChat }) {
    const { activeClient } = useClient();
    const [conversations, setConversations] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(20);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => {},
        confirmText: 'Confirmar'
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
    }, [activeClient, page, limit]);

    const handleFinishHandover = (convoId, contactName) => {
        setConfirmModal({
            isOpen: true,
            title: 'Finalizar Atendimento Humano',
            message: `Tem certeza que deseja finalizar o atendimento humano de ${contactName}? O controle da conversa retornará para o agente de IA.`,
            confirmText: 'Finalizar',
            onConfirm: async () => {
                try {
                    const res = await fetchWithAuth(
                        `${API_URL}/chat/conversations/${convoId}/finish-human-handover`,
                        { method: 'POST' },
                        activeClient.id
                    );
                    if (res.ok) {
                        toast.success("Atendimento humano finalizado com sucesso!");
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

    const filteredConversations = conversations.filter(c =>
        (c.contact_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.phone || '').includes(searchQuery)
    );

    const totalPages = Math.max(1, Math.ceil(total / limit));

    return (
        <div className="space-y-6">
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
                        className="p-2.5 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 text-gray-600 dark:text-gray-300 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 transition-colors disabled:opacity-50"
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
                            <div
                                key={convo.id}
                                className="bg-white dark:bg-[#1e293b] border border-gray-100 dark:border-white/5 p-6 rounded-2xl shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-5"
                            >
                                <div className="space-y-3">
                                    <div className="flex justify-between items-start gap-2">
                                        <div className="truncate">
                                            <h4 className="text-sm font-bold text-gray-800 dark:text-white truncate">{convo.contact_name}</h4>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{convo.phone}</p>
                                        </div>
                                        <div className="flex items-center gap-1 bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-500/20 text-yellow-700 dark:text-yellow-400 text-[10px] font-bold px-2 py-1 rounded-lg shrink-0">
                                            <FiClock size={12} />
                                            <span>{getWaitingTime(convo.human_handover_at)}</span>
                                        </div>
                                    </div>

                                    {convo.last_message_content && (
                                        <div className="p-3 bg-gray-50 dark:bg-[#0f172a] rounded-xl text-xs text-gray-600 dark:text-gray-300 border border-gray-100 dark:border-white/5">
                                            <p className="line-clamp-2 italic">"{convo.last_message_content}"</p>
                                        </div>
                                    )}
                                </div>

                                <div className="flex gap-3">
                                    <button
                                        onClick={() => handleFinishHandover(convo.id, convo.contact_name)}
                                        className="flex-1 py-3 px-4 bg-green-500 hover:bg-green-600 active:scale-95 text-white font-bold text-xs rounded-xl shadow-md shadow-green-500/10 transition-all flex items-center justify-center gap-2"
                                    >
                                        <FiCheckCircle size={14} />
                                        <span>Finalizar</span>
                                    </button>
                                    <button
                                        onClick={() => onNavigateToChat(convo)}
                                        className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-600/10 transition-all flex items-center justify-center gap-2"
                                    >
                                        <FiMessageSquare size={14} />
                                        <span>Abrir Conversa</span>
                                    </button>
                                </div>
                            </div>
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
                                className="px-3.5 py-2 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                            >
                                Anterior
                            </button>
                            <span className="px-3.5 py-2 bg-blue-600/10 text-blue-600 rounded-xl">
                                Página {page} de {totalPages}
                            </span>
                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page >= totalPages || loading}
                                className="px-3.5 py-2 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
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
                isDangerous={false}
            />
        </div>
    );
}
