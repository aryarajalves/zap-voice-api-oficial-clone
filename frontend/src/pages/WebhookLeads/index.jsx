import React from 'react';
import { useClient } from '../../contexts/ClientContext';
import { useWebhookLeads } from './hooks/useWebhookLeads';
import Header from './components/Header';
import Filters from './components/Filters';
import Table from './components/Table';
import Modals from './components/Modals';
import LoadingOverlay from './components/LoadingOverlay';
import BulkTagModal from './components/BulkTagModal';
import BlockContactModal from './components/BlockContactModal';

export default function WebhookLeads({ onNavigateToImportHistory, onNavigateToIntegrations, onNavigateToBulk, onNavigateToDispatchHistory, onNavigateToChat }) {
  const { activeClient } = useClient();
  const logic = useWebhookLeads(activeClient);

  return (
    <div className="p-8 max-w-7xl mx-auto animate-in fade-in duration-500">
      <LoadingOverlay loading={logic.loading} />
      <Header
        selectedLeads={logic.selectedLeads}
        selectAllPages={logic.selectAllPages}
        total={logic.total}
        setIsDeleteModalOpen={logic.setIsDeleteModalOpen}
        setLeadToDelete={logic.setLeadToDelete}
        setIsBulkTagModalOpen={logic.setIsBulkTagModalOpen}
        onOpenBlockModal={logic.handleOpenBlockModal}
        setIsCleanConfirmOpen={logic.setIsCleanConfirmOpen}
        isCleaningTags={logic.isCleaningTags}
        setIsCreateModalOpen={logic.setIsCreateModalOpen}
        setIsImportModalOpen={logic.setIsImportModalOpen}
        handleExport={logic.handleExport}
        fetchLeads={logic.fetchLeads}
        fetchFilters={logic.fetchFilters}
        loading={logic.loading}
        onNavigateToImportHistory={onNavigateToImportHistory}
        onNavigateToIntegrations={onNavigateToIntegrations}
        onNavigateToBulk={onNavigateToBulk}
        onNavigateToDispatchHistory={onNavigateToDispatchHistory}
        onNavigateToChat={onNavigateToChat}
      />

      <Filters
        search={logic.search}
        setSearch={logic.setSearch}
        selectedTags={logic.selectedTags}
        setSelectedTags={logic.setSelectedTags}
        importedByClientId={logic.importedByClientId}
        setImportedByClientId={logic.setImportedByClientId}
        origin={logic.origin}
        setOrigin={logic.setOrigin}
        lockedFilter={logic.lockedFilter}
        setLockedFilter={logic.setLockedFilter}
        bsudFilter={logic.bsudFilter}
        setBsudFilter={logic.setBsudFilter}
        filterDdi={logic.filterDdi}
        setFilterDdi={logic.setFilterDdi}
        filterDdd={logic.filterDdd}
        setFilterDdd={logic.setFilterDdd}
        ddiOptions={logic.ddiOptions}
        dddOptions={logic.dddOptions}
        blockStatusFilter={logic.blockStatusFilter}
        setBlockStatusFilter={logic.setBlockStatusFilter}
        hasBlockedLeads={logic.hasBlockedLeads}
        hasRestingLeads={logic.hasRestingLeads}
        availableFilters={logic.availableFilters}
        total={logic.total}
        datePreset={logic.datePreset}
        setDatePreset={logic.setDatePreset}
        customDateFrom={logic.customDateFrom}
        setCustomDateFrom={logic.setCustomDateFrom}
        customDateTo={logic.customDateTo}
        setCustomDateTo={logic.setCustomDateTo}
        handleClearDateFilters={logic.handleClearDateFilters}
      />

      <Table
        loading={logic.loading}
        leads={logic.leads}
        selectedLeads={logic.selectedLeads}
        handleSelectAll={logic.handleSelectAll}
        handleSelectLead={logic.handleSelectLead}
        setLeadToEdit={logic.setLeadToEdit}
        setIsEditModalOpen={logic.setIsEditModalOpen}
        setLeadToDelete={logic.setLeadToDelete}
        setIsDeleteModalOpen={logic.setIsDeleteModalOpen}
        page={logic.page}
        setPage={logic.setPage}
        total={logic.total}
        limit={logic.limit}
        setLimit={logic.setLimit}
        fetchLeads={logic.fetchLeads}
        selectAllPages={logic.selectAllPages}
        handleSelectAllPages={logic.handleSelectAllPages}
        handleClearSelectAllPages={logic.handleClearSelectAllPages}
        updateLeadInPlace={logic.updateLeadInPlace}
        onOpenBlockModal={logic.handleOpenBlockModal}
      />

      <BulkTagModal
        isOpen={logic.isBulkTagModalOpen}
        onClose={() => logic.setIsBulkTagModalOpen(false)}
        onConfirm={logic.handleBulkTag}
        isSaving={logic.isBulkTagging}
        count={logic.selectAllPages ? logic.total : logic.selectedLeads.length}
        selectAllPages={logic.selectAllPages}
      />

      <BlockContactModal
        isOpen={!!logic.blockTarget}
        onClose={logic.closeBlockModal}
        onConfirm={logic.handleConfirmBlock}
        isSaving={logic.isBlocking}
        count={
          logic.blockTarget === 'bulk'
            ? (logic.selectAllPages ? logic.total : logic.selectedLeads.length)
            : 1
        }
        selectAllPages={logic.blockTarget === 'bulk' && logic.selectAllPages}
        targetLabel={
          logic.blockTarget && logic.blockTarget !== 'bulk'
            ? `${logic.blockTarget.name} (${logic.blockTarget.phone})`
            : null
        }
      />

      <Modals
        isCleanConfirmOpen={logic.isCleanConfirmOpen}
        setIsCleanConfirmOpen={logic.setIsCleanConfirmOpen}
        handleCleanTags={logic.handleCleanTags}
        isDeleteModalOpen={logic.isDeleteModalOpen}
        setIsDeleteModalOpen={logic.setIsDeleteModalOpen}
        setLeadToDelete={logic.setLeadToDelete}
        executeDelete={logic.executeDelete}
        leadToDelete={logic.leadToDelete}
        selectedLeads={logic.selectedLeads}
        selectAllPages={logic.selectAllPages}
        total={logic.total}
        isDeleting={logic.isDeleting}
        isImportModalOpen={logic.isImportModalOpen}
        setIsImportModalOpen={logic.setIsImportModalOpen}
        fetchLeads={logic.fetchLeads}
        fetchFilters={logic.fetchFilters}
        isEditModalOpen={logic.isEditModalOpen}
        setIsEditModalOpen={logic.setIsEditModalOpen}
        setLeadToEdit={logic.setLeadToEdit}
        leadToEdit={logic.leadToEdit}
        isCreateModalOpen={logic.isCreateModalOpen}
        setIsCreateModalOpen={logic.setIsCreateModalOpen}
        onNavigateToImportHistory={onNavigateToImportHistory}
      />
    </div>
  );
}
