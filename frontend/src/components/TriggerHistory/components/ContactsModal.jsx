import React from 'react';
import { toast } from 'react-hot-toast';
import TagContactsModal from './TagContactsModal';
import BulkSendContactsModal from './BulkSendContactsModal';
import ConfirmationDialog from './ConfirmationDialog';
import ExplainErrorDialog from './ExplainErrorDialog';
import ContactRow from './ContactRow';
import { useContactsModalLogic } from '../hooks/useContactsModalLogic';
import { formatDddOption, formatDdiOption } from '../../../utils/dddInfo';

// Mini modal multi-select de etiquetas do Chatwoot
// Mini modal multi-select de etiquetas do Atendimento Local (Chat)
function ChatwootLabelModal({ isOpen, onClose, onConfirm, loading, count, clientId }) {
    const [selected, setSelected] = React.useState([]);
    const [labels, setLabels] = React.useState([]);
    const [fetchingLabels, setFetchingLabels] = React.useState(false);
    const [search, setSearch] = React.useState('');

    React.useEffect(() => {
        if (!isOpen) { setSelected([]); setSearch(''); return; }
        setFetchingLabels(true);
        import('../../../config').then(({ API_URL }) => {
            import('../../../AuthContext').then(({ fetchWithAuth }) => {
                fetchWithAuth(`${API_URL}/chat/labels`, {}, clientId)
                    .then(r => r.ok ? r.json() : [])
                    .then(data => {
                        // O backend retorna uma lista de strings. Mapeamos para o formato esperado.
                        const items = Array.isArray(data) ? data.map(str => ({ title: str, name: str, color: '#6366f1' })) : [];
                        setLabels(items);
                    })
                    .catch(() => setLabels([]))
                    .finally(() => setFetchingLabels(false));
            });
        });
    }, [isOpen, clientId]);

    if (!isOpen) return null;

    const filtered = labels.filter(l => {
        const title = l.title || l.name || '';
        return title.toLowerCase().includes(search.toLowerCase());
    });

    const toggle = (title) => {
        setSelected(prev => prev.includes(title) ? prev.filter(t => t !== title) : [...prev, title]);
    };

    const handleConfirm = () => {
        if (selected.length > 0) onConfirm(selected);
    };

    const hasExactMatch = labels.some(l => (l.title || '').toLowerCase() === search.trim().toLowerCase());

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black bg-opacity-60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm flex flex-col max-h-[90vh] border border-gray-100 dark:border-white/5 animate-in zoom-in-95 duration-200 overflow-hidden">
                {/* Header */}
                <div className="p-5 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
                    <div className="flex items-center gap-3">
                        <span className="text-2xl">🏷️</span>
                        <div>
                            <h3 className="font-bold text-gray-800 dark:text-white text-base">Etiquetar Atendimento</h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                {count > 0 ? `${count} contato(s) selecionado(s)` : 'Todos os contatos do disparo'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Search */}
                <div className="px-5 pt-4 pb-2">
                    <input
                        autoFocus
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Buscar ou criar etiqueta..."
                        className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all"
                    />
                </div>

                {/* Selected chips */}
                {selected.length > 0 && (
                    <div className="px-5 pb-2 flex flex-wrap gap-1.5 max-h-20 overflow-y-auto custom-scrollbar">
                        {selected.map(s => (
                            <span key={s} className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 rounded-full text-[10px] font-extrabold uppercase tracking-wider">
                                {s}
                                <button type="button" onClick={() => toggle(s)} className="hover:text-indigo-900 dark:hover:text-white ml-1 leading-none text-xs">×</button>
                            </span>
                        ))}
                    </div>
                )}

                {/* Label list */}
                <div className="overflow-y-auto flex-1 px-5 pb-2 custom-scrollbar" style={{ minHeight: 80, maxHeight: 260 }}>
                    {/* Botão de Criar nova etiqueta */}
                    {search.trim() !== '' && !hasExactMatch && (
                        <button
                            type="button"
                            onClick={() => {
                                const newLabelStr = search.trim();
                                setLabels(prev => [{ title: newLabelStr, name: newLabelStr, color: '#6366f1' }, ...prev]);
                                toggle(newLabelStr);
                                setSearch('');
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/20 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 border border-dashed border-indigo-300/50 dark:border-indigo-500/20 font-bold mb-2 transition-all justify-center"
                        >
                            <span>➕ Criar etiqueta "{search.trim()}"</span>
                        </button>
                    )}

                    {fetchingLabels ? (
                        <div className="flex items-center justify-center py-8">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-500"></div>
                        </div>
                    ) : filtered.length === 0 && search.trim() === '' ? (
                        <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-6">
                            Nenhuma etiqueta cadastrada. Digite acima para criar.
                        </p>
                    ) : (
                        <div className="space-y-1">
                            {filtered.map(l => {
                                const title = l.title || l.name || '';
                                const color = l.color || '#6366f1';
                                const isChecked = selected.includes(title);
                                return (
                                    <button
                                        key={title}
                                        type="button"
                                        onClick={() => toggle(title)}
                                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                                            isChecked
                                                ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                                                : 'hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-300'
                                        }`}
                                    >
                                        <span className="w-2.5 h-2.5 rounded-full shrink-0 border-2" style={{ backgroundColor: isChecked ? color : 'transparent', borderColor: color }}></span>
                                        <span className="flex-1 text-left font-medium truncate">{title}</span>
                                        {isChecked && (
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-indigo-600 dark:text-indigo-400 shrink-0">
                                                <polyline points="20 6 9 17 4 12"/>
                                            </svg>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-5 border-t border-gray-100 dark:border-gray-700 flex gap-2 justify-between items-center bg-gray-50/30 dark:bg-gray-800/30">
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                        {selected.length > 0 ? `${selected.length} selecionada(s)` : 'Nenhuma selecionada'}
                    </span>
                    <div className="flex gap-2">
                        <button type="button" onClick={() => { setSelected([]); onClose(); }}
                            className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-gray-200 dark:hover:bg-gray-600 transition-all">
                            Cancelar
                        </button>
                        <button type="button" onClick={handleConfirm} disabled={selected.length === 0 || loading}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all disabled:opacity-50 flex items-center gap-1.5 shadow-md shadow-indigo-950/20 active:scale-95">
                            {loading
                                ? <><div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white"></div> Aplicando...</>
                                : 'Aplicar'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

const ContactsModal = ({
    contactsModal, setContactsModal, contactsFilter, setContactsFilter,
    contactsTypeFilter, setContactsTypeFilter, contactsErrorFilter, setContactsErrorFilter,
    loadingContacts, contactsPage, setContactsPage, contactsPerPage, setContactsPerPage, contactsTotal,
    activeClient, onRefresh,
    contactsSearchPhone, setContactsSearchPhone,
    contactsFilterDdi, setContactsFilterDdi,
    contactsFilterDdd, setContactsFilterDdd,
    contactsDdiOptions = [], contactsDddOptions = []
}) => {
    const {
        selectedPhones,
        setSelectedPhones,
        markContactsResolved,
        explainError,
        setExplainError,
        isTagModalOpen,
        setIsTagModalOpen,
        isConfirmBlockOpen,
        setIsConfirmBlockOpen,
        isBulkSendModalOpen,
        setIsBulkSendModalOpen,
        isChatwootLabelModalOpen,
        setIsChatwootLabelModalOpen,
        loadingBlock,
        loadingAllTarget,
        taggingAll,
        sendingAll,
        chatwootLabeling,
        handleApplyChatwootLabel,
        currentPage,
        perPage,
        setPage,
        setPerPage,
        totalCount,
        totalPages,
        displayContacts,
        isConfirmRestOpen,
        setIsConfirmRestOpen,
        restingHours,
        setRestingHours,
        loadingRest,
        handleOpenTagModal,
        handleOpenBulkSendModal,
        handleBlockSelectedContacts,
        handleRestSelectedContacts,
        isSelected,
        toggleSelectOne,
        toggleSelectAll,
        handleSelectAllTarget,
        getAllTargetContacts,
        getContactPhone
    } = useContactsModalLogic({
        contactsModal, setContactsModal, contactsFilter, setContactsFilter,
        contactsTypeFilter, setContactsTypeFilter, contactsErrorFilter, setContactsErrorFilter,
        loadingContacts, contactsPage, setContactsPage, contactsPerPage, setContactsPerPage, contactsTotal,
        activeClient, onRefresh,
        contactsSearchPhone, setContactsSearchPhone,
        contactsFilterDdi, setContactsFilterDdi,
        contactsFilterDdd, setContactsFilterDdd
    });

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
                        {((contactsFilter === 'failed' || contactsFilter === 'blocked') && (contactsModal.failureReasons || []).length > 0) && (
                            <select
                                id="contacts-error-filter"
                                value={contactsErrorFilter}
                                onChange={(e) => { setContactsErrorFilter(e.target.value); setPage(1); }}
                                className="text-[10px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1.5 outline-none font-black uppercase tracking-widest text-gray-700 dark:text-gray-300 shadow-sm focus:ring-2 focus:ring-blue-500/20 transition-all max-w-[200px] truncate"
                            >
                                <option value="all">
                                    {contactsFilter === 'blocked' ? '🚫 Todos os Bloqueios' : '⚠️ Todos os Erros'}
                                </option>
                                {(contactsModal.failureReasons || []).map((reason, idx) => (
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
                
                {/* Barra de Filtros Adicionais (Telefone, DDI, DDD) */}
                <div className="px-4 py-3 bg-gray-50/50 dark:bg-gray-900/20 border-b border-gray-100 dark:border-gray-700 flex flex-wrap gap-2.5 items-center">
                    <div className="flex-1 min-w-[200px] relative">
                        <input 
                            type="text" 
                            value={contactsSearchPhone || ''} 
                            onChange={e => { setContactsSearchPhone(e.target.value); setPage(1); }} 
                            placeholder="Buscar por número..."
                            className="w-full pl-3 pr-8 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg text-xs text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/20 transition-all placeholder:text-gray-400"
                        />
                        {contactsSearchPhone && (
                            <button 
                                onClick={() => { setContactsSearchPhone(''); setPage(1); }}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xs"
                            >
                                ×
                            </button>
                        )}
                    </div>
                    
                    <div className="w-[140px] relative">
                        <select
                            value={contactsFilterDdi || ''}
                            onChange={e => { setContactsFilterDdi(e.target.value); setPage(1); }}
                            className="w-full px-2 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg text-xs text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/20 transition-all cursor-pointer disabled:opacity-50"
                            disabled={(contactsDdiOptions || []).length === 0}
                        >
                            <option value="">Todos DDIs</option>
                            {(contactsDdiOptions || []).map(ddi => (
                                <option key={ddi} value={ddi}>{formatDdiOption(ddi)}</option>
                            ))}
                        </select>
                    </div>

                    <div className="w-[140px] relative">
                        {/* Dropdown de DDD gerado dinamicamente: só mostra os códigos que
                            realmente existem entre os contatos deste filtro — nunca a lista
                            fixa de todos os DDDs do Brasil. */}
                        <select
                            value={contactsFilterDdd || ''}
                            onChange={e => { setContactsFilterDdd(e.target.value); setPage(1); }}
                            className="w-full px-2 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg text-xs text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/20 transition-all cursor-pointer disabled:opacity-50"
                            disabled={(contactsDddOptions || []).length === 0}
                        >
                            <option value="">Todos DDDs</option>
                            {(contactsDddOptions || []).map(ddd => (
                                <option key={ddd} value={ddd}>{formatDddOption(ddd)}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Corpo do Modal condicional baseado no estado de loading */}
                {loadingContacts ? (
                    <div className="flex-1 bg-gray-50 dark:bg-gray-900/30 flex items-center justify-center min-h-[350px]">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
                    </div>
                ) : (
                    <>
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
                            {(contactsModal.contacts || []).length > 0 && (
                                <div className="p-3 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 flex flex-col gap-2 sticky top-0 z-20 shadow-sm">
                                    <div className="flex justify-between items-center">
                                        <label className="flex items-center gap-3 cursor-pointer select-none">
                                            <input
                                                type="checkbox"
                                                className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500/20 w-4 h-4 bg-transparent transition-all"
                                                checked={(() => {
                                                    const selectable = (displayContacts || []).filter(c => !c?.failure_resolution);
                                                    return selectable.length > 0 && (selectedPhones.length >= totalCount || selectable.every(c => selectedPhones.includes(getContactPhone(c))));
                                                })()}
                                                onChange={toggleSelectAll}
                                            />
                                            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                {selectedPhones.length >= totalCount && totalCount > 0
                                                    ? `Todos os ${totalCount} Selecionados`
                                                    : `Selecionar Página (${(displayContacts || []).length})`}
                                            </span>
                                        </label>
                                        
                                        {totalCount > (displayContacts || []).length && (
                                            <button
                                                type="button"
                                                onClick={handleSelectAllTarget}
                                                disabled={loadingAllTarget}
                                                className="px-2.5 py-1 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-800/40 text-blue-600 dark:text-blue-400 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 disabled:opacity-50 border border-blue-200/50 dark:border-blue-700/50 flex items-center gap-1"
                                            >
                                                {loadingAllTarget ? 'Carregando...' : selectedPhones.length >= totalCount ? `Desmarcar ${totalCount}` : `✨ Selecionar todos ${totalCount}`}
                                            </button>
                                        )}
                                    </div>

                                    <div className="flex flex-col gap-1.5">
                                        {/* Linha 1: Etiqueta Chat + Etiquetar + Disparar */}
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => setIsChatwootLabelModalOpen(true)}
                                                disabled={chatwootLabeling || loadingAllTarget}
                                                className="flex-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-black uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-1.5 shadow-md shadow-indigo-950/20 disabled:opacity-50"
                                            >
                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                                    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
                                                    <line x1="7" y1="7" x2="7.01" y2="7"/>
                                                </svg>
                                                {selectedPhones.length > 0 ? `Etiqueta Chat (${selectedPhones.length})` : `Etiqueta Chat (${totalCount})`}
                                            </button>
                                            <button
                                                onClick={handleOpenTagModal}
                                                disabled={taggingAll || loadingAllTarget}
                                                className="flex-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-black uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-1.5 shadow-md shadow-emerald-950/20 disabled:opacity-50"
                                            >
                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                                    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
                                                    <line x1="7" y1="7" x2="7.01" y2="7"/>
                                                </svg>
                                                {selectedPhones.length > 0 ? `Etiquetar (${selectedPhones.length})` : `Etiquetar Todos (${totalCount})`}
                                            </button>
                                            {contactsFilter === 'failed' && (
                                                <button
                                                    onClick={handleOpenBulkSendModal}
                                                    disabled={sendingAll || loadingAllTarget}
                                                    className="flex-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-black uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-1.5 shadow-md shadow-blue-950/20 disabled:opacity-50"
                                                    id="contacts-bulk-send-button"
                                                >
                                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                                        <polyline points="22 2 15 22 11 13 2 9 22 2" />
                                                        <line x1="22" y1="2" x2="11" y2="13" />
                                                    </svg>
                                                    {selectedPhones.length > 0 ? `Disparar (${selectedPhones.length})` : `Disparar Todos (${totalCount})`}
                                                </button>
                                            )}
                                        </div>
                                        {/* Linha 2: Repousar + Bloquear (só em falhas) */}
                                        {contactsFilter === 'failed' && (
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => setIsConfirmRestOpen(true)}
                                                    disabled={loadingRest || loadingAllTarget}
                                                    className="flex-1 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-black uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-1.5 shadow-md shadow-amber-950/20 disabled:opacity-50"
                                                    id="contacts-bulk-rest-button"
                                                >
                                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                                        <circle cx="12" cy="12" r="10" />
                                                        <polyline points="12 6 12 12 16 14" />
                                                    </svg>
                                                    {selectedPhones.length > 0 ? `Repousar (${selectedPhones.length})` : `Repousar Todos (${totalCount})`}
                                                </button>
                                                <button
                                                    onClick={() => setIsConfirmBlockOpen(true)}
                                                    disabled={loadingBlock || loadingAllTarget}
                                                    className="flex-1 px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-black uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-1.5 shadow-md shadow-rose-950/20 disabled:opacity-50"
                                                >
                                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                                        <circle cx="12" cy="12" r="10" />
                                                        <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                                                    </svg>
                                                    {selectedPhones.length > 0 ? `Bloquear (${selectedPhones.length})` : `Bloquear Todos (${totalCount})`}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            <div className="divide-y divide-gray-100 dark:divide-gray-700">
                                {(displayContacts || []).map((contact, i) => (
                                    <ContactRow
                                        key={i}
                                        contact={contact}
                                        isSelected={isSelected(contact)}
                                        onToggleSelect={() => toggleSelectOne(contact)}
                                        isTemplate={contactsModal.isTemplate}
                                        onExplainError={setExplainError}
                                    />
                                ))}

                                {(contactsModal.contacts || []).length === 0 && (
                                    <div className="flex flex-col items-center justify-center p-8 my-6 text-center max-w-lg mx-auto rounded-2xl bg-amber-500/5 dark:bg-amber-500/10 border border-amber-200/60 dark:border-amber-500/30 shadow-lg shadow-amber-500/5 animate-in fade-in zoom-in-95 duration-200">
                                        <div className="py-6 text-center text-gray-400 dark:text-gray-500">
                                            <p className="text-sm font-medium">Nenhum contato encontrado neste filtro.</p>
                                        </div>
                                    </div>
                                )}
                            </div>
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
                                        <option value={1000}>1000</option>
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
                    </>
                )}
                {/* Footer */}
                <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 flex justify-end gap-3 z-10">
                    <button
                        onClick={async () => {
                            let phonesToCopy = [];
                            let copyToast = null;
                            try {
                                if (selectedPhones.length > 0) {
                                    phonesToCopy = selectedPhones;
                                } else {
                                    copyToast = toast.loading(`Buscando todos os ${totalCount} contatos de todas as páginas...`);
                                    const allContacts = await getAllTargetContacts();
                                    phonesToCopy = (allContacts || []).map(getContactPhone).filter(Boolean);
                                }

                                if (phonesToCopy.length === 0) {
                                    if (copyToast) toast.dismiss(copyToast);
                                    toast.error('Nenhum contato disponível para copiar.');
                                    return;
                                }

                                const text = phonesToCopy.join('\n');
                                try {
                                    await navigator.clipboard.writeText(text);
                                } catch (e) {
                                    const textarea = document.createElement('textarea');
                                    textarea.value = text;
                                    document.body.appendChild(textarea);
                                    textarea.select();
                                    document.execCommand('copy');
                                    document.body.removeChild(textarea);
                                }

                                const count = phonesToCopy.length;
                                const msg = count === 1 ? '1 contato copiado para a área de transferência!' : `${count} contatos copiados para a área de transferência!`;
                                if (copyToast) toast.dismiss(copyToast);
                                toast.success(msg);
                            } catch (err) {
                                console.error('Erro ao copiar contatos:', err);
                                if (copyToast) toast.dismiss(copyToast);
                                toast.error('Erro ao copiar contatos.');
                            }
                        }}
                        className="px-4 py-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition font-medium flex items-center gap-2"
                    >
                        {selectedPhones.length > 0 ? `Copiar Selecionados (${selectedPhones.length})` : totalCount > 0 ? `Copiar Lista (${totalCount})` : 'Copiar Lista'}
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
            <ConfirmationDialog
                isOpen={isConfirmRestOpen}
                onClose={() => setIsConfirmRestOpen(false)}
                onConfirm={() => handleRestSelectedContacts(restingHours)}
                title="Colocar em Repouso?"
                message={`Você tem certeza que deseja colocar os ${selectedPhones.length > 0 ? selectedPhones.length : totalCount} contatos selecionados em repouso por ${restingHours} horas? Eles não receberão disparos de templates até o fim do período ou remoção manual.`}
                confirmText="Sim, Repousar"
                confirmColorClass="bg-amber-600 hover:bg-amber-500 focus:ring-amber-500/20"
                icon="⏰"
                loading={loadingRest}
                showSelect={true}
                selectLabel="Tempo de Repouso:"
                selectValue={restingHours}
                onSelectChange={setRestingHours}
                selectOptions={[
                    { value: 24, label: '24 horas (1 dia) — Padrão' },
                    { value: 48, label: '48 horas (2 dias)' },
                    { value: 72, label: '72 horas (3 dias)' },
                    { value: 96, label: '96 horas (4 dias)' }
                ]}
            />

            {/* Modal de Confirmação de Bloqueio */}
            <ConfirmationDialog
                isOpen={isConfirmBlockOpen}
                onClose={() => setIsConfirmBlockOpen(false)}
                onConfirm={handleBlockSelectedContacts}
                title="Bloquear Contatos?"
                message={`Você tem certeza que deseja adicionar os ${selectedPhones.length} contatos selecionados à lista de bloqueio? Eles não receberão mais nenhuma mensagem automatizada.`}
                confirmText="Sim, Bloquear"
                confirmColorClass="bg-rose-600 hover:bg-rose-500 focus:ring-rose-500/20"
                icon="⚠️"
                loading={loadingBlock}
            />

            <ChatwootLabelModal
                isOpen={isChatwootLabelModalOpen}
                onClose={() => setIsChatwootLabelModalOpen(false)}
                onConfirm={handleApplyChatwootLabel}
                loading={chatwootLabeling}
                count={selectedPhones.length}
                clientId={contactsModal.clientId || activeClient?.id}
            />

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
                    // Não fecha mais o modal nem remove os contatos da lista — eles continuam
                    // visíveis no relatório de falhas, só que travados (disparo já feito de novo).
                    markContactsResolved(selectedPhones, 'resent');
                    setSelectedPhones([]);
                    setIsBulkSendModalOpen(false);
                    if (onRefresh) onRefresh();
                }}
            />

            {/* Portal de Detalhes do Erro */}
            <ExplainErrorDialog
                errorReason={explainError}
                onClose={() => setExplainError(null)}
            />
        </div>
    );
};

export default ContactsModal;
