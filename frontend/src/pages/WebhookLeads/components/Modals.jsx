import React from 'react';
import ConfirmModal from '../../../components/ConfirmModal';
import ContactImportModal from '../../../components/ContactImportModal';
import EditLeadModal from '../../../components/EditLeadModal';
import CreateLeadModal from '../../../components/CreateLeadModal';

export default function Modals({ 
  isCleanConfirmOpen, setIsCleanConfirmOpen, handleCleanTags,
  isDeleteModalOpen, setIsDeleteModalOpen, setLeadToDelete, executeDelete, leadToDelete, selectedLeads, isDeleting,
  isImportModalOpen, setIsImportModalOpen, fetchLeads, fetchFilters,
  isEditModalOpen, setIsEditModalOpen, setLeadToEdit, leadToEdit,
  isCreateModalOpen, setIsCreateModalOpen
}) {
  return (
    <>
      <ConfirmModal
        isOpen={isCleanConfirmOpen}
        onClose={() => setIsCleanConfirmOpen(false)}
        onConfirm={handleCleanTags}
        title="Limpar Etiquetas Corrompidas"
        message="Isso vai varrer todos os contatos e remover automaticamente as etiquetas com caracteres especiais ou escapados (vindas do Chatwoot). Etiquetas normais não serão afetadas."
        confirmText="Limpar Agora"
        cancelText="Cancelar"
        isDangerous={false}
      />

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => { setIsDeleteModalOpen(false); setLeadToDelete(null); }}
        onConfirm={executeDelete}
        title={leadToDelete === 'bulk' ? 'Excluir Vários Contatos' : 'Excluir Contato e Histórico'}
        message={
          leadToDelete === 'bulk' 
            ? `Tem certeza que deseja excluir os ${selectedLeads.length} contatos selecionados? Esta ação também apagará todo o histórico de eventos e agendamentos desses contatos.`
            : `Tem certeza que deseja excluir este contato? Esta ação apagará todo o histórico de eventos e agendamentos atrelados ao número dele (${leadToDelete?.phone}).`
        }
        confirmText={isDeleting ? "Excluindo..." : "Excluir Definitivamente"}
        cancelText="Cancelar"
        confirmColor="red"
      />

      <ContactImportModal 
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportComplete={() => {
          fetchLeads();
          fetchFilters();
        }}
      />

      <EditLeadModal
        isOpen={isEditModalOpen}
        onClose={() => { setIsEditModalOpen(false); setLeadToEdit(null); }}
        lead={leadToEdit}
        onSuccess={() => {
          fetchLeads();
          fetchFilters();
        }}
      />

      <CreateLeadModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => {
          fetchLeads();
          fetchFilters();
        }}
      />
    </>
  );
}
