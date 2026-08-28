import React from 'react';
import { FiTag, FiRefreshCw, FiArchive } from 'react-icons/fi';
import { BsStars } from 'react-icons/bs';
import ChatListFilters from './ChatListFilters';
import ChatListItem from './ChatListItem';

export default function ChatListSidebar({
    activeTab,
    setActiveTab,
    statusFilter,
    setStatusFilter,
    searchQuery,
    setSearchQuery,
    selectedLabelFilter,
    setSelectedLabelFilter,
    activeFilterTab,
    setActiveFilterTab,
    filterWindowOpen,
    setFilterWindowOpen,
    filterTemplate24h,
    setFilterTemplate24h,
    filterUnread,
    setFilterUnread,
    filterHasNote,
    setFilterHasNote,
    filterUrgent,
    setFilterUrgent,
    filterHasReplied,
    setFilterHasReplied,
    filterHasActiveFunnel,
    setFilterHasActiveFunnel,
    filterBlockStatus,
    setFilterBlockStatus,
    filterStartDate,
    setFilterStartDate,
    filterEndDate,
    setFilterEndDate,
    orderBy,
    setOrderBy,
    engine,
    selectedConvo,
    setSelectedConvo,
    selectAllPages,
    setSelectAllPages,
    setIsBulkTagModalOpen,
    isOpenAiConfigured,
    isAnalyzingAi,
    handleAnalyzeBulkChatsDoubts,
    formatTime
}) {
    const visibleConversations = engine.conversations;

    return (
        <div className="w-96 border-r border-gray-200 dark:border-white/5 flex flex-col h-full bg-gray-50/50 dark:bg-[#111827]/40 shrink-0">
            <ChatListFilters
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                statusFilter={statusFilter}
                setStatusFilter={setStatusFilter}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                selectedLabelFilter={selectedLabelFilter}
                setSelectedLabelFilter={setSelectedLabelFilter}
                availableLabels={engine.availableLabels}
                activeFilterTab={activeFilterTab}
                setActiveFilterTab={setActiveFilterTab}
                filterWindowOpen={filterWindowOpen}
                setFilterWindowOpen={setFilterWindowOpen}
                filterTemplate24h={filterTemplate24h}
                setFilterTemplate24h={setFilterTemplate24h}
                filterUnread={filterUnread}
                setFilterUnread={setFilterUnread}
                filterHasNote={filterHasNote}
                setFilterHasNote={setFilterHasNote}
                filterUrgent={filterUrgent}
                setFilterUrgent={setFilterUrgent}
                filterHasReplied={filterHasReplied}
                setFilterHasReplied={setFilterHasReplied}
                filterHasActiveFunnel={filterHasActiveFunnel}
                setFilterHasActiveFunnel={setFilterHasActiveFunnel}
                filterBlockStatus={filterBlockStatus}
                setFilterBlockStatus={setFilterBlockStatus}
                filterStartDate={filterStartDate}
                setFilterStartDate={setFilterStartDate}
                filterEndDate={filterEndDate}
                setFilterEndDate={setFilterEndDate}
                orderBy={orderBy}
                setOrderBy={setOrderBy}
                visibleCount={visibleConversations.length}
            />

            {/* Barra de seleção em massa */}
            {visibleConversations.length > 0 && (
                <div className="px-4 py-2 border-b border-gray-200 dark:border-white/5 flex items-center gap-2 bg-gray-50/30 dark:bg-black/10">
                    <button
                        onClick={() => {
                            const allIds = visibleConversations.map(c => c.id);
                            const allSelected = allIds.every(id => engine.selectedConvoIds.includes(id));
                            if (allSelected) {
                                engine.setSelectedConvoIds(prev => prev.filter(id => !allIds.includes(id)));
                                setSelectAllPages(false);
                            } else {
                                engine.setSelectedConvoIds(prev => [...new Set([...prev, ...allIds])]);
                            }
                        }}
                        className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 font-medium transition-colors"
                    >
                        <input
                            type="checkbox"
                            readOnly
                            checked={visibleConversations.length > 0 && (selectAllPages || visibleConversations.every(c => engine.selectedConvoIds.includes(c.id)))}
                            className="rounded border-gray-300 text-blue-600 pointer-events-none"
                        />
                        Selecionar todas
                    </button>
                    {(selectAllPages || engine.selectedConvoIds.length > 0) && (
                        <div className="ml-auto flex items-center gap-2">
                            <button
                                onClick={() => setIsBulkTagModalOpen(true)}
                                className="flex items-center gap-1 bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 dark:text-blue-400 px-2.5 py-1 rounded-lg text-xs font-semibold transition border border-blue-500/20"
                            >
                                <FiTag size={13} />
                                Etiquetar ({selectAllPages ? engine.totalConvos : engine.selectedConvoIds.length})
                            </button>
                            <button
                                onClick={() => {
                                    const willArchive = statusFilter !== 'archived';
                                    const payloadExtra = selectAllPages ? {
                                        select_all_pages: true,
                                        tab: activeTab,
                                        status: statusFilter,
                                        search: searchQuery || undefined,
                                        label: selectedLabelFilter || undefined,
                                        block_status: filterBlockStatus || undefined,
                                        has_note: filterHasNote || undefined,
                                        start_date: filterStartDate || undefined,
                                        end_date: filterEndDate || undefined,
                                        unread_only: filterUnread || undefined,
                                        window_open_only: filterWindowOpen || undefined,
                                        has_replied: filterHasReplied || undefined
                                    } : {
                                        ids: engine.selectedConvoIds
                                    };
                                    engine.handleBulkArchive(willArchive, payloadExtra);
                                }}
                                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition border ${
                                    statusFilter === 'archived'
                                        ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 dark:text-emerald-400 border-emerald-500/20'
                                        : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 dark:text-amber-400 border-amber-500/20'
                                }`}
                                title={statusFilter === 'archived' ? "Desarquivar conversas selecionadas" : "Arquivar conversas selecionadas"}
                            >
                                <FiArchive size={13} />
                                {statusFilter === 'archived'
                                    ? `Desarquivar (${selectAllPages ? engine.totalConvos : engine.selectedConvoIds.length})`
                                    : `Arquivar (${selectAllPages ? engine.totalConvos : engine.selectedConvoIds.length})`}
                            </button>
                            <button
                                onClick={() => engine.setConfirmDeleteConvos('bulk')}
                                className="flex items-center gap-1 bg-red-500/10 hover:bg-red-500/20 text-red-500 dark:text-red-400 px-2.5 py-1 rounded-lg text-xs font-semibold transition border border-red-500/20"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                Deletar ({selectAllPages ? engine.totalConvos : engine.selectedConvoIds.length})
                            </button>
                            {isOpenAiConfigured && (
                                <button
                                    onClick={handleAnalyzeBulkChatsDoubts}
                                    disabled={isAnalyzingAi}
                                    className="flex items-center gap-1 bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-300 px-2.5 py-1 rounded-lg text-xs font-semibold transition border border-purple-500/20 disabled:opacity-50"
                                    title="Analisar dúvidas não respondidas das conversas selecionadas com IA"
                                >
                                    {isAnalyzingAi ? <FiRefreshCw className="animate-spin" size={13} /> : <BsStars size={13} />}
                                    <span>Analisar Dúvidas (IA)</span>
                                </button>
                            )}
                        </div>
                    )}
                </div>
            )}

            {visibleConversations.length > 0 && (selectAllPages || visibleConversations.every(c => engine.selectedConvoIds.includes(c.id))) && engine.totalConvos > visibleConversations.length && (
                <div className="px-4 py-2 border-b border-blue-500/20 bg-blue-500/10 dark:bg-blue-500/5 text-xs text-gray-700 dark:text-gray-300 flex items-center justify-between shrink-0">
                    {selectAllPages ? (
                        <span>Todos os <strong>{engine.totalConvos}</strong> contatos de todas as páginas estão selecionados.</span>
                    ) : (
                        <span>Todos os <strong>{visibleConversations.length}</strong> contatos desta página estão selecionados.</span>
                    )}
                    <button
                        onClick={() => {
                            if (selectAllPages) {
                                engine.setSelectedConvoIds([]);
                                setSelectAllPages(false);
                            } else {
                                setSelectAllPages(true);
                            }
                        }}
                        className="text-blue-500 hover:text-blue-600 font-semibold transition"
                    >
                        {selectAllPages ? `Deselecionar todos os ${engine.totalConvos} contatos` : `Selecionar todos os ${engine.totalConvos} contatos`}
                    </button>
                </div>
            )}

            {/* Lista com scroll */}
            <div className="relative flex-1 overflow-y-auto divide-y divide-gray-100 dark:divide-white/5">
                {engine.isLoadingConvos && (
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px] z-20 flex flex-col items-center justify-center gap-3 transition-opacity">
                        <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
                        <span className="text-xs font-semibold text-white bg-slate-800/90 px-3.5 py-1.5 rounded-xl border border-slate-700/60 shadow-xl">
                            Filtrando conversas...
                        </span>
                    </div>
                )}
                {visibleConversations.map(convo => {
                    const isSelected = selectedConvo?.id === convo.id;
                    const isChecked = selectAllPages || engine.selectedConvoIds.includes(convo.id);

                    return (
                        <ChatListItem
                            key={convo.id}
                            convo={convo}
                            isSelected={isSelected}
                            isChecked={isChecked}
                            onSelect={() => setSelectedConvo(convo)}
                            onToggleCheck={(e) => {
                                e.stopPropagation();
                                if (selectAllPages) {
                                    setSelectAllPages(false);
                                    const pageIdsExceptThis = visibleConversations.map(c => c.id).filter(id => id !== convo.id);
                                    engine.setSelectedConvoIds(pageIdsExceptThis);
                                } else {
                                    engine.setSelectedConvoIds(prev => isChecked ? prev.filter(id => id !== convo.id) : [...prev, convo.id]);
                                }
                            }}
                            onDelete={(id) => {
                                engine.setDeletingConvoId(id);
                                engine.setConfirmDeleteConvos('single');
                            }}
                            onArchive={(id, willArchive) => engine.handleToggleArchive(id, willArchive)}
                            getLabelColor={engine.getLabelColor}
                            formatTime={formatTime}
                        />
                    );
                })}
            </div>

            {/* Paginação */}
            <div className="px-4 py-3 border-t border-gray-200 dark:border-white/5 flex items-center justify-between bg-gray-50/50 dark:bg-black/10 text-xs text-gray-500 dark:text-gray-400 shrink-0 select-none">
                <div className="flex items-center gap-1.5">
                    <span>Exibir:</span>
                    <select
                        value={engine.limit}
                        onChange={(e) => {
                            engine.setLimit(Number(e.target.value));
                            engine.setPage(1);
                        }}
                        className="bg-white dark:bg-slate-800 border border-gray-300 dark:border-white/10 rounded px-1.5 py-0.5 text-xs text-gray-700 dark:text-gray-200 outline-none focus:border-blue-500"
                    >
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                        <option value={200}>200</option>
                    </select>
                </div>
                
                <div className="flex items-center gap-2">
                    <button
                        disabled={engine.page <= 1}
                        onClick={() => engine.setPage(prev => Math.max(prev - 1, 1))}
                        className="p-1.5 rounded-lg border border-gray-300 dark:border-white/10 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-white/5 transition"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
                    </button>
                    
                    <span className="font-medium">
                        {engine.page} / {Math.ceil(engine.totalConvos / engine.limit) || 1}
                    </span>
                    
                    <button
                        disabled={engine.page >= Math.ceil(engine.totalConvos / engine.limit)}
                        onClick={() => engine.setPage(prev => prev + 1)}
                        className="p-1.5 rounded-lg border border-gray-300 dark:border-white/10 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-white/5 transition"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
                    </button>
                </div>
            </div>
        </div>
    );
}
