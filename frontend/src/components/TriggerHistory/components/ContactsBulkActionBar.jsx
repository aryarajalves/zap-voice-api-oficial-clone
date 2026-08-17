import React from 'react';

export default function ContactsBulkActionBar({
  displayContacts = [],
  selectedPhones = [],
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
  loadingBlock
}) {
  const selectable = (displayContacts || []).filter(c => !c?.failure_resolution);
  const isAllPageSelected = selectable.length > 0 && (
    selectedPhones.length >= totalCount || selectable.every(c => selectedPhones.includes(getContactPhone(c)))
  );

  return (
    <div className="p-3 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 flex flex-col gap-2 sticky top-0 z-20 shadow-sm">
      <div className="flex justify-between items-center">
        <label className="flex items-center gap-3 cursor-pointer select-none">
          <input
            type="checkbox"
            className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500/20 w-4 h-4 bg-transparent transition-all cursor-pointer"
            checked={isAllPageSelected}
            onChange={toggleSelectAll}
          />
          <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            {selectedPhones.length >= totalCount && totalCount > 0
              ? `Todos os ${totalCount} Selecionados`
              : `Selecionar Página (${(displayContacts || []).length})`}
          </span>
        </label>
        
        {totalCount > (displayContacts || []).length && (
          <button
            type="button"
            onClick={handleSelectAllTarget}
            disabled={loadingAllTarget}
            className="px-2.5 py-1 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-800/40 text-blue-600 dark:text-blue-400 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 disabled:opacity-50 border border-blue-200/50 dark:border-blue-700/50 flex items-center gap-1 cursor-pointer"
          >
            {loadingAllTarget ? 'Carregando...' : selectedPhones.length >= totalCount ? `Desmarcar ${totalCount}` : `✨ Selecionar todos ${totalCount}`}
          </button>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        {/* Linha 1: Etiqueta Chat + Etiquetar + Disparar */}
        <div className="flex gap-2">
          <button
            onClick={() => setIsChatwootLabelModalOpen(true)}
            disabled={chatwootLabeling || loadingAllTarget}
            className="flex-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-black uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-1.5 shadow-md shadow-indigo-950/20 disabled:opacity-50 cursor-pointer"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
              <line x1="7" y1="7" x2="7.01" y2="7"/>
            </svg>
            {selectedPhones.length > 0 ? `Etiqueta Chat (${selectedPhones.length})` : `Etiqueta Chat (${totalCount})`}
          </button>
          <button
            onClick={handleOpenTagModal}
            disabled={taggingAll || loadingAllTarget}
            className="flex-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-black uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-1.5 shadow-md shadow-emerald-950/20 disabled:opacity-50 cursor-pointer"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
              <line x1="7" y1="7" x2="7.01" y2="7"/>
            </svg>
            {selectedPhones.length > 0 ? `Etiquetar (${selectedPhones.length})` : `Etiquetar Todos (${totalCount})`}
          </button>
          {contactsFilter === 'failed' && (
            <button
              onClick={handleOpenBulkSendModal}
              disabled={sendingAll || loadingAllTarget}
              className="flex-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-black uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-1.5 shadow-md shadow-blue-950/20 disabled:opacity-50 cursor-pointer"
              id="contacts-bulk-send-button"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <polyline points="22 2 15 22 11 13 2 9 22 2" />
                <line x1="22" y1="2" x2="11" y2="13" />
              </svg>
              {selectedPhones.length > 0 ? `Disparar (${selectedPhones.length})` : `Disparar Todos (${totalCount})`}
            </button>
          )}
        </div>
        {/* Linha 2: Repousar + Bloquear (só em falhas) */}
        {contactsFilter === 'failed' && (
          <div className="flex gap-2">
            <button
              onClick={() => setIsConfirmRestOpen(true)}
              disabled={loadingRest || loadingAllTarget}
              className="flex-1 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-black uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-1.5 shadow-md shadow-amber-950/20 disabled:opacity-50 cursor-pointer"
              id="contacts-bulk-rest-button"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              {selectedPhones.length > 0 ? `Repousar (${selectedPhones.length})` : `Repousar Todos (${totalCount})`}
            </button>
            <button
              onClick={() => setIsConfirmBlockOpen(true)}
              disabled={loadingBlock || loadingAllTarget}
              className="flex-1 px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-black uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-1.5 shadow-md shadow-rose-950/20 disabled:opacity-50 cursor-pointer"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <circle cx="12" cy="12" r="10" />
                <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
              </svg>
              {selectedPhones.length > 0 ? `Bloquear (${selectedPhones.length})` : `Bloquear Todos (${totalCount})`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
