import React from 'react';
import Filters from './Filters';
import ContactTable from './ContactTable';
import Pagination from './Pagination';

export default function ContactList({
    loading,
    contacts,
    filteredContacts,
    paginatedContacts,
    searchTerm,
    setSearchTerm,
    selectedIds,
    toggleSelectRow,
    toggleSelectAll,
    onBulkDelete,
    onUnblock,
    currentPage,
    setCurrentPage,
    itemsPerPage,
    setItemsPerPage,
    totalPages
}) {
    const isAllVisibleSelected = paginatedContacts.length > 0 && paginatedContacts.every(c => selectedIds.has(c.id));

    return (
        <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-sm border border-white/5 overflow-hidden transition-all duration-200">
            <Filters 
                searchTerm={searchTerm} 
                setSearchTerm={setSearchTerm} 
                selectedCount={selectedIds.size} 
                onBulkDelete={onBulkDelete} 
            />

            {loading ? (
                <div className="p-12 text-center text-gray-500 animate-pulse font-bold tracking-widest uppercase text-xs">
                    Carregando contatos...
                </div>
            ) : filteredContacts.length === 0 ? (
                <div className="p-12 text-center text-gray-400 font-medium">
                    {searchTerm ? 'Nenhum resultado encontrado para sua busca.' : 'Nenhum contato bloqueado no momento.'}
                </div>
            ) : (
                <>
                    <ContactTable 
                        contacts={paginatedContacts} 
                        selectedIds={selectedIds} 
                        toggleSelectRow={toggleSelectRow}
                        toggleSelectAll={toggleSelectAll}
                        isAllVisibleSelected={isAllVisibleSelected}
                        onUnblock={onUnblock}
                    />
                    
                    <Pagination 
                        currentPage={currentPage}
                        totalPages={totalPages}
                        setCurrentPage={setCurrentPage}
                        itemsPerPage={itemsPerPage}
                        setItemsPerPage={setItemsPerPage}
                        totalResults={filteredContacts.length}
                        currentVisibleCount={paginatedContacts.length}
                    />
                </>
            )}
        </div>
    );
}
