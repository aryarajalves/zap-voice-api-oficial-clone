import React from 'react';
import ConfirmModal from '../components/ConfirmModal';
import {
    useHumanAgents,
    getWaitingTime,
    HumanAgentCard,
    HumanAgentsBulkBar,
    HumanAgentsHeader,
    HumanAgentsSearch,
    HumanAgentsPagination,
    HumanAgentsEmptyState
} from './HumanAgents/index';

export default function HumanAgents({ onNavigateToChat }) {
    const {
        conversations,
        total,
        page,
        setPage,
        limit,
        setLimit,
        loading,
        searchQuery,
        setSearchQuery,
        selectedIds,
        isAllPagesSelected,
        isProcessing,
        confirmModal,
        setConfirmModal,
        loadHumanConversations,
        handleFinishHandover,
        handleDeleteConversations,
        handleFinishBulk,
        handleToggleSelect,
        handleToggleSelectAll,
        handleSelectAllPages,
        handleClearSelection,
        filteredConversations,
        allFilteredSelected,
        totalPages
    } = useHumanAgents();

    const isFilaVaziaOuSemResultados = filteredConversations.length === 0;

    return (
        <div className="space-y-6">
            {/* Header com seleção de limite e refresh */}
            <HumanAgentsHeader
                limit={limit}
                setLimit={setLimit}
                setPage={setPage}
                loading={loading}
                onRefresh={loadHumanConversations}
            />

            {/* Filtro de Busca */}
            <HumanAgentsSearch
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
            />

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

            {/* Estado de Carregamento ou Fila Vazia */}
            {isFilaVaziaOuSemResultados ? (
                <HumanAgentsEmptyState
                    loading={loading}
                    hasConversations={conversations.length > 0}
                />
            ) : (
                <div className="space-y-6">
                    {/* Grid de Cards dos Contatos em Atendimento Humano */}
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
                    <HumanAgentsPagination
                        page={page}
                        setPage={setPage}
                        totalPages={totalPages}
                        filteredCount={filteredConversations.length}
                        total={total}
                        loading={loading}
                    />
                </div>
            )}

            {/* Modal de Confirmação Centralizado */}
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
