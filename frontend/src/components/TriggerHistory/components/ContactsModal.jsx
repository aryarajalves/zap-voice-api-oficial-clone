import React from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'react-hot-toast';
import { FiCpu, FiAlertCircle } from 'react-icons/fi';
import TagContactsModal from './TagContactsModal';
import BulkSendContactsModal from './BulkSendContactsModal';
import { API_URL } from '../../../config';
import { fetchWithAuth } from '../../../AuthContext';

// Helper: formata data individual no horário de Brasília com guard contra epoch/nulo
const formatBRDate = (raw) => {
    if (!raw) return '–';
    try {
        const d = new Date(raw);
        if (isNaN(d.getTime()) || d.getFullYear() < 2000) return '–';
        return d.toLocaleString('pt-BR', {
            timeZone: 'America/Sao_Paulo',
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit', second: '2-digit',
        });
    } catch { return '–'; }
};

const ContactsModal = ({
    contactsModal, setContactsModal, contactsFilter, setContactsFilter,
    contactsTypeFilter, setContactsTypeFilter, contactsErrorFilter, setContactsErrorFilter,
    loadingContacts, contactsPage, setContactsPage, contactsPerPage, setContactsPerPage, contactsTotal,
    activeClient, onRefresh
}) => {
    const [selectedPhones, setSelectedPhones] = React.useState([]);
    const [explainError, setExplainError] = React.useState(null);

    const ERROR_EXPLANATIONS = {
        "TEMPLATE_PAUSED": {
            titulo: "Template Pausado por Baixa Qualidade",
            descricao: "O modelo de mensagem (template) foi pausado temporariamente pelo WhatsApp/Meta após receber feedback negativo (denúncias de spam ou baixa qualidade) dos clientes.",
            acao: "Pare imediatamente o disparo! Revise o conteúdo da mensagem e aguarde a liberação ou crie um novo template mais amigável para evitar bloqueios na API."
        },
        "INTEGRITY_BLOCK": {
            titulo: "Bloqueio de Integridade Meta",
            descricao: "O WhatsApp bloqueou o envio para proteger os destinatários contra possíveis abusos ou excesso de mensagens não solicitadas (spam).",
            acao: "Evite continuar disparando a mesma mensagem em lote imediatamente. Aumente o delay de disparo e utilize um funil com interação prévia para aquecer os leads."
        },
        "UNDELIVERABLE": {
            titulo: "Número Inválido ou Inexistente",
            descricao: "O número de telefone de destino não está registrado no WhatsApp ou está inválido.",
            acao: "Remova este contato da sua lista de disparos. Tentar enviar repetidamente para números inexistentes prejudica a reputação do seu número na Meta."
        },
        "SERVICE_UNAVAILABLE": {
            titulo: "Instabilidade Temporária da Meta",
            descricao: "Falha momentânea ou instabilidade nos servidores da própria Meta/WhatsApp Cloud API.",
            acao: "Não se preocupe com o contato. Este erro é de infraestrutura da Meta. Você pode tentar reenviar a mensagem para eles daqui a alguns minutos."
        },
        "SOMETHING_WENT_WRONG": {
            titulo: "Erro Interno da Meta",
            descricao: "Um erro interno genérico desconhecido ocorreu nos servidores do WhatsApp Cloud API.",
            acao: "Falha técnica temporária do sistema deles. Não indica problema no contato ou template. Pode tentar realizar o reenvio mais tarde."
        },
        "BOT_BLOCK": {
            titulo: "Bloqueou o Bot (Ação do Contato)",
            descricao: "O contato recebeu a mensagem e voluntariamente clicou em um botão de opt-out/sair (ex: 'Sair da Lista' ou 'Bloquear') configurado por você no fluxo do disparo.",
            acao: "O contato expressou o desejo de não receber mais mensagens automatizadas e foi bloqueado de futuros disparos para respeitar sua privacidade."
        },
        "EXCLUSION_LIST": {
            titulo: "Lista de Exclusão (Bloqueado Prévio)",
            descricao: "O contato não recebeu o envio porque o número dele já estava previamente cadastrado na sua Lista de Exclusão (Blacklist/Opt-out) interna do sistema antes do início do lote.",
            acao: "Nenhuma ação é necessária. O sistema barrou o envio automaticamente antes de enviar para a API do WhatsApp para economizar custos e evitar denúncias."
        },
        "RATE_LIMIT": {
            titulo: "Limite de Requisições Excedido (Rate Limit)",
            descricao: "O WhatsApp/Meta ou o próprio servidor bloqueou temporariamente o envio porque a quantidade de mensagens disparadas em um curto intervalo de tempo excedeu os limites de segurança da API.",
            acao: "Evite disparar com concorrência muito alta sem delay. Aumente o tempo de delay (segundos) entre as mensagens nas configurações de disparo ou aguarde alguns minutos antes de tentar reenviar para estes contatos."
        }
    };
 
    const getExplanationKey = (reason) => {
        if (!reason) return null;
        if (reason === 'BLOCKED_VIA_BUTTON') return "BOT_BLOCK";
        if (reason.includes("132015") || reason.includes("paused due to low quality")) return "TEMPLATE_PAUSED";
        if (reason.includes("131049") || reason.includes("healthy ecosystem engagement")) return "INTEGRITY_BLOCK";
        if (reason.includes("131026") || reason.includes("undeliverable") || reason.includes("não entregável")) return "UNDELIVERABLE";
        if (reason.includes("(#2)") || reason.includes("service temporarily") || reason.includes("Serviço temporariamente")) return "SERVICE_UNAVAILABLE";
        if (reason.includes("131000") || reason.includes("something went wrong") || reason.includes("Algo deu errado")) return "SOMETHING_WENT_WRONG";
        if (reason.includes("Exclusão") || reason.includes("Bloqueado") || reason.includes("BLOCKED")) return "EXCLUSION_LIST";
        if (reason.toLowerCase().includes("too many requests") || reason.toLowerCase().includes("rate limit") || reason.toLowerCase().includes("limit reached") || reason.includes("80007")) return "RATE_LIMIT";
        return null;
    };

    const [isTagModalOpen, setIsTagModalOpen] = React.useState(false);
    const [isConfirmBlockOpen, setIsConfirmBlockOpen] = React.useState(false);
    const [isBulkSendModalOpen, setIsBulkSendModalOpen] = React.useState(false);
    const [loadingBlock, setLoadingBlock] = React.useState(false);

    // Estado de paginação local (fallback se as props não vierem do hook)
    const [localPage, setLocalPage] = React.useState(1);
    const [localPerPage, setLocalPerPage] = React.useState(20);

    // Usa props do hook se existirem, senão usa estado local
    const currentPage = contactsPage ?? localPage;
    const perPage = contactsPerPage ?? localPerPage;
    const setPage = setContactsPage ?? setLocalPage;
    const setPerPage = (val) => {
        if (setContactsPerPage) setContactsPerPage(val);
        else setLocalPerPage(val);
        if (setContactsPage) setContactsPage(1);
        else setLocalPage(1);
    };

    // Paginação: usa contactsTotal do hook (paginação server-side) ou o tamanho do array (client-side)
    const totalCount = (contactsTotal && contactsTotal > 0) ? contactsTotal : contactsModal.contacts.length;
    const totalPages = perPage > 0 ? Math.ceil(totalCount / perPage) : 1;

    // Se a paginação é client-side (sem contactsTotal), sliceia localmente
    const isClientSidePaging = !contactsTotal || contactsTotal === 0;
    const displayContacts = isClientSidePaging
        ? contactsModal.contacts.slice((currentPage - 1) * perPage, currentPage * perPage)
        : contactsModal.contacts; // server-side já vem paginado

    React.useEffect(() => {
        setSelectedPhones([]);
        setPage(1);
    }, [contactsModal.isOpen, contactsFilter, contactsTypeFilter, contactsErrorFilter]);

    React.useEffect(() => {
        if (!contactsModal.isOpen && setContactsErrorFilter) {
            setContactsErrorFilter('all');
        }
    }, [contactsModal.isOpen, setContactsErrorFilter]);

    React.useEffect(() => {
        if (contactsModal.isOpen) {
            document.body.classList.add('no-scroll');
        } else {
            document.body.classList.remove('no-scroll');
        }
        return () => {
            document.body.classList.remove('no-scroll');
        };
    }, [contactsModal.isOpen]);

    const handleBlockSelectedContacts = async () => {
        setLoadingBlock(true);
        try {
            const contactsToBlock = selectedPhones.map(phone => {
                const contactObj = contactsModal.contacts.find(c => {
                    const cPhone = getContactPhone(c);
                    // Compara removendo caracteres não numéricos para garantir casamento
                    return cPhone.replace(/\D/g, '') === phone.replace(/\D/g, '');
                }) || {};
                return {
                    phone: phone,
                    name: contactObj.contact_name || contactObj.name || phone,
                    reason: contactObj.failure_reason 
                        ? `${contactObj.failure_reason} (Falhas — ${contactsModal.title})`
                        : `Falha no envio (Falhas — ${contactsModal.title})`
                };
            });

            const res = await fetchWithAuth(`${API_URL}/blocked/block_bulk`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contacts: contactsToBlock })
            }, contactsModal.clientId || activeClient?.id);

            if (res.ok) {
                const data = await res.json();
                toast.success(`${data.success_count} contatos adicionados à lista de bloqueio.`);
                
                setSelectedPhones([]);
                setIsConfirmBlockOpen(false);

                // Fecha o modal de contatos para forçar uma nova consulta limpa com os dados corretos e atualizados
                setContactsModal(prev => ({ ...prev, isOpen: false }));

                // Força atualização da listagem principal do histórico
                if (onRefresh) onRefresh();
            } else {
                const err = await res.json().catch(() => ({}));
                toast.error(err.detail || 'Erro ao bloquear contatos.');
            }
        } catch (e) {
            toast.error('Erro de conexão ao bloquear contatos.');
        } finally {
            setLoadingBlock(false);
        }
    };

    const getContactPhone = (contact) => contact.phone_number || contact.phone || '';

    const [isConfirmRestOpen, setIsConfirmRestOpen] = React.useState(false);
    const [loadingRest, setLoadingRest] = React.useState(false);

    const handleRestSelectedContacts = async () => {
        setLoadingRest(true);
        try {
            const contactsToRest = selectedPhones.map(phone => {
                const contactObj = contactsModal.contacts.find(c => {
                    const cPhone = getContactPhone(c);
                    return cPhone.replace(/\D/g, '') === phone.replace(/\D/g, '');
                }) || {};
                return {
                    phone: phone,
                    name: contactObj.contact_name || contactObj.name || phone,
                    reason: contactObj.failure_reason 
                        ? `${contactObj.failure_reason} (Falhas — ${contactsModal.title})`
                        : `Falha no envio (Falhas — ${contactsModal.title})`
                };
            });

            const res = await fetchWithAuth(`${API_URL}/resting/rest_bulk`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contacts: contactsToRest })
            }, contactsModal.clientId || activeClient?.id);

            if (res.ok) {
                const data = await res.json();
                toast.success(`${data.success_count} contatos colocados em repouso de 24h.`);
                
                setSelectedPhones([]);
                setIsConfirmRestOpen(false);

                // Fecha o modal de contatos
                setContactsModal(prev => ({ ...prev, isOpen: false }));

                // Força atualização da listagem principal do histórico
                if (onRefresh) onRefresh();
            } else {
                const err = await res.json().catch(() => ({}));
                toast.error(err.detail || 'Erro ao colocar contatos em repouso.');
            }
        } catch (e) {
            toast.error('Erro de conexão ao colocar contatos em repouso.');
        } finally {
            setLoadingRest(false);
        }
    };

    const isSelected = (contact) => {
        const phone = getContactPhone(contact);
        return phone ? selectedPhones.includes(phone) : false;
    };

    const toggleSelectOne = (contact) => {
        const phone = getContactPhone(contact);
        if (!phone) return;
        setSelectedPhones(prev =>
            prev.includes(phone) ? prev.filter(p => p !== phone) : [...prev, phone]
        );
    };

    const toggleSelectAll = () => {
        const visiblePhones = displayContacts.map(getContactPhone).filter(Boolean);
        const allSelected = visiblePhones.length > 0 && visiblePhones.every(p => selectedPhones.includes(p));
        if (allSelected) {
            setSelectedPhones(prev => prev.filter(p => !visiblePhones.includes(p)));
        } else {
            setSelectedPhones(prev => {
                const next = [...prev];
                visiblePhones.forEach(p => { if (!next.includes(p)) next.push(p); });
                return next;
            });
        }
    };

    if (!contactsModal.isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm animated-fade-in">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[85vh]" style={{ userSelect: 'none', cursor: 'default' }}>

                {/* Header */}
                <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50">
                    <div className="flex items-center gap-4 flex-wrap">
                        <h3 className="font-bold text-gray-800 dark:text-white text-lg">{contactsModal.title}</h3>
                        {contactsModal.isTemplate && (
                            <select
                                value={contactsTypeFilter}
                                onChange={(e) => { setContactsTypeFilter(e.target.value); setPage(1); }}
                                className="text-[10px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1.5 outline-none font-black uppercase tracking-widest text-gray-700 dark:text-gray-300 shadow-sm focus:ring-2 focus:ring-blue-500/20 transition-all"
                            >
                                <option value="all">✨ Todos os Tipos</option>
                                <option value="template">💳 Pagos (Template)</option>
                                <option value="free">🆓 Gratuitos (Livre)</option>
                            </select>
                        )}
                        {((contactsFilter === 'failed' || contactsFilter === 'blocked') && contactsModal.failureReasons && contactsModal.failureReasons.length > 0) && (
                            <select
                                id="contacts-error-filter"
                                value={contactsErrorFilter}
                                onChange={(e) => { setContactsErrorFilter(e.target.value); setPage(1); }}
                                className="text-[10px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1.5 outline-none font-black uppercase tracking-widest text-gray-700 dark:text-gray-300 shadow-sm focus:ring-2 focus:ring-blue-500/20 transition-all max-w-[200px] truncate"
                            >
                                <option value="all">
                                    {contactsFilter === 'blocked' ? '🚫 Todos os Bloqueios' : '⚠️ Todos os Erros'}
                                </option>
                                {contactsModal.failureReasons.map((reason, idx) => (
                                    <option key={idx} value={reason}>
                                        {reason === 'BLOCKED_VIA_BUTTON' ? 'BLOQUEOU O BOT' : reason}
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>
                    <button
                        onClick={() => { setContactsModal({ ...contactsModal, isOpen: false }); setContactsTypeFilter('all'); }}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition"
                    >
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Tabs */}
                {contactsModal.showTabs && contactsModal.isTemplate && (
                    <div className="px-4 pt-2 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 flex gap-2 overflow-x-auto no-scrollbar">
                        {[
                            { id: 'total', label: 'Total', icon: '🚀' },
                            { id: 'all', label: 'Todos', icon: '📋' },
                            { id: 'sent', label: 'Enviados', icon: '✅' },
                            { id: 'free', label: 'Gratuita', icon: '🆓' },
                            { id: 'template', label: 'Template', icon: '📝' },
                            { id: 'delivered', label: 'Interações', icon: '📬' },
                            { id: 'read', label: 'Viram', icon: '👀' },
                            { id: 'interaction', label: 'Interagiram', icon: '👆' },
                            { id: 'blocked', label: 'Bloquearam', icon: '🚫' },
                            { id: 'failed', label: 'Falharam', icon: '❌' },
                        ].map(tab => {
                            const count = contactsModal.counts?.[tab.id] || 0;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => { setContactsFilter(tab.id); setPage(1); }}
                                    className={`pb-2 px-3 text-sm font-medium border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
                                        contactsFilter === tab.id
                                            ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                                            : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                                    }`}
                                >
                                    <span>{tab.icon}</span>
                                    <span>{tab.label}</span>
                                    {count > 0 && (
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${contactsFilter === tab.id ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700' : 'bg-gray-100 dark:bg-gray-700 text-gray-500'}`}>
                                            {count}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                )}

                {/* Lista */}
                <div className="p-0 overflow-y-auto flex-1 bg-gray-50 dark:bg-gray-900/30 min-h-[300px]">
                    {loadingContacts ? (
                        <div className="flex items-center justify-center h-full">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                        </div>
                    ) : (
                        <>
                            {contactsModal.contacts.length > 0 && (
                                <div className="p-3 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center sticky top-0 z-20 shadow-sm">
                                    <label className="flex items-center gap-3 cursor-pointer select-none">
                                        <input
                                            type="checkbox"
                                            className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500/20 w-4 h-4 bg-transparent transition-all"
                                            checked={displayContacts.length > 0 && displayContacts.every(c => selectedPhones.includes(getContactPhone(c)))}
                                            onChange={toggleSelectAll}
                                        />
                                        <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            Selecionar Todos ({displayContacts.length})
                                        </span>
                                    </label>
                                    {selectedPhones.length > 0 && (
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => setIsTagModalOpen(true)}
                                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-black uppercase tracking-widest transition-all active:scale-95 flex items-center gap-1.5 shadow-md shadow-emerald-950/20"
                                            >
                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                                    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
                                                    <line x1="7" y1="7" x2="7.01" y2="7"/>
                                                </svg>
                                                Etiquetar ({selectedPhones.length})
                                            </button>
                                            {contactsFilter === 'failed' && (
                                                <>
                                                    <button
                                                        onClick={() => setIsConfirmRestOpen(true)}
                                                        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-black uppercase tracking-widest transition-all active:scale-95 flex items-center gap-1.5 shadow-md shadow-amber-950/20"
                                                        id="contacts-bulk-rest-button"
                                                    >
                                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                                            <circle cx="12" cy="12" r="10" />
                                                            <polyline points="12 6 12 12 16 14" />
                                                        </svg>
                                                        Repousar ({selectedPhones.length})
                                                    </button>
                                                    <button
                                                        onClick={() => setIsConfirmBlockOpen(true)}
                                                        className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-black uppercase tracking-widest transition-all active:scale-95 flex items-center gap-1.5 shadow-md shadow-rose-950/20"
                                                    >
                                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                                            <circle cx="12" cy="12" r="10" />
                                                            <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                                                        </svg>
                                                        Bloquear ({selectedPhones.length})
                                                    </button>
                                                    <button
                                                        onClick={() => setIsBulkSendModalOpen(true)}
                                                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-black uppercase tracking-widest transition-all active:scale-95 flex items-center gap-1.5 shadow-md shadow-blue-950/20"
                                                        id="contacts-bulk-send-button"
                                                    >
                                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                                            <polyline points="22 2 15 22 11 13 2 9 22 2" />
                                                            <line x1="22" y1="2" x2="11" y2="13" />
                                                        </svg>
                                                        Disparar ({selectedPhones.length})
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="divide-y divide-gray-100 dark:divide-gray-700">
                                {displayContacts.map((contact, i) => (
                                    <div key={i} className="p-3 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750 transition flex justify-between items-center group">
                                        <div className="flex items-center gap-4">
                                            <input
                                                type="checkbox"
                                                className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500/20 w-4 h-4 bg-transparent transition-all cursor-pointer mr-1"
                                                checked={isSelected(contact)}
                                                onChange={() => toggleSelectOne(contact)}
                                            />
                                            {/* Ícone de status */}
                                            <div className="w-10 flex flex-col items-center justify-center">
                                                {contact.status === 'read' ? (
                                                    <div className="flex -space-x-1 text-blue-500" title="Mensagem lida">
                                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                                                    </div>
                                                ) : contact.status === 'delivered' ? (
                                                    <div className="flex -space-x-1 text-gray-400" title="Mensagem entregue">
                                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                                                    </div>
                                                ) : contact.status === 'sent' ? (
                                                    <div className="text-gray-400" title="Mensagem enviada">
                                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                                                    </div>
                                                ) : contact.status === 'failed' ? (
                                                    <div className="text-red-500" title="Falha no envio">
                                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                                                    </div>
                                                ) : contact.failure_reason === 'BLOCKED_VIA_BUTTON' ? (
                                                    <div className="text-orange-500" title="Bloqueado pelo usuário">
                                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
                                                    </div>
                                                ) : (
                                                    <div className="w-2 h-2 rounded-full bg-gray-300" />
                                                )}
                                            </div>

                                            {/* Info do contato */}
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <div className="text-sm font-black text-gray-900 dark:text-white font-mono">
                                                        {contact.phone_number || contact.phone || 'Desconhecido'}
                                                    </div>
                                                    {contact.lead_tags && (
                                                        <div className="flex flex-wrap gap-1">
                                                            {contact.lead_tags.split(',').map(t => t.trim()).filter(Boolean).map((t, tagIdx) => (
                                                                <span key={tagIdx} className="text-[9px] font-black uppercase tracking-tighter bg-emerald-500/10 text-emerald-500 px-1.5 py-0.5 rounded border border-emerald-500/20">
                                                                    {t}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                    {contactsModal.isTemplate && (
                                                        (contact.meta_price_brl !== undefined && contact.meta_price_brl !== null ? contact.meta_price_brl > 0 : !['FREE_MESSAGE', 'DIRECT_MESSAGE'].includes(contact.message_type)) ? (
                                                            <span className="text-[9px] font-black uppercase tracking-tighter bg-orange-500/10 text-orange-500 px-1.5 py-0.5 rounded border border-orange-500/20">Template Pago</span>
                                                        ) : (
                                                            <span className="text-[9px] font-black uppercase tracking-tighter bg-cyan-500/10 text-cyan-500 px-1.5 py-0.5 rounded border border-cyan-500/20">Template Grátis</span>
                                                        )
                                                    )}
                                                </div>

                                                {/* Data individual no horário de Brasília */}
                                                <div className="flex items-center gap-2 mt-1.5">
                                                    <div className="text-[10px] text-gray-400 font-medium">
                                                        {formatBRDate(contact.updated_at || contact.timestamp)}
                                                    </div>
                                                    {contact.is_interaction && (
                                                        <span className="text-[9px] font-black uppercase tracking-tighter text-purple-500 bg-purple-500/10 px-1.5 py-0.5 rounded border border-purple-500/20">
                                                            Interagiu {contact.interaction_details ? `(${contact.interaction_details})` : ''}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <div className="text-right">
                                                {contact.failure_reason && (() => {
                                                    const expKey = getExplanationKey(contact.failure_reason);
                                                    return (
                                                        <div className="flex items-center justify-end gap-1">
                                                            <div className="text-xs text-red-500 font-bold max-w-[150px] truncate" title={contact.failure_reason}>
                                                                {contact.failure_reason === 'BLOCKED_VIA_BUTTON' ? 'BLOQUEOU O BOT' : contact.failure_reason}
                                                            </div>
                                                            {expKey && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setExplainError(contact.failure_reason)}
                                                                    className="p-0.5 text-blue-500 hover:text-blue-650 hover:bg-blue-500/10 dark:hover:bg-blue-500/5 rounded transition-all shrink-0"
                                                                    title="Explicar erro"
                                                                >
                                                                    <FiAlertCircle className="w-3.5 h-3.5" />
                                                                </button>
                                                            )}
                                                        </div>
                                                    );
                                                })()}
                                                {contact.memory_webhook_status && (
                                                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 mt-1.5">
                                                        <FiCpu size={12} className={contact.memory_webhook_status === 'sent' || contact.memory_webhook_status === 'success' ? 'text-emerald-500 animate-pulse' : contact.memory_webhook_status === 'failed' ? 'text-red-500' : 'text-gray-400'} />
                                                        <span className={`text-[9px] font-black uppercase tracking-tighter ${contact.memory_webhook_status === 'sent' || contact.memory_webhook_status === 'success' ? 'text-emerald-600' : contact.memory_webhook_status === 'failed' ? 'text-red-600' : 'text-gray-500'}`}>Memória</span>
                                                    </div>
                                                )}
                                                {contact.private_note_posted && (
                                                    <div className="flex items-center justify-center gap-1.5 px-2 py-0.5 rounded-lg bg-pink-500/10 border border-pink-500/20 mt-1">
                                                        <span className="text-[9px] font-black uppercase tracking-tighter text-pink-500">Nota Privada</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {contactsModal.contacts.length === 0 && (
                                    <div className="flex flex-col items-center justify-center h-40 text-gray-400">
                                        <p className="text-sm">Nenhum contato encontrado neste filtro.</p>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>

                {/* Barra de Paginação */}
                {totalCount > 0 && (
                    <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-900/40 flex items-center justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium whitespace-nowrap">Itens por página:</span>
                            <select
                                id="contacts-per-page"
                                value={perPage}
                                onChange={(e) => setPerPage(Number(e.target.value))}
                                className="text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1 outline-none font-bold text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-blue-500/20 transition-all cursor-pointer"
                            >
                                <option value={20}>20</option>
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                                <option value={500}>500</option>
                                <option value={totalCount}>Todos ({totalCount})</option>
                            </select>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                                {((currentPage - 1) * perPage) + 1}–{Math.min(currentPage * perPage, totalCount)} de {totalCount}
                            </span>
                            <button
                                id="contacts-prev-page"
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={currentPage <= 1}
                                className="px-2 py-1 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all text-xs font-bold flex items-center gap-1"
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6"/></svg>
                                Ant.
                            </button>
                            <span className="text-xs font-bold text-gray-700 dark:text-gray-200 min-w-[60px] text-center">
                                Pág. {currentPage}/{totalPages}
                            </span>
                            <button
                                id="contacts-next-page"
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage >= totalPages}
                                className="px-2 py-1 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all text-xs font-bold flex items-center gap-1"
                            >
                                Próx.
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6"/></svg>
                            </button>
                        </div>
                    </div>
                )}

                {/* Footer */}
                <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 flex justify-end gap-3 z-10">
                    <button
                        onClick={() => {
                            if (!contactsModal.contacts || contactsModal.contacts.length === 0) {
                                toast.error('A lista está vazia. Nenhum contato para copiar.');
                                return;
                            }
                            const text = contactsModal.contacts.map(c => c.phone_number || c.phone).join('\n');
                            navigator.clipboard.writeText(text);
                            toast.success('Lista copiada!');
                        }}
                        className="px-4 py-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition font-medium flex items-center gap-2"
                    >
                        Copiar Lista
                    </button>
                    <button
                        onClick={() => setContactsModal({ ...contactsModal, isOpen: false })}
                        className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition font-medium"
                    >
                        Fechar
                    </button>
                </div>
            </div>

            {/* Modal de Confirmação de Repouso */}
            {isConfirmRestOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black bg-opacity-70 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full overflow-hidden p-6 border border-gray-100 dark:border-gray-700">
                        <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                            <span className="text-amber-500">⏰</span> Colocar em Repouso?
                        </h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                            Você tem certeza que deseja colocar os {selectedPhones.length} contatos selecionados em repouso por 24 horas? Eles não receberão disparos de templates até o fim do período ou remoção manual.
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setIsConfirmRestOpen(false)}
                                className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition font-medium"
                                disabled={loadingRest}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleRestSelectedContacts}
                                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg transition font-medium flex items-center gap-2"
                                disabled={loadingRest}
                            >
                                {loadingRest ? (
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                ) : (
                                    'Sim, Repousar'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Confirmação de Bloqueio */}
            {isConfirmBlockOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black bg-opacity-70 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full overflow-hidden p-6 border border-gray-100 dark:border-gray-700">
                        <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                            <span className="text-rose-500">⚠️</span> Bloquear Contatos?
                        </h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                            Você tem certeza que deseja adicionar os {selectedPhones.length} contatos selecionados à lista de bloqueio? Eles não receberão mais nenhuma mensagem automatizada.
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setIsConfirmBlockOpen(false)}
                                className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition font-medium"
                                disabled={loadingBlock}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleBlockSelectedContacts}
                                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg transition font-medium flex items-center gap-2"
                                disabled={loadingBlock}
                            >
                                {loadingBlock ? (
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                ) : (
                                    'Sim, Bloquear'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <TagContactsModal
                isOpen={isTagModalOpen}
                onClose={() => setIsTagModalOpen(false)}
                selectedPhones={selectedPhones}
                contacts={contactsModal.contacts}
                setContactsModal={setContactsModal}
                onClearSelection={() => setSelectedPhones([])}
            />

            <BulkSendContactsModal
                isOpen={isBulkSendModalOpen}
                onClose={() => {
                    setIsBulkSendModalOpen(false);
                    setSelectedPhones([]);
                }}
                selectedPhones={selectedPhones}
                clientId={contactsModal.clientId || activeClient?.id}
                triggerId={contactsModal.triggerId}
                onSuccess={() => {
                    // Fecha o modal de contatos
                    setContactsModal(prev => ({ ...prev, isOpen: false }));
                    
                    // Força atualização da listagem principal do histórico para exibir o disparo em andamento
                    if (onRefresh) onRefresh();
                }}
            />
            {explainError && (() => {
                const expKey = getExplanationKey(explainError);
                const explanation = ERROR_EXPLANATIONS[expKey];
                if (!explanation) return null;
                return createPortal(
                    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 w-screen h-screen">
                        <div className="w-full max-w-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-3xl p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200" style={{ userSelect: 'none', cursor: 'default' }}>
                            <h3 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2 mb-4">
                                <FiAlertCircle className="text-blue-500 w-5 h-5" /> 
                                {explanation.titulo}
                            </h3>
                            
                            <div className="space-y-4">
                                <div>
                                    <span className="text-[10px] font-bold text-gray-400 dark:text-gray-550 uppercase tracking-wider block mb-1">O que é este erro:</span>
                                    <p className="text-xs text-gray-655 dark:text-gray-300 leading-relaxed bg-gray-50 dark:bg-gray-900/50 p-3 rounded-xl border border-gray-150 dark:border-gray-700">
                                        {explanation.descricao}
                                    </p>
                                </div>

                                <div>
                                    <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider block mb-1">O que fazer com os contatos:</span>
                                    <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed bg-amber-500/10 dark:bg-yellow-500/5 p-3 rounded-xl border border-amber-500/20">
                                        {explanation.acao}
                                    </p>
                                </div>
                            </div>

                            <div className="mt-6 flex justify-end">
                                <button
                                    type="button"
                                    onClick={() => setExplainError(null)}
                                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all active:scale-95 shadow-md hover:shadow-blue-500/20"
                                >
                                    Entendido
                                </button>
                            </div>
                        </div>
                    </div>,
                    document.body
                );
            })()}
        </div>
    );
};

export default ContactsModal;
