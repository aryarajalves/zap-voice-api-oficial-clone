import React from 'react';
import { useClient } from '../../contexts/ClientContext';
import { useWebhookLeads } from './hooks/useWebhookLeads';
import Header from './components/Header';
import Filters from './components/Filters';
import Table from './components/Table';
import Modals from './components/Modals';
import LoadingOverlay from './components/LoadingOverlay';

export default function WebhookLeads({ onNavigateToImportHistory, onNavigateToIntegrations, onNavigateToBulk, onNavigateToDispatchHistory }) {
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
