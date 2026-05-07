import React from 'react';
import { useClient } from '../../contexts/ClientContext';
import { useWebhookLeads } from './hooks/useWebhookLeads';
import Header from './components/Header';
import Filters from './components/Filters';
import Table from './components/Table';
import Modals from './components/Modals';
import LoadingOverlay from './components/LoadingOverlay';

export default function WebhookLeads() {
  const { activeClient } = useClient();
  const logic = useWebhookLeads(activeClient);

  return (
    <div className="p-8 max-w-7xl mx-auto animate-in fade-in duration-500">
      <LoadingOverlay loading={logic.loading} />
      <Header 
        selectedLeads={logic.selectedLeads}
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
      />

      <Filters 
        search={logic.search}
        setSearch={logic.setSearch}
        selectedTag={logic.selectedTag}
        setSelectedTag={logic.setSelectedTag}
        availableFilters={logic.availableFilters}
        total={logic.total}
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
      />
    </div>
  );
}
