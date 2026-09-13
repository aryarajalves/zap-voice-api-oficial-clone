import React from 'react';
import ContactsBulkActionBar from '../../ContactsBulkActionBar';
import ContactRow from '../../ContactRow';

export default function ContactsModalList({
  contactsModal,
  displayContacts,
  selectedPhones,
  totalCount,
  getContactPhone,
  toggleSelectAll,
  handleSelectAllTarget,
  loadingAllTarget,
  setIsChatwootLabelModalOpen,
  chatwootLabeling,
  handleOpenTagModal,
  taggingAll,
  contactsFilter,
  handleOpenBulkSendModal,
  sendingAll,
  setIsConfirmRestOpen,
  loadingRest,
  setIsConfirmBlockOpen,
  loadingBlock,
  isSelected,
  toggleSelectOne,
  setExplainError
}) {
  const contacts = contactsModal?.contacts || [];

  return (
    <div className="p-0 overflow-y-auto flex-1 bg-gray-50 dark:bg-gray-900/30 min-h-[300px]">
      {contacts.length > 0 && (
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
            key={contact.phone_number || contact.id || i}
            contact={contact}
            isSelected={isSelected(contact)}
            onToggleSelect={() => toggleSelectOne(contact)}
            isTemplate={contactsModal?.isTemplate}
            onExplainError={setExplainError}
          />
        ))}

        {contacts.length === 0 && (
          <div className="flex flex-col items-center justify-center p-8 my-6 text-center max-w-lg mx-auto rounded-2xl bg-amber-500/5 dark:bg-amber-500/10 border border-amber-200/60 dark:border-amber-500/30 shadow-lg shadow-amber-500/5 animate-in fade-in zoom-in-95 duration-200">
            <div className="py-6 text-center text-gray-400 dark:text-gray-500">
              <p className="text-sm font-medium">Nenhum contato encontrado neste filtro.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
