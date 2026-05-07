
import React, { useMemo } from 'react';
import Filters from './Filters';
import LeadSyncPanel from './LeadSyncPanel';
import ContactTable from './ContactTable';

const ContactList = ({
    title,
    contacts,
    setContacts,
    searchTerm,
    setSearchTerm,
    dddSearch,
    setDddSearch,
    filterOpenOnly,
    setFilterOpenOnly,
    filterBlockedOnly,
    setFilterBlockedOnly,
    blockedCount,
    addBrazilCode,
    copyToClipboard,
    clearAll,
    saveLeadsTags,
    setSaveLeadsTags,
    isSaveTagsDropdownOpen,
    setIsSaveTagsDropdownOpen,
    saveTagsSearch,
    setSaveTagsSearch,
    availableTags,
    handleSaveToLeads,
    isSavingLeads,
    selectedList,
    displayedContacts,
    filteredContacts,
    displayLimit,
    setDisplayLimit,
    templateVariables,
    showValidation,
    removeContact,
    startValidation,
    isValidating,
    progress
}) => {
    const activeVarColumns = useMemo(() => {
        if (!templateVariables || templateVariables.length === 0) return [];
        return templateVariables.filter(v =>
            contacts.some(c => c.vars && c.vars[v.key] !== undefined && c.vars[v.key] !== '')
        );
    }, [contacts, templateVariables]);

    const hasStatus = contacts.some(c => c.status !== 'pending');

    return (
        <div className="space-y-5 animate-in fade-in slide-in-from-top-4 duration-500">
            {/* Warning Banner for Blocked Contacts */}
            {contacts.some(c => c.is_blocked) && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex items-center gap-3 animate-in zoom-in-95 duration-300">
                    <div className="p-2 bg-red-500/20 text-red-400 rounded-lg">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10" /><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" /></svg>
                    </div>
                    <div className="flex-1">
                        <div className="text-xs font-black text-red-400 uppercase tracking-widest">Contatos Bloqueados Detectados</div>
                        <div className="text-[10px] text-red-300/60 font-medium">Existem {blockedCount} contatos nesta lista que estão na sua lista de bloqueio global e serão ignorados pelo disparo.</div>
                    </div>
                    <button
                        onClick={() => setFilterBlockedOnly(!filterBlockedOnly)}
                        className="text-[10px] font-black text-red-400 hover:text-red-300 underline uppercase tracking-widest transition-colors"
                    >
                        {filterBlockedOnly ? 'Ver Todos' : 'Ver Bloqueados'}
                    </button>
                </div>
            )}

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-2">
                <div className="flex items-center gap-4 flex-wrap">
                    <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em]">{title}</h3>
                    <span className="bg-slate-800 text-white text-[10px] px-2.5 py-1 rounded-lg font-black">{contacts.length}</span>
                    {contacts.length > 0 && (
                        <>
                            <button
                                onClick={() => setContacts(prev => [...prev].reverse())}
                                title="Inverter a ordem da lista (últimos viram primeiros)"
                                className="flex items-center gap-2 px-3 py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-xl border border-blue-500/20 text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-blue-900/5 group"
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="group-hover:rotate-180 transition-transform duration-300"><path d="M7 16V4m0 0L3 8m4-4l4 4"/><path d="M17 8v12m0 0l4-4m-4 4l-4-4"/></svg>
                                Inverter Ordem
                            </button>
                            <button
                                onClick={clearAll}
                                className="flex items-center gap-2 px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl border border-red-500/20 text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-red-900/5 group"
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="group-hover:rotate-12 transition-transform"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                Limpar Lista
                            </button>
                        </>
                    )}
                </div>

                <Filters 
                    searchTerm={searchTerm}
                    setSearchTerm={setSearchTerm}
                    dddSearch={dddSearch}
                    setDddSearch={setDddSearch}
                    filterOpenOnly={filterOpenOnly}
                    setFilterOpenOnly={setFilterOpenOnly}
                    filterBlockedOnly={filterBlockedOnly}
                    setFilterBlockedOnly={setFilterBlockedOnly}
                    blockedCount={blockedCount}
                    hasStatus={hasStatus}
                    addBrazilCode={addBrazilCode}
                    copyToClipboard={copyToClipboard}
                />
            </div>

            <LeadSyncPanel 
                saveLeadsTags={saveLeadsTags}
                setSaveLeadsTags={setSaveLeadsTags}
                isSaveTagsDropdownOpen={isSaveTagsDropdownOpen}
                setIsSaveTagsDropdownOpen={setIsSaveTagsDropdownOpen}
                saveTagsSearch={saveTagsSearch}
                setSaveTagsSearch={setSaveTagsSearch}
                availableTags={availableTags}
                handleSaveToLeads={handleSaveToLeads}
                isSavingLeads={isSavingLeads}
                selectedListCount={selectedList.length}
            />

            <ContactTable 
                displayedContacts={displayedContacts}
                activeVarColumns={activeVarColumns}
                showValidation={showValidation}
                removeContact={removeContact}
                displayLimit={displayLimit}
                setDisplayLimit={setDisplayLimit}
                filteredContactsCount={filteredContacts.length}
            />

            <button
                onClick={startValidation}
                disabled={isValidating || contacts.length === 0}
                className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-blue-900/20 active:scale-95 disabled:opacity-30 flex items-center justify-center gap-3"
            >
                {isValidating ? (
                    <>
                        <span className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                        VALIDANDO ({progress.current}/{progress.total})
                    </>
                ) : (
                    <>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        VALIDAR CANAIS & JANELAS
                    </>
                )}
            </button>
        </div>
    );
};

export default ContactList;
