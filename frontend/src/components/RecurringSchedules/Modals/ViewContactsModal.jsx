import React from 'react';
import { useViewContactsModal } from './useViewContactsModal';
import { ViewContactsHeader } from './ViewContactsHeader';
import { ViewContactsFilterBar } from './ViewContactsFilterBar';
import { ViewContactsList } from './ViewContactsList';
import { ViewContactsFooter } from './ViewContactsFooter';

export function ViewContactsModal({
    viewingContacts,
    onClose,
    onSaveExclusions,
    isSavingExclusions,
    onRefreshContacts
}) {
    const {
        localExclusions,
        filterType,
        setFilterType,
        isRefreshing,
        currentPage,
        setCurrentPage,
        pageSize,
        setPageSize,
        contacts,
        activeContacts,
        excludedContacts,
        totalFiltered,
        totalPages,
        displayedContacts,
        hasChanges,
        handleToggleExclusion,
        handleSave,
        handleRefresh
    } = useViewContactsModal({
        viewingContacts,
        onSaveExclusions,
        onRefreshContacts
    });

    if (!viewingContacts) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-slate-900 border border-white/10 rounded-[2.5rem] w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl relative animate-in zoom-in-95 duration-200">
                <ViewContactsHeader
                    viewingContacts={viewingContacts}
                    onClose={onClose}
                    onRefreshContacts={onRefreshContacts}
                    isRefreshing={isRefreshing}
                    onRefresh={handleRefresh}
                />

                <ViewContactsFilterBar
                    filterType={filterType}
                    setFilterType={setFilterType}
                    contactsCount={contacts.length}
                    activeCount={activeContacts.length}
                    excludedCount={excludedContacts.length}
                    pageSize={pageSize}
                    setPageSize={setPageSize}
                />

                <ViewContactsList
                    displayedContacts={displayedContacts}
                    localExclusions={localExclusions}
                    onToggleExclusion={handleToggleExclusion}
                />

                <ViewContactsFooter
                    currentPage={currentPage}
                    setCurrentPage={setCurrentPage}
                    totalPages={totalPages}
                    displayedCount={displayedContacts.length}
                    totalFiltered={totalFiltered}
                    totalGeneral={contacts.length}
                    onClose={onClose}
                    onSave={handleSave}
                    hasChanges={hasChanges}
                    isSavingExclusions={isSavingExclusions}
                />
            </div>
        </div>
    );
}
