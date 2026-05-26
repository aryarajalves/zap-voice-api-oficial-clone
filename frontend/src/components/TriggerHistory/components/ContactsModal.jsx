import React from 'react';
import { toast } from 'react-hot-toast';
import { FiCpu } from 'react-icons/fi';
import TagContactsModal from './TagContactsModal';

const ContactsModal = ({ 
    contactsModal, setContactsModal, contactsFilter, setContactsFilter, 
    contactsTypeFilter, setContactsTypeFilter, loadingContacts 
}) => {
    const [selectedPhones, setSelectedPhones] = React.useState([]);
    const [isTagModalOpen, setIsTagModalOpen] = React.useState(false);

    React.useEffect(() => {
        setSelectedPhones([]);
    }, [contactsModal.isOpen, contactsFilter, contactsTypeFilter]);

    const getContactPhone = (contact) => {
        return contact.phone_number || contact.phone || '';
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
        const visiblePhones = contactsModal.contacts
            .map(getContactPhone)
            .filter(Boolean);
            
        const allSelected = visiblePhones.length > 0 && visiblePhones.every(phone => selectedPhones.includes(phone));
        
        if (allSelected) {
            setSelectedPhones(prev => prev.filter(p => !visiblePhones.includes(p)));
        } else {
            setSelectedPhones(prev => {
                const newSelected = [...prev];
                visiblePhones.forEach(phone => {
                    if (!newSelected.includes(phone)) {
                        newSelected.push(phone);
                    }
                });
                return newSelected;
            });
        }
    };

    if (!contactsModal.isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm animated-fade-in">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[85vh]" style={{ userSelect: 'none', cursor: 'default' }}>
                <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50">
                    <div className="flex items-center gap-4">
                        <h3 className="font-bold text-gray-800 dark:text-white text-lg">{contactsModal.title}</h3>
                        {contactsModal.isTemplate && (
                            <select
                                value={contactsTypeFilter}
                                onChange={(e) => setContactsTypeFilter(e.target.value)}
                                className="text-[10px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1.5 outline-none font-black uppercase tracking-widest text-gray-700 dark:text-gray-300 shadow-sm focus:ring-2 focus:ring-blue-500/20 transition-all"
                            >
                                <option value="all">✨ Todos os Tipos</option>
                                <option value="template">💳 Pagos (Template)</option>
                                <option value="free">🆓 Gratuitos (Livre)</option>
                            </select>
                        )}
                    </div>
                    <button onClick={() => { setContactsModal({ ...contactsModal, isOpen: false }); setContactsTypeFilter('all'); }} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

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
                                    onClick={() => setContactsFilter(tab.id)}
                                    className={`pb-2 px-3 text-sm font-medium border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${contactsFilter === tab.id
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
                                            checked={contactsModal.contacts.length > 0 && contactsModal.contacts.every(c => selectedPhones.includes(getContactPhone(c)))}
                                            onChange={toggleSelectAll}
                                        />
                                        <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            Selecionar Todos ({contactsModal.contacts.length})
                                        </span>
                                    </label>
                                    {selectedPhones.length > 0 && (
                                        <button
                                            onClick={() => setIsTagModalOpen(true)}
                                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-black uppercase tracking-widest transition-all active:scale-95 flex items-center gap-1.5 shadow-md shadow-emerald-950/20 animate-in fade-in zoom-in-95 duration-200"
                                        >
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
                                            Etiquetar ({selectedPhones.length})
                                        </button>
                                    )}
                                </div>
                            )}
                            <div className="divide-y divide-gray-100 dark:divide-gray-700">
                                {contactsModal.contacts.map((contact, i) => (
                                    <div key={i} className="p-3 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750 transition flex justify-between items-center group">
                                        <div className="flex items-center gap-4">
                                            <input
                                                type="checkbox"
                                                className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500/20 w-4 h-4 bg-transparent transition-all cursor-pointer mr-1"
                                                checked={isSelected(contact)}
                                                onChange={() => toggleSelectOne(contact)}
                                            />
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
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <div className="text-sm font-black text-gray-900 dark:text-white font-mono">
                                                            {contact.phone_number || contact.phone || 'Desconhecido'}
                                                        </div>
                                                        {contact.lead_tags && (
                                                            <div className="flex flex-wrap gap-1">
                                                                {contact.lead_tags.split(',').map(t => t.trim()).filter(Boolean).map((t, tagIdx) => (
                                                                    <span 
                                                                        key={tagIdx} 
                                                                        className="text-[9px] font-black uppercase tracking-tighter bg-emerald-500/10 text-emerald-500 px-1.5 py-0.5 rounded border border-emerald-500/20"
                                                                    >
                                                                        {t}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                    {['FREE_MESSAGE', 'DIRECT_MESSAGE'].includes(contact.message_type) ? (
                                                        <span className="text-[9px] font-black uppercase tracking-tighter bg-cyan-500/10 text-cyan-500 px-1.5 py-0.5 rounded border border-cyan-500/20">Template Grátis</span>
                                                    ) : (
                                                        <span className="text-[9px] font-black uppercase tracking-tighter bg-orange-500/10 text-orange-500 px-1.5 py-0.5 rounded border border-orange-500/20">Template Pago</span>
                                                    )}
                                                </div>
                                                

                                                <div className="flex items-center gap-2 mt-1.5">
                                                    <div className="text-[10px] text-gray-400 font-medium">
                                                        {new Date(contact.updated_at || contact.timestamp).toLocaleString('pt-BR')}
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
                                                {contact.status === 'sent' && !contact.failure_reason && (
                                                    <div className="text-[10px] text-blue-400 font-black uppercase tracking-widest animate-pulse">Aguardando...</div>
                                                )}
                                                {contact.failure_reason && (
                                                    <div className="text-xs text-red-500 font-bold max-w-[150px] truncate" title={contact.failure_reason}>
                                                        {contact.failure_reason === 'BLOCKED_VIA_BUTTON' ? 'BLOQUEOU O BOT' : contact.failure_reason}
                                                    </div>
                                                )}
                                                {contact.memory_webhook_status && (
                                                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 mt-1.5 relative cursor-help group/memory">
                                                        <FiCpu size={12} className={contact.memory_webhook_status === 'sent' || contact.memory_webhook_status === 'success' ? 'text-emerald-500 animate-pulse' : contact.memory_webhook_status === 'failed' ? 'text-red-500' : 'text-gray-400'} />
                                                        <span className={`text-[9px] font-black uppercase tracking-tighter ${contact.memory_webhook_status === 'sent' || contact.memory_webhook_status === 'success' ? 'text-emerald-600' : contact.memory_webhook_status === 'failed' ? 'text-red-600' : 'text-gray-500'}`}>Memória</span>
                                                    </div>
                                                )}
                                                {contact.private_note_posted && (
                                                    <div className="flex items-center justify-center gap-1.5 px-2 py-0.5 rounded-lg bg-pink-500/10 border border-pink-500/20 mt-1 cursor-help">
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
                <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 flex justify-end gap-3 z-10">
                    <button onClick={() => {
                        const text = contactsModal.contacts.map(c => c.phone_number || c.phone).join('\n');
                        navigator.clipboard.writeText(text);
                        toast.success('Lista copiada!');
                    }} className="px-4 py-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition font-medium flex items-center gap-2">Copiar Lista</button>
                    <button onClick={() => setContactsModal({ ...contactsModal, isOpen: false })} className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition font-medium">Fechar</button>
                </div>
            </div>

            <TagContactsModal
                isOpen={isTagModalOpen}
                onClose={() => setIsTagModalOpen(false)}
                selectedPhones={selectedPhones}
                contacts={contactsModal.contacts}
                setContactsModal={setContactsModal}
                onClearSelection={() => setSelectedPhones([])}
            />
        </div>
    );
};

export default ContactsModal;
