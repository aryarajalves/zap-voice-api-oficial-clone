import React from 'react';
import { createPortal } from 'react-dom';
import { FiTrash2 } from 'react-icons/fi';
import ConfirmModal from '../../../components/ConfirmModal';
import ContactImportModal from '../../../components/ContactImportModal';
import EditLeadModal from '../../../components/EditLeadModal';
import CreateLeadModal from '../../../components/CreateLeadModal';

function DeletingOverlay({ isDeleting, selectAllPages, count }) {
  if (!isDeleting) return null;
  const label = selectAllPages
    ? `Excluindo todos os ${count?.toLocaleString('pt-BR')} contatos...`
    : 'Excluindo contatos selecionados...';

  return createPortal(
    <div className="fixed inset-0 z-[30000] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-gray-900 border border-white/10 rounded-3xl shadow-2xl px-10 py-8 flex flex-col items-center gap-5 max-w-sm w-full mx-4">
        <div className="relative w-16 h-16">
          <div className="w-16 h-16 border-4 border-red-500/20 border-t-red-500 rounded-full animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <FiTrash2 size={20} className="text-red-400" />
          </div>
        </div>
        <div className="text-center space-y-1">
          <p className="text-white font-bold text-base">{label}</p>
          <p className="text-gray-400 text-xs">Aguarde, não feche a página.</p>
        </div>
        <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-red-600 to-rose-500 rounded-full animate-loading-bar" />
        </div>
      </div>
    </div>,
    document.body
  );
}

export default function Modals({
  isCleanConfirmOpen, setIsCleanConfirmOpen, handleCleanTags,
  isDeleteModalOpen, setIsDeleteModalOpen, setLeadToDelete, executeDelete, leadToDelete, selectedLeads, isDeleting,
  selectAllPages, total,
  isImportModalOpen, setIsImportModalOpen, fetchLeads, fetchFilters,
  isEditModalOpen, setIsEditModalOpen, setLeadToEdit, leadToEdit,
  isCreateModalOpen, setIsCreateModalOpen, onNavigateToImportHistory
}) {
  return (
    <>
      {/* Overlay de progresso de exclusão */}
      <DeletingOverlay
        isDeleting={isDeleting}
        selectAllPages={selectAllPages}
        count={total}
      />

      <ConfirmModal
        isOpen={isCleanConfirmOpen}
        onClose={() => setIsCleanConfirmOpen(false)}
        onConfirm={handleCleanTags}
        title="Sincronizar Contatos"
        message="Isso vai varrer todos os contatos e: (1) corrigir encoding e capitalização dos nomes (ex: 'ALBERTO levi' → 'Alberto Levi'), e (2) remover etiquetas com caracteres especiais ou escapados. Etiquetas normais não serão afetadas."
        confirmText="Sincronizar Agora"
        cancelText="Cancelar"
        isDangerous={false}
      />

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => { setIsDeleteModalOpen(false); setLeadToDelete(null); }}
        onConfirm={executeDelete}
        title={leadToDelete === 'bulk' ? 'Excluir Contatos' : 'Excluir Contato e Histórico'}
        message={
          leadToDelete === 'bulk'
            ? selectAllPages
              ? `Atenção! Você está prestes a excluir TODOS os ${total?.toLocaleString('pt-BR')} contatos com os filtros ativos. Esta ação é irreversível e apagará todo o histórico de eventos e agendamentos.`
              : `Tem certeza que deseja excluir os ${selectedLeads.length} contatos selecionados? Esta ação também apagará todo o histórico de eventos e agendamentos desses contatos.`
            : `Tem certeza que deseja excluir este contato? Esta ação apagará todo o histórico de eventos e agendamentos atrelados ao número dele (${leadToDelete?.phone}).`
        }
        confirmText="Excluir Definitivamente"
        cancelText="Cancelar"
        confirmColor="red"
      />

      <ContactImportModal 
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportComplete={() => {
          fetchLeads();
          fetchFilters();
          if (onNavigateToImportHistory) {
            onNavigateToImportHistory();
          }
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
