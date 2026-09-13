import React, { useEffect } from 'react';
import ContactsModalFilters from '../ContactsModalFilters';
import ContactsPaginationFooter from '../ContactsPaginationFooter';
import { useContactsModalLogic } from '../../hooks/useContactsModalLogic';
import { useCopyContacts } from './hooks/useCopyContacts';
import ContactsModalTabs from './components/ContactsModalTabs';
import ContactsModalList from './components/ContactsModalList';
import ContactsModalFooter from './components/ContactsModalFooter';
import ContactsModalDialogs from './components/ContactsModalDialogs';

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
    getContactPhone,
    safeModalContacts,
    isClientSidePaging
  } = useContactsModalLogic({
    contactsModal, setContactsModal, contactsFilter, setContactsFilter,
    contactsTypeFilter, setContactsTypeFilter, contactsErrorFilter, setContactsErrorFilter,
    loadingContacts, contactsPage, setContactsPage, contactsPerPage, setContactsPerPage, contactsTotal,
    activeClient, onRefresh,
    contactsSearchPhone, setContactsSearchPhone,
    contactsFilterDdi, setContactsFilterDdi,
    contactsFilterDdd, setContactsFilterDdd
  });

  const { handleCopyContacts } = useCopyContacts({
    selectedPhones,
    safeModalContacts,
    totalCount,
    isClientSidePaging,
    getAllTargetContacts,
    getContactPhone
  });

  useEffect(() => {
    if (contactsModal?.isOpen) {
      document.body.classList.add('no-scroll');
    } else {
      document.body.classList.remove('no-scroll');
    }
    return () => {
      document.body.classList.remove('no-scroll');
    };
  }, [contactsModal?.isOpen]);

  if (!contactsModal?.isOpen) return null;

  const handleClose = () => {
    setContactsModal({ ...contactsModal, isOpen: false });
    setContactsTypeFilter('all');
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
          onClose={handleClose}
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
            <ContactsModalTabs
              contactsModal={contactsModal}
              contactsFilter={contactsFilter}
              setContactsFilter={setContactsFilter}
              setPage={setPage}
            />

            {/* Lista de Contatos */}
            <ContactsModalList
              contactsModal={contactsModal}
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
              isSelected={isSelected}
              toggleSelectOne={toggleSelectOne}
              setExplainError={setExplainError}
            />

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
        <ContactsModalFooter
          handleCopyContacts={handleCopyContacts}
          selectedPhonesCount={selectedPhones.length}
          totalCount={totalCount}
          onClose={() => setContactsModal({ ...contactsModal, isOpen: false })}
        />
      </div>

      {/* Diálogos de Confirmação e Ação */}
      <ContactsModalDialogs
        isConfirmRestOpen={isConfirmRestOpen}
        setIsConfirmRestOpen={setIsConfirmRestOpen}
        handleRestSelectedContacts={handleRestSelectedContacts}
        restingHours={restingHours}
        setRestingHours={setRestingHours}
        loadingRest={loadingRest}
        selectedPhones={selectedPhones}
        totalCount={totalCount}
        isConfirmBlockOpen={isConfirmBlockOpen}
        setIsConfirmBlockOpen={setIsConfirmBlockOpen}
        handleBlockSelectedContacts={handleBlockSelectedContacts}
        loadingBlock={loadingBlock}
        isChatwootLabelModalOpen={isChatwootLabelModalOpen}
        setIsChatwootLabelModalOpen={setIsChatwootLabelModalOpen}
        handleApplyChatwootLabel={handleApplyChatwootLabel}
        chatwootLabeling={chatwootLabeling}
        clientId={contactsModal.clientId || activeClient?.id}
        isTagModalOpen={isTagModalOpen}
        setIsTagModalOpen={setIsTagModalOpen}
        contacts={contactsModal.contacts}
        setContactsModal={setContactsModal}
        setSelectedPhones={setSelectedPhones}
        isBulkSendModalOpen={isBulkSendModalOpen}
        setIsBulkSendModalOpen={setIsBulkSendModalOpen}
        triggerId={contactsModal.triggerId}
        markContactsResolved={markContactsResolved}
        onRefresh={onRefresh}
        explainError={explainError}
        setExplainError={setExplainError}
      />
    </div>
  );
};

export default ContactsModal;
