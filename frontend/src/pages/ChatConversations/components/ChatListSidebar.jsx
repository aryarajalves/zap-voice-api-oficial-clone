import React, { useState } from 'react';
import { FiTag, FiRefreshCw, FiArchive, FiZap } from 'react-icons/fi';
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
    filterLastMessageRead,
    setFilterLastMessageRead,
    filterLastMessageUnread,
    setFilterLastMessageUnread,
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
    excludedConvoIds = [],
    setExcludedConvoIds,
    setIsBulkTagModalOpen,
    isOpenAiConfigured,
    isAnalyzingAi,
    handleAnalyzeBulkChatsDoubts,
    formatTime
}) {
    const [isLabelFilterOpen, setIsLabelFilterOpen] = useState(false);
    const visibleConversations = engine.conversations;
    const totalSelectedCount = selectAllPages
        ? Math.max(0, engine.totalConvos - excludedConvoIds.length)
        : engine.selectedConvoIds.length;

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
                onLabelDropdownOpenChange={setIsLabelFilterOpen}
                availableLabels={engine.availableLabels}
                availableLabelsDetails={engine.availableLabelsDetails}
                getLabelColor={engine.getLabelColor}
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
                filterLastMessageRead={filterLastMessageRead}
                setFilterLastMessageRead={setFilterLastMessageRead}
                filterLastMessageUnread={filterLastMessageUnread}
                setFilterLastMessageUnread={setFilterLastMessageUnread}
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
                <div className="px-4 py-2 border-b border-gray-200 dark:border-white/5 bg-gray-50/50 dark:bg-black/20 transition-all">
                    <div className="flex items-center justify-between gap-2">
                        <button
                            onClick={() => {
                                const allIds = visibleConversations.map(c => c.id);
                                if (selectAllPages) {
                                    const allVisibleSelected = allIds.every(id => !excludedConvoIds.includes(id));
                                    if (allVisibleSelected) {
                                        setExcludedConvoIds(prev => [...new Set([...prev, ...allIds])]);
                                    } else {
                                        setExcludedConvoIds(prev => prev.filter(id => !allIds.includes(id)));
                                    }
                                } else {
                                    const allSelected = allIds.every(id => engine.selectedConvoIds.includes(id));
                                    if (allSelected) {
                                        engine.setSelectedConvoIds(prev => prev.filter(id => !allIds.includes(id)));
                                        setSelectAllPages(false);
                                    } else {
                                        engine.setSelectedConvoIds(prev => [...new Set([...prev, ...allIds])]);
                                    }
                                }
                            }}
                            className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 font-medium transition-colors cursor-pointer shrink-0"
                        >
                            <input
                                type="checkbox"
                                readOnly
                                checked={visibleConversations.length > 0 && (
                                    selectAllPages
                                        ? visibleConversations.every(c => !excludedConvoIds.includes(c.id))
                                        : visibleConversations.every(c => engine.selectedConvoIds.includes(c.id))
                                )}
                                className="rounded border-gray-300 text-blue-600 pointer-events-none cursor-pointer"
                            />
                            <span>Selecionar todas</span>
                        </button>

                        {(selectAllPages ? totalSelectedCount > 0 : engine.selectedConvoIds.length > 0) && (
                            <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-500/10 dark:bg-blue-500/20 px-2 py-0.5 rounded-full border border-blue-500/20 shrink-0">
                                {selectAllPages ? `${totalSelectedCount} selecionados` : `${engine.selectedConvoIds.length} selecionado(s)`}
                            </span>
                        )}
                    </div>

                    {(selectAllPages ? totalSelectedCount > 0 : engine.selectedConvoIds.length > 0) && (
                        <div className="flex items-center gap-1 mt-2 overflow-x-auto no-scrollbar py-0.5">
                            <button
                                id="bulk-tag-btn"
                                onClick={() => setIsBulkTagModalOpen(true)}
                                className="flex items-center gap-1 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 px-2 py-1.5 rounded-lg text-xs font-semibold transition border border-blue-500/20 shrink-0 whitespace-nowrap cursor-pointer shadow-sm"
                                title="Etiquetar conversas selecionadas"
                            >
                                <FiTag size={13} />
                                <span>Etiquetar</span>
                            </button>

                            <button
                                id="bulk-funnel-btn"
                                onClick={() => engine.setIsBulkFunnelModalOpen(true)}
                                className="flex items-center gap-1 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 px-2 py-1.5 rounded-lg text-xs font-semibold transition border border-indigo-500/20 shrink-0 whitespace-nowrap cursor-pointer shadow-sm"
                                title="Disparar funil para conversas selecionadas"
                            >
                                <FiZap size={13} />
                                <span>Funil</span>
                            </button>

                            <button
                                id="bulk-archive-btn"
                                onClick={async () => {
                                    const willArchive = statusFilter !== 'archived';
                                    const inc = selectedLabelFilter?.include_labels || (selectedLabelFilter?.items?.filter(i => i.mode === 'has').map(i => i.name)) || [];
                                    const exc = selectedLabelFilter?.exclude_labels || (selectedLabelFilter?.items?.filter(i => i.mode === 'has_not').map(i => i.name)) || [];

                                    const labelPayload = typeof selectedLabelFilter === 'string'
                                        ? { label: selectedLabelFilter || undefined }
                                        : (inc.length > 0 || exc.length > 0 ? {
                                            include_labels: inc.length > 0 ? inc : undefined,
                                            exclude_labels: exc.length > 0 ? exc : undefined,
                                            label_op: selectedLabelFilter?.op || 'or'
                                        } : (selectedLabelFilter?.labels?.length > 0 ? {
                                            labels: selectedLabelFilter.labels,
                                            label_mode: selectedLabelFilter.mode || 'has',
                                            label_op: selectedLabelFilter.op || 'or'
                                        } : {}));
                                     const payloadExtra = selectAllPages ? {
                                        select_all_pages: true,
                                        excluded_ids: excludedConvoIds.length > 0 ? excludedConvoIds : undefined,
                                        tab: activeTab,
                                        status: statusFilter,
                                        search: searchQuery || undefined,
                                        ...labelPayload,
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
                                    await engine.handleBulkArchive(willArchive, payloadExtra);
                                    if (selectAllPages) {
                                        engine.setSelectedConvoIds([]);
                                        setSelectAllPages(false);
                                        setExcludedConvoIds([]);
                                    }
                                }}
                                className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold transition border shrink-0 whitespace-nowrap cursor-pointer shadow-sm ${
                                    statusFilter === 'archived'
                                        ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                                        : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/20'
                                }`}
                                title={statusFilter === 'archived' ? "Desarquivar conversas selecionadas" : "Arquivar conversas selecionadas"}
                            >
                                <FiArchive size={13} />
                                <span>{statusFilter === 'archived' ? 'Desarquivar' : 'Arquivar'}</span>
                            </button>

                            <button
                                id="bulk-delete-btn"
                                onClick={() => engine.setConfirmDeleteConvos('bulk')}
                                className="flex items-center gap-1 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 px-2 py-1.5 rounded-lg text-xs font-semibold transition border border-red-500/20 shrink-0 whitespace-nowrap cursor-pointer shadow-sm"
                                title="Deletar conversas selecionadas"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                <span>Deletar</span>
                            </button>

                            {isOpenAiConfigured && (
                                <button
                                    id="bulk-ai-doubts-btn"
                                    onClick={handleAnalyzeBulkChatsDoubts}
                                    disabled={isAnalyzingAi}
                                    className="flex items-center gap-1 bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-300 px-2 py-1.5 rounded-lg text-xs font-semibold transition border border-purple-500/20 shrink-0 whitespace-nowrap cursor-pointer shadow-sm disabled:opacity-50"
                                    title="Analisar dúvidas não respondidas das conversas selecionadas com IA"
                                >
                                    {isAnalyzingAi ? <FiRefreshCw className="animate-spin" size={13} /> : <BsStars size={13} />}
                                    <span>Dúvidas IA</span>
                                </button>
                            )}
                        </div>
                    )}
                </div>
            )}

            {visibleConversations.length > 0 && (
                (selectAllPages && totalSelectedCount > 0) ||
                visibleConversations.every(c => engine.selectedConvoIds.includes(c.id))
            ) && engine.totalConvos > visibleConversations.length && (
                <div className="px-4 py-2 border-b border-blue-500/20 bg-blue-500/10 dark:bg-blue-500/5 text-xs text-gray-700 dark:text-gray-300 flex items-center justify-between shrink-0">
                    {selectAllPages ? (
                        <span>
                            {excludedConvoIds.length > 0 ? (
                                <>Todos os contatos de todas as páginas estão selecionados (<strong>{totalSelectedCount}</strong> contatos, <strong>{excludedConvoIds.length}</strong> desmarcado{excludedConvoIds.length > 1 ? 's' : ''}).</>
                            ) : (
                                <>Todos os <strong>{engine.totalConvos}</strong> contatos de todas as páginas estão selecionados.</>
                            )}
                        </span>
                    ) : (
                        <span>Todos os <strong>{visibleConversations.length}</strong> contatos desta página estão selecionados.</span>
                    )}
                    <button
                        onClick={() => {
                            if (selectAllPages) {
                                engine.setSelectedConvoIds([]);
                                setSelectAllPages(false);
                                if (setExcludedConvoIds) setExcludedConvoIds([]);
                            } else {
                                setSelectAllPages(true);
                                if (setExcludedConvoIds) setExcludedConvoIds([]);
                            }
                        }}
                        className="text-blue-500 hover:text-blue-600 font-semibold transition cursor-pointer"
                    >
                        {selectAllPages ? `Deselecionar todos os ${engine.totalConvos} contatos` : `Selecionar todos os ${engine.totalConvos} contatos`}
                    </button>
                </div>
            )}

            {/* Lista com scroll - quando o filtro de marcadores estiver aberto, o scroll é ocultado e desativado */}
            <div
                id="chat-conversations-list-scroll-container"
                className={`relative flex-1 divide-y divide-gray-100 dark:divide-white/5 ${
                    isLabelFilterOpen
                        ? 'overflow-hidden pointer-events-none select-none'
                        : 'overflow-y-auto custom-scrollbar'
                }`}
            >
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
                    const isChecked = selectAllPages
                        ? !excludedConvoIds.includes(convo.id)
                        : engine.selectedConvoIds.includes(convo.id);

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
                                    if (isChecked) {
                                        setExcludedConvoIds(prev => [...new Set([...prev, convo.id])]);
                                    } else {
                                        setExcludedConvoIds(prev => prev.filter(id => id !== convo.id));
                                    }
                                } else {
                                    engine.setSelectedConvoIds(prev => isChecked ? prev.filter(id => id !== convo.id) : [...prev, convo.id]);
                                }
                            }}
                            onDelete={(id) => {
                                engine.setDeletingConvoId(id);
                                engine.setConfirmDeleteConvos('single');
                            }}
                            onArchive={(id, willArchive) => engine.handleToggleArchive(id, willArchive)}
                            onTag={(c) => {
                                engine.setSelectedConvoIds([c.id]);
                                setIsBulkTagModalOpen(true);
                            }}
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
