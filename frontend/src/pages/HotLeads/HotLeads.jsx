import React, { useState, useEffect, useMemo } from 'react';
import { useAuth, fetchWithAuth } from '../../AuthContext';
import { useClient } from '../../contexts/ClientContext';
import { API_URL } from '../../config';
import { toast } from 'react-hot-toast';
import { 
    FiZap, FiUser, FiPhone, FiAlertCircle, 
    FiTrash2, FiClock, FiCheckCircle, FiSearch, 
    FiMessageSquare, FiExternalLink, FiX 
} from 'react-icons/fi';
import ConfirmModal from '../../components/ConfirmModal';

export default function HotLeads() {
    const { user } = useAuth();
    const { activeClient } = useClient();

    const [leads, setLeads] = useState([]);
    const [sellers, setSellers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [priorityFilter, setPriorityFilter] = useState('all');

    // Estado do Modal de Confirmação de Exclusão (usando ConfirmModal global)
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [leadToDelete, setLeadToDelete] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Carrega dados da API
    const fetchData = async () => {
        if (!activeClient) return;
        setLoading(true);
        try {
            // Carregar Leads Quentes
            const leadsRes = await fetchWithAuth(`${API_URL}/hot-leads`, {
                headers: { 'X-Client-ID': activeClient.id }
            });
            if (leadsRes.ok) {
                const data = await leadsRes.json();
                setLeads(data.items || []);
            } else {
                toast.error("Erro ao carregar leads quentes.");
            }

            // Carregar Vendedores se for Admin/SuperAdmin/Premium
            if (user && user.role !== 'vendedor') {
                const sellersRes = await fetchWithAuth(`${API_URL}/hot-leads/sellers`, {
                    headers: { 'X-Client-ID': activeClient.id }
                });
                if (sellersRes.ok) {
                    const data = await sellersRes.json();
                    setSellers(data || []);
                }
            }
        } catch (err) {
            console.error(err);
            toast.error("Erro de conexão ao carregar dados.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [activeClient]);

    // Trata atribuição de vendedor
    const handleAssignSeller = async (leadId, sellerId) => {
        try {
            const res = await fetchWithAuth(`${API_URL}/hot-leads/${leadId}`, {
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json',
                    'X-Client-ID': activeClient.id 
                },
                body: jsonStringify({ assigned_user_id: sellerId || null })
            });
            if (res.ok) {
                toast.success("Vendedor atribuído com sucesso!");
                fetchData();
            } else {
                const err = await res.json();
                toast.error(err.detail || "Erro ao atribuir vendedor.");
            }
        } catch {
            toast.error("Erro de conexão ao atribuir vendedor.");
        }
    };

    // Helper para contornar problemas de stringify
    const jsonStringify = (obj) => {
        return JSON.stringify(obj);
    };

    // Trata mudança de prioridade
    const handleChangePriority = async (leadId, priority) => {
        try {
            const res = await fetchWithAuth(`${API_URL}/hot-leads/${leadId}`, {
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json',
                    'X-Client-ID': activeClient.id 
                },
                body: jsonStringify({ priority })
            });
            if (res.ok) {
                toast.success("Prioridade atualizada!");
                fetchData();
            } else {
                const err = await res.json();
                toast.error(err.detail || "Erro ao atualizar prioridade.");
            }
        } catch {
            toast.error("Erro de conexão ao atualizar prioridade.");
        }
    };

    // Deleta o Lead Quente
    const handleDelete = async () => {
        if (!leadToDelete) return;
        setIsDeleting(true);
        try {
            const res = await fetchWithAuth(`${API_URL}/hot-leads/${leadToDelete.id}`, {
                method: 'DELETE',
                headers: { 'X-Client-ID': activeClient.id }
            });
            if (res.ok) {
                toast.success("Lead quente removido da fila!");
                setIsDeleteModalOpen(false);
                setLeadToDelete(null);
                fetchData();
            } else {
                const err = await res.json();
                toast.error(err.detail || "Erro ao remover lead.");
            }
        } catch {
            toast.error("Erro de conexão ao remover lead.");
        } finally {
            setIsDeleting(false);
        }
    };

    // Filtros e busca
    const filteredLeads = useMemo(() => {
        return leads.filter(lead => {
            const matchesSearch = 
                (lead.contact_name || '').toLowerCase().includes(search.toLowerCase()) ||
                (lead.contact_phone || '').includes(search);
            const matchesPriority = priorityFilter === 'all' || lead.priority === priorityFilter;
            return matchesSearch && matchesPriority;
        });
    }, [leads, search, priorityFilter]);

    return (
        <div className="p-8 max-w-7xl mx-auto animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                        <div className="p-2 bg-orange-600 rounded-xl shadow-lg shadow-orange-500/20">
                            <FiZap className="text-white" />
                        </div>
                        Leads Quentes
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-2">
                        Distribuição em tempo real e atendimento focado para acelerar contatos de alta conversão.
                    </p>
                </div>
            </div>

            {/* Filtros */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-wrap gap-4 items-center justify-between mb-8">
                <div className="flex-1 min-w-[280px] relative">
                    <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Buscar por nome, número ou categoria..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50/50 dark:bg-gray-900/50 text-gray-900 dark:text-gray-100 placeholder-gray-400 outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                </div>

                <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Prioridade:</span>
                    <div className="flex bg-gray-100 dark:bg-gray-900 p-1 rounded-xl">
                        {['all', 'Alta', 'Média', 'Baixa'].map((p) => (
                            <button
                                key={p}
                                onClick={() => setPriorityFilter(p)}
                                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                    priorityFilter === p
                                        ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                                        : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                                }`}
                            >
                                {p === 'all' ? 'Todas' : p}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Lista de Cards */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {Array(3).fill(0).map((_, i) => (
                        <div key={i} className="h-60 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 animate-pulse" />
                    ))}
                </div>
            ) : filteredLeads.length === 0 ? (
                <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
                    <FiCheckCircle size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white">Fila limpa!</h3>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Nenhum lead quente aguardando atendimento.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredLeads.map((lead) => {
                        const isHigh = lead.priority === 'Alta';
                        const isLow = lead.priority === 'Baixa';
                        const badgeColor = isHigh 
                            ? 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 border-red-100 dark:border-red-900/30'
                            : isLow
                                ? 'bg-slate-50 text-slate-600 dark:bg-slate-900/20 dark:text-slate-400 border-slate-100 dark:border-slate-900/30'
                                : 'bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400 border-orange-100 dark:border-orange-900/30';

                        return (
                            <div 
                                key={lead.id}
                                className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/80 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group relative overflow-hidden"
                            >
                                {/* Categoria Accent */}
                                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 to-amber-500" />
                                
                                <div>
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-950/20 flex items-center justify-center text-orange-600 dark:text-orange-400 font-extrabold border border-orange-100 dark:border-orange-900/30">
                                                {lead.contact_name ? lead.contact_name[0].toUpperCase() : '?'}
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-gray-900 dark:text-white leading-tight">
                                                    {lead.contact_name || 'Sem Nome'}
                                                </h3>
                                                <p className="text-xs text-gray-400 font-mono mt-0.5">{lead.contact_phone}</p>
                                            </div>
                                        </div>

                                        <span className={`px-2 py-0.5 text-[10px] font-black border rounded-md uppercase tracking-wider ${badgeColor}`}>
                                            {lead.priority}
                                        </span>
                                    </div>

                                    {/* Alerta/Categoria */}
                                    <div className="mb-4">
                                        <span className="text-[10px] font-black text-orange-500 dark:text-orange-400 uppercase tracking-widest block mb-1">
                                            {lead.alert_name || 'Gatilho Desconhecido'}
                                        </span>
                                        {lead.context_message && (
                                            <p className="text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/50 p-3 rounded-xl border border-gray-100 dark:border-gray-800/40 italic leading-relaxed">
                                                "{lead.context_message}"
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700/50 flex flex-col gap-3">
                                    {/* Atribuição de Vendedor (Se não for vendedor) */}
                                    {user && user.role !== 'vendedor' && (
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Atribuir:</span>
                                            <select
                                                value={lead.assigned_user_id || ''}
                                                onChange={(e) => handleAssignSeller(lead.id, e.target.value)}
                                                className="text-xs font-bold px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-orange-500 cursor-pointer max-w-[160px] truncate"
                                            >
                                                <option value="">👤 Fila / Sem Vendedor</option>
                                                {sellers.map(s => (
                                                    <option key={s.id} value={s.id}>👤 {s.full_name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}

                                    {/* Status Atribuído se for Vendedor */}
                                    {user && user.role === 'vendedor' && (
                                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                            <FiClock size={12} />
                                            <span>Atribuído a você</span>
                                        </div>
                                    )}

                                    {/* Rodapé do Card com Ações */}
                                    <div className="flex items-center justify-between mt-1">
                                        <div className="flex gap-2">
                                            <a
                                                href={`https://wa.me/${lead.contact_phone}`}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="p-2 text-gray-400 hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-950/20 rounded-lg transition-colors"
                                                title="Chamar no WhatsApp"
                                            >
                                                <FiExternalLink size={16} />
                                            </a>
                                            <button
                                                onClick={() => {
                                                    // Abre o chat do Chatwoot se disponível
                                                    toast.success("Abrindo conversa...");
                                                    window.open(`https://wa.me/${lead.contact_phone}`, "_blank");
                                                }}
                                                className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/20 rounded-lg transition-colors"
                                                title="Ver Conversa"
                                            >
                                                <FiMessageSquare size={16} />
                                            </button>
                                        </div>

                                        {/* Ações de Admin */}
                                        {user && user.role !== 'vendedor' && (
                                            <button
                                                onClick={() => {
                                                    setLeadToDelete(lead);
                                                    setIsDeleteModalOpen(true);
                                                }}
                                                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition"
                                                title="Remover da Fila"
                                            >
                                                <FiTrash2 size={16} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Modal de Confirmação de Exclusão usando ConfirmModal global */}
            <ConfirmModal
                isOpen={isDeleteModalOpen}
                onClose={() => {
                    setIsDeleteModalOpen(false);
                    setLeadToDelete(null);
                }}
                onConfirm={handleDelete}
                title="Excluir Lead Quente?"
                message="Esta ação removerá permanentemente o contato da fila de leads quentes. Esta ação não poderá ser desfeita."
                confirmText={isDeleting ? 'Excluindo...' : 'Sim, Excluir'}
                cancelText="Cancelar"
                isDangerous={true}
            />
        </div>
    );
}
