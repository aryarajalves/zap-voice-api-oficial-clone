import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { FiX, FiSearch, FiSend, FiCheck, FiRefreshCw, FiUser, FiShare2 } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { API_URL } from '../../../config';
import { fetchWithAuth } from '../../../AuthContext';
import { getFirstName } from '../../../utils/nameFormatter';

/**
 * Modal para compartilhar o contato atual com outras conversas/contatos (vCard nativo WhatsApp).
 * Permite buscar por nome, número ou username, selecionar um ou múltiplos destinatários e disparar.
 */
export default function ShareContactModal({
    isOpen,
    onClose,
    contactToShare,
    conversations = [],
    activeClientId,
    onSuccess
}) {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedContacts, setSelectedContacts] = useState([]); // Array de itens { id, phone, name, conversation_id }
    const [remoteContacts, setRemoteContacts] = useState([]);
    const [isLoadingContacts, setIsLoadingContacts] = useState(false);
    const [isSending, setIsSending] = useState(false);

    // Carregar contatos da API do cliente ao abrir ou buscar
    React.useEffect(() => {
        if (!isOpen) return;

        let isMounted = true;
        const loadContacts = async () => {
            setIsLoadingContacts(true);
            try {
                const queryParam = searchQuery.trim() ? `&search=${encodeURIComponent(searchQuery.trim())}` : '';
                const res = await fetchWithAuth(`${API_URL}/chat/mention-contacts?page=1&limit=50${queryParam}`, {}, activeClientId);
                if (res.ok && isMounted) {
                    const data = await res.json();
                    setRemoteContacts(data.contacts || []);
                }
            } catch (e) {
                console.error('Erro ao carregar contatos para compartilhamento:', e);
            } finally {
                if (isMounted) setIsLoadingContacts(false);
            }
        };

        const debounceTimer = setTimeout(loadContacts, 200);
        return () => {
            isMounted = false;
            clearTimeout(debounceTimer);
        };
    }, [isOpen, searchQuery, activeClientId]);

    // Mesclar conversas e contatos remotos desduplicados
    const allAvailableContacts = useMemo(() => {
        const list = [];
        const seenPhones = new Set();

        const cleanSharePhone = String(contactToShare?.phone || '').replace(/\D/g, '');

        // 1. Conversas locais
        (conversations || []).forEach(c => {
            const p = String(c.phone || '').replace(/\D/g, '');
            if (!p || p === cleanSharePhone) return;
            seenPhones.add(p);
            list.push({
                id: `convo_${c.id}`,
                conversation_id: c.id,
                name: c.contact_name || c.phone,
                phone: c.phone
            });
        });

        // 2. Contatos remotos
        (remoteContacts || []).forEach(rc => {
            const p = String(rc.phone || '').replace(/\D/g, '');
            if (!p || p === cleanSharePhone || seenPhones.has(p)) return;
            seenPhones.add(p);
            list.push({
                id: rc.conversation_id ? `convo_${rc.conversation_id}` : `phone_${p}`,
                conversation_id: rc.conversation_id || null,
                name: rc.name || rc.phone,
                phone: rc.phone
            });
        });

        const q = searchQuery.toLowerCase().trim();
        if (!q) return list;
        return list.filter(item =>
            (item.name || '').toLowerCase().includes(q) || (item.phone || '').toLowerCase().includes(q)
        );
    }, [conversations, remoteContacts, contactToShare, searchQuery]);

    if (!isOpen || !contactToShare) return null;

    const isContactSelected = (item) => {
        return selectedContacts.some(sc => sc.id === item.id || (sc.phone && sc.phone === item.phone));
    };

    const toggleSelectContact = (item) => {
        setSelectedContacts(prev =>
            isContactSelected(item)
                ? prev.filter(sc => sc.id !== item.id && sc.phone !== item.phone)
                : [...prev, item]
        );
    };

    const handleSelectAll = () => {
        if (selectedContacts.length === allAvailableContacts.length) {
            setSelectedContacts([]);
        } else {
            setSelectedContacts([...allAvailableContacts]);
        }
    };

    const handleSend = async () => {
        if (selectedContacts.length === 0) {
            toast.error('Selecione pelo menos um contato de destino.');
            return;
        }

        setIsSending(true);
        const toastId = toast.loading('Compartilhando contato...');

        try {
            const targetConvoIds = selectedContacts.filter(sc => sc.conversation_id).map(sc => sc.conversation_id);
            const targetContacts = selectedContacts.filter(sc => !sc.conversation_id).map(sc => ({
                phone: sc.phone,
                name: sc.name
            }));

            const payload = {
                target_conversation_ids: targetConvoIds,
                target_contacts: targetContacts,
                contact_name: contactToShare.contact_name || contactToShare.phone || 'Contato',
                contact_phone: contactToShare.phone,
                contact_id: contactToShare.id
            };

            const res = await fetchWithAuth(`${API_URL}/chat/conversations/share-contact`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            }, activeClientId);

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.detail || 'Erro ao compartilhar contato.');
            }

            const data = await res.json();
            toast.success(`Contato compartilhado com sucesso para ${data.sent_count} conversa(s)!`, { id: toastId });
            
            if (onSuccess) {
                onSuccess(data);
            }
            setSelectedContacts([]);
            onClose();
        } catch (err) {
            toast.error(err.message || 'Erro ao compartilhar contato.', { id: toastId });
        } finally {
            setIsSending(false);
        }
    };

    const highlightMatch = (text, query) => {
        if (!query || !text) return text;
        const parts = text.split(new RegExp(`(${query})`, 'gi'));
        return parts.map((part, index) =>
            part.toLowerCase() === query.toLowerCase() ? (
                <mark key={index} className="bg-emerald-500/30 text-emerald-300 font-semibold px-0.5 rounded">
                    {part}
                </mark>
            ) : (
                part
            )
        );
    };

    return createPortal(
        <div 
            className="fixed inset-0 z-[999999] w-screen h-screen flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200"
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, width: '100vw', height: '100vh', margin: 0, padding: '1rem' }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="share-contact-title"
        >
            <div className="w-full max-w-md bg-[#111827] dark:bg-[#0f172a] text-gray-100 rounded-2xl shadow-2xl border border-white/10 flex flex-col max-h-[85vh] overflow-hidden relative z-10">
                {/* Header */}
                <div className="p-4 border-b border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSending}
                            className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition cursor-pointer disabled:opacity-50"
                            title="Fechar"
                        >
                            <FiX size={18} />
                        </button>
                        <h3 id="share-contact-title" className="text-base font-bold text-white flex items-center gap-2">
                            <FiShare2 className="text-emerald-400" size={16} />
                            <span>Enviar contatos</span>
                        </h3>
                    </div>
                    {allAvailableContacts.length > 0 && (
                        <button
                            type="button"
                            onClick={handleSelectAll}
                            className="text-xs text-blue-400 hover:text-blue-300 font-medium cursor-pointer"
                        >
                            {selectedContacts.length === allAvailableContacts.length ? 'Desmarcar todos' : 'Selecionar todos'}
                        </button>
                    )}
                </div>

                {/* Info do Contato Compartilhado */}
                <div className="px-4 py-2 bg-emerald-500/10 border-b border-emerald-500/20 flex items-center gap-2.5 text-xs text-emerald-300">
                    <div className="w-7 h-7 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-sm">
                        {getFirstName(contactToShare.contact_name || contactToShare.phone || 'C')[0]}
                    </div>
                    <div className="overflow-hidden flex-1">
                        <p className="font-semibold truncate text-white">
                            {contactToShare.contact_name || 'Contato'}
                        </p>
                        <p className="text-[11px] text-emerald-400/80 font-mono">
                            {contactToShare.phone}
                        </p>
                    </div>
                </div>

                {/* Campo de Busca */}
                <div className="p-3 border-b border-white/10 bg-white/5">
                    <div className="relative flex items-center">
                        <FiSearch className="absolute left-3 text-gray-400" size={16} />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Pesquisar nome, número ou @nomedeusuário"
                            className="w-full pl-9 pr-8 py-2 bg-black/40 text-sm text-gray-100 rounded-xl border border-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 placeholder-gray-500 transition-all font-sans"
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={() => setSearchQuery('')}
                                className="absolute right-2.5 p-1 text-gray-400 hover:text-white rounded-md cursor-pointer"
                            >
                                <FiX size={14} />
                            </button>
                        )}
                    </div>
                </div>

                {/* Lista de Conversas Recentes */}
                <div className="flex-1 overflow-y-auto p-2 space-y-1 divide-y divide-white/5">
                    <div className="px-3 py-1.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider flex items-center justify-between">
                        <span>Conversas recentes ({allAvailableContacts.length})</span>
                        {isLoadingContacts && <FiRefreshCw className="animate-spin text-gray-400" size={12} />}
                    </div>

                    {allAvailableContacts.length === 0 ? (
                        <div className="py-12 text-center text-gray-400 text-sm flex flex-col items-center gap-2">
                            <FiUser className="text-gray-600" size={32} />
                            <span>Nenhum contato encontrado para a pesquisa.</span>
                        </div>
                    ) : (
                        allAvailableContacts.map((item) => {
                            const isSelected = isContactSelected(item);
                            return (
                                <div
                                    key={item.id}
                                    onClick={() => toggleSelectContact(item)}
                                    className={`flex items-center gap-3 p-2.5 rounded-xl transition-all cursor-pointer select-none ${
                                        isSelected
                                            ? 'bg-blue-600/20 border border-blue-500/30'
                                            : 'hover:bg-white/5 border border-transparent'
                                    }`}
                                >
                                    {/* Checkbox */}
                                    <div
                                        className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all shrink-0 ${
                                            isSelected
                                                ? 'bg-emerald-500 border-emerald-500 text-white'
                                                : 'border-gray-500 bg-transparent'
                                        }`}
                                    >
                                        {isSelected && <FiCheck size={13} className="stroke-[3]" />}
                                    </div>

                                    {/* Avatar */}
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow">
                                        {getFirstName(item.name || item.phone || 'C')[0]}
                                    </div>

                                    {/* Detalhes */}
                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-xs font-semibold text-gray-100 truncate">
                                            {highlightMatch(item.name || item.phone, searchQuery)}
                                        </h4>
                                        <p className="text-[11px] text-gray-400 font-mono truncate">
                                            {highlightMatch(item.phone, searchQuery)}
                                        </p>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Footer com Botão de Envio */}
                <div className="p-4 border-t border-white/10 bg-black/30 flex items-center justify-between gap-3">
                    <span className="text-xs text-gray-400">
                        {selectedContacts.length > 0
                            ? `${selectedContacts.length} destinatário(s) selecionado(s)`
                            : 'Selecione os contatos de destino'}
                    </span>

                    <button
                        type="button"
                        onClick={handleSend}
                        disabled={selectedContacts.length === 0 || isSending}
                        className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-lg cursor-pointer disabled:opacity-40 disabled:pointer-events-none disabled:cursor-not-allowed"
                    >
                        {isSending ? (
                            <>
                                <FiRefreshCw className="animate-spin" size={15} />
                                <span>Enviando...</span>
                            </>
                        ) : (
                            <>
                                <FiSend size={15} />
                                <span>Enviar contato</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
