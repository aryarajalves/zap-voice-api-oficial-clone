import React from 'react';
import ConfirmationDialog from '../../ConfirmationDialog';
import ChatwootLabelModal from '../../ChatwootLabelModal';
import TagContactsModal from '../../TagContactsModal';
import BulkSendContactsModal from '../../BulkSendContactsModal';
import ExplainErrorDialog from '../../ExplainErrorDialog';

const REST_OPTIONS = [
  { value: 24, label: '24 horas (1 dia) — Padrão' },
  { value: 48, label: '48 horas (2 dias)' },
  { value: 72, label: '72 horas (3 dias)' },
  { value: 96, label: '96 horas (4 dias)' }
];

export default function ContactsModalDialogs({
  // Repouso
  isConfirmRestOpen,
  setIsConfirmRestOpen,
  handleRestSelectedContacts,
  restingHours,
  setRestingHours,
  loadingRest,
  selectedPhones,
  totalCount,

  // Bloqueio
  isConfirmBlockOpen,
  setIsConfirmBlockOpen,
  handleBlockSelectedContacts,
  loadingBlock,

  // Chatwoot Label
  isChatwootLabelModalOpen,
  setIsChatwootLabelModalOpen,
  handleApplyChatwootLabel,
  chatwootLabeling,
  clientId,

  // Tags
  isTagModalOpen,
  setIsTagModalOpen,
  contacts,
  setContactsModal,
  setSelectedPhones,

  // Envio em Massa
  isBulkSendModalOpen,
  setIsBulkSendModalOpen,
  triggerId,
  markContactsResolved,
  onRefresh,

  // Explicar Erro
  explainError,
  setExplainError
}) {
  return (
    <>
      {/* 1. Diálogo de Repouso */}
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
        selectOptions={REST_OPTIONS}
      />

      {/* 2. Diálogo de Bloqueio */}
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

      {/* 3. Modal de Etiquetas Chatwoot */}
      <ChatwootLabelModal
        isOpen={isChatwootLabelModalOpen}
        onClose={() => setIsChatwootLabelModalOpen(false)}
        onConfirm={handleApplyChatwootLabel}
        loading={chatwootLabeling}
        count={selectedPhones.length}
        clientId={clientId}
      />

      {/* 4. Modal de Etiquetas Locais */}
      <TagContactsModal
        isOpen={isTagModalOpen}
        onClose={() => setIsTagModalOpen(false)}
        selectedPhones={selectedPhones}
        contacts={contacts}
        setContactsModal={setContactsModal}
        onClearSelection={() => setSelectedPhones([])}
      />

      {/* 5. Modal de Reenvio em Massa */}
      <BulkSendContactsModal
        isOpen={isBulkSendModalOpen}
        onClose={() => {
          setIsBulkSendModalOpen(false);
          setSelectedPhones([]);
        }}
        selectedPhones={selectedPhones}
        clientId={clientId}
        triggerId={triggerId}
        onSuccess={() => {
          markContactsResolved(selectedPhones, 'resent');
          setSelectedPhones([]);
          setIsBulkSendModalOpen(false);
          if (onRefresh) onRefresh();
        }}
      />

      {/* 6. Diálogo de Explicação de Erro */}
      <ExplainErrorDialog
        errorReason={explainError}
        onClose={() => setExplainError(null)}
      />
    </>
  );
}
