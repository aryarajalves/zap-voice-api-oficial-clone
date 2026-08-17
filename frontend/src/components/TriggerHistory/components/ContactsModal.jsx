import React, { useEffect } from 'react';
import { toast } from 'react-hot-toast';
import TagContactsModal from './TagContactsModal';
import BulkSendContactsModal from './BulkSendContactsModal';
import ConfirmationDialog from './ConfirmationDialog';
import ExplainErrorDialog from './ExplainErrorDialog';
import ContactRow from './ContactRow';
import ChatwootLabelModal from './ChatwootLabelModal';
import ContactsModalFilters from './ContactsModalFilters';
import ContactsBulkActionBar from './ContactsBulkActionBar';
import ContactsPaginationFooter from './ContactsPaginationFooter';
import { useContactsModalLogic } from '../hooks/useContactsModalLogic';

const ContactsModal = ({
  contactsModal, setContactsModal, contactsFilter, setContactsFilter,
  contactsTypeFilter, setContactsTypeFilter, contactsErrorFilter, setContactsErrorFilter,
  loadingContacts, contactsPage, setContactsPage, contactsPerPage, setContactsPerPage, contactsTotal,
  activeClient, onRefresh,
  contactsSearchPhone, setContactsSearchPhone,
  contactsFilterDdi, setContactsFilterDdi,
  contactsFilterDdd, setContactsFilterDdd,
  contactsDdiOptions = [], contactsDddOptions = []
}) => {
  const {
    selectedPhones,
    setSelectedPhones,
    markContactsResolved,
    explainError,
    setExplainError,
    isTagModalOpen,
    setIsTagModalOpen,
    isConfirmBlockOpen,
    setIsConfirmBlockOpen,
    isBulkSendModalOpen,
    setIsBulkSendModalOpen,
    isChatwootLabelModalOpen,
    setIsChatwootLabelModalOpen,
    loadingBlock,
    loadingAllTarget,
    taggingAll,
    sendingAll,
    chatwootLabeling,
    handleApplyChatwootLabel,
    currentPage,
    perPage,
    setPage,
    setPerPage,
    totalCount,
    totalPages,
    displayContacts,
    isConfirmRestOpen,
    setIsConfirmRestOpen,
    restingHours,
    setRestingHours,
    loadingRest,
    handleOpenTagModal,
    handleOpenBulkSendModal,
    handleBlockSelectedContacts,
    handleRestSelectedContacts,
    isSelected,
    toggleSelectOne,
    toggleSelectAll,
    handleSelectAllTarget,
    getAllTargetContacts,
    getContactPhone
  } = useContactsModalLogic({
    contactsModal, setContactsModal, contactsFilter, setContactsFilter,
    contactsTypeFilter, setContactsTypeFilter, contactsErrorFilter, setContactsErrorFilter,
    loadingContacts, contactsPage, setContactsPage, contactsPerPage, setContactsPerPage, contactsTotal,
    activeClient, onRefresh,
    contactsSearchPhone, setContactsSearchPhone,
    contactsFilterDdi, setContactsFilterDdi,
    contactsFilterDdd, setContactsFilterDdd
  });

  useEffect(() => {
    if (contactsModal.isOpen) {
      document.body.classList.add('no-scroll');
    } else {
      document.body.classList.remove('no-scroll');
    }
    return () => {
      document.body.classList.remove('no-scroll');
    };
  }, [contactsModal.isOpen]);

  if (!contactsModal.isOpen) return null;

  const handleCopyContacts = async () => {
    let phonesToCopy = [];
    let copyToast = null;
    try {
      if (selectedPhones.length > 0) {
        phonesToCopy = selectedPhones;
      } else {
        copyToast = toast.loading(`Buscando todos os ${totalCount} contatos de todas as páginas...`);
        const allContacts = await getAllTargetContacts();
        phonesToCopy = (allContacts || []).map(getContactPhone).filter(Boolean);
      }

      if (phonesToCopy.length === 0) {
        if (copyToast) toast.dismiss(copyToast);
        toast.error('Nenhum contato disponível para copiar.');
        return;
      }

      const text = phonesToCopy.join('\n');
      try {
        await navigator.clipboard.writeText(text);
      } catch (e) {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }

      const count = phonesToCopy.length;
      const msg = count === 1 ? '1 contato copiado para a área de transferência!' : `${count} contatos copiados para a área de transferência!`;
      if (copyToast) toast.dismiss(copyToast);
      toast.success(msg);
    } catch (err) {
      console.error('Erro ao copiar contatos:', err);
      if (copyToast) toast.dismiss(copyToast);
      toast.error('Erro ao copiar contatos.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm animated-fade-in">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[85vh]" style={{ userSelect: 'none', cursor: 'default' }}>
        
        {/* Header e Filtros */}
        <ContactsModalFilters
          title={contactsModal.title}
          isTemplate={contactsModal.isTemplate}
          contactsTypeFilter={contactsTypeFilter}
          setContactsTypeFilter={setContactsTypeFilter}
          contactsFilter={contactsFilter}
          failureReasons={contactsModal.failureReasons || []}
          contactsErrorFilter={contactsErrorFilter}
          setContactsErrorFilter={setContactsErrorFilter}
          onClose={() => { setContactsModal({ ...contactsModal, isOpen: false }); setContactsTypeFilter('all'); }}
          contactsSearchPhone={contactsSearchPhone}
          setContactsSearchPhone={setContactsSearchPhone}
          contactsFilterDdi={contactsFilterDdi}
          setContactsFilterDdi={setContactsFilterDdi}
          contactsFilterDdd={contactsFilterDdd}
          setContactsFilterDdd={setContactsFilterDdd}
          contactsDdiOptions={contactsDdiOptions}
          contactsDddOptions={contactsDddOptions}
          setPage={setPage}
        />

        {/* Corpo do Modal */}
        {loadingContacts ? (
          <div className="flex-1 bg-gray-50 dark:bg-gray-900/30 flex items-center justify-center min-h-[350px]">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <>
            {/* Tabs */}
            {contactsModal.showTabs && contactsModal.isTemplate && (
              <div className="px-4 pt-2 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 flex gap-2 overflow-x-auto no-scrollbar">
                {[
                  { id: 'total', label: 'Total', icon: '🚀' },
                  { id: 'all', label: 'Todos', icon: '📋' },
                  { id: 'sent', label: 'Enviados', icon: '✅' },
                  { id: 'free', label: 'Gratuita', icon: '🆓' },
                  { id: 'template', label: 'Template', icon: '📝' },
                  { id: 'delivered', label: 'Interações', icon: '📬' },
                  { id: 'read', label: 'Viram', icon: '👀' },
                  { id: 'interaction', label: 'Interagiram', icon: '👆' },
                  { id: 'blocked', label: 'Bloquearam', icon: '🚫' },
                  { id: 'failed', label: 'Falharam', icon: '❌' },
                ].map(tab => {
                  const count = contactsModal.counts?.[tab.id] || 0;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => { setContactsFilter(tab.id); setPage(1); }}
                      className={`pb-2 px-3 text-sm font-medium border-b-2 transition whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                        contactsFilter === tab.id
                          ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                          : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                      }`}
                    >
                      <span>{tab.icon}</span>
                      <span>{tab.label}</span>
                      {count > 0 && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${contactsFilter === tab.id ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700' : 'bg-gray-100 dark:bg-gray-700 text-gray-500'}`}>
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Lista de Contatos */}
            <div className="p-0 overflow-y-auto flex-1 bg-gray-50 dark:bg-gray-900/30 min-h-[300px]">
              {(contactsModal.contacts || []).length > 0 && (
                <ContactsBulkActionBar
                  displayContacts={displayContacts}
                  selectedPhones={selectedPhones}
                  totalCount={totalCount}
                  getContactPhone={getContactPhone}
                  toggleSelectAll={toggleSelectAll}
                  handleSelectAllTarget={handleSelectAllTarget}
                  loadingAllTarget={loadingAllTarget}
                  setIsChatwootLabelModalOpen={setIsChatwootLabelModalOpen}
                  chatwootLabeling={chatwootLabeling}
                  handleOpenTagModal={handleOpenTagModal}
                  taggingAll={taggingAll}
                  contactsFilter={contactsFilter}
                  handleOpenBulkSendModal={handleOpenBulkSendModal}
                  sendingAll={sendingAll}
                  setIsConfirmRestOpen={setIsConfirmRestOpen}
                  loadingRest={loadingRest}
                  setIsConfirmBlockOpen={setIsConfirmBlockOpen}
                  loadingBlock={loadingBlock}
                />
              )}

              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {(displayContacts || []).map((contact, i) => (
                  <ContactRow
                    key={i}
                    contact={contact}
                    isSelected={isSelected(contact)}
                    onToggleSelect={() => toggleSelectOne(contact)}
                    isTemplate={contactsModal.isTemplate}
                    onExplainError={setExplainError}
                  />
                ))}

                {(contactsModal.contacts || []).length === 0 && (
                  <div className="flex flex-col items-center justify-center p-8 my-6 text-center max-w-lg mx-auto rounded-2xl bg-amber-500/5 dark:bg-amber-500/10 border border-amber-200/60 dark:border-amber-500/30 shadow-lg shadow-amber-500/5 animate-in fade-in zoom-in-95 duration-200">
                    <div className="py-6 text-center text-gray-400 dark:text-gray-500">
                      <p className="text-sm font-medium">Nenhum contato encontrado neste filtro.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Barra de Paginação */}
            <ContactsPaginationFooter
              totalCount={totalCount}
              currentPage={currentPage}
              totalPages={totalPages}
              perPage={perPage}
              setPerPage={setPerPage}
              setPage={setPage}
            />
          </>
        )}

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 flex justify-end gap-3 z-10">
          <button
            onClick={handleCopyContacts}
            className="px-4 py-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition font-medium flex items-center gap-2 cursor-pointer"
          >
            {selectedPhones.length > 0 ? `Copiar Selecionados (${selectedPhones.length})` : totalCount > 0 ? `Copiar Lista (${totalCount})` : 'Copiar Lista'}
          </button>
          <button
            onClick={() => setContactsModal({ ...contactsModal, isOpen: false })}
            className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition font-medium cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>

      {/* Diálogos de Confirmação e Ação */}
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
        selectOptions={[
          { value: 24, label: '24 horas (1 dia) — Padrão' },
          { value: 48, label: '48 horas (2 dias)' },
          { value: 72, label: '72 horas (3 dias)' },
          { value: 96, label: '96 horas (4 dias)' }
        ]}
      />

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

      <ChatwootLabelModal
        isOpen={isChatwootLabelModalOpen}
        onClose={() => setIsChatwootLabelModalOpen(false)}
        onConfirm={handleApplyChatwootLabel}
        loading={chatwootLabeling}
        count={selectedPhones.length}
        clientId={contactsModal.clientId || activeClient?.id}
      />

      <TagContactsModal
        isOpen={isTagModalOpen}
        onClose={() => setIsTagModalOpen(false)}
        selectedPhones={selectedPhones}
        contacts={contactsModal.contacts}
        setContactsModal={setContactsModal}
        onClearSelection={() => setSelectedPhones([])}
      />

      <BulkSendContactsModal
        isOpen={isBulkSendModalOpen}
        onClose={() => {
          setIsBulkSendModalOpen(false);
          setSelectedPhones([]);
        }}
        selectedPhones={selectedPhones}
        clientId={contactsModal.clientId || activeClient?.id}
        triggerId={contactsModal.triggerId}
        onSuccess={() => {
          markContactsResolved(selectedPhones, 'resent');
          setSelectedPhones([]);
          setIsBulkSendModalOpen(false);
          if (onRefresh) onRefresh();
        }}
      />

      <ExplainErrorDialog
        errorReason={explainError}
        onClose={() => setExplainError(null)}
      />
    </div>
  );
};

export default ContactsModal;
