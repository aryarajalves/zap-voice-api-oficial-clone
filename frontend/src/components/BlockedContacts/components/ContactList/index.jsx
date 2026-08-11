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
    reasonFilter,
    setReasonFilter,
    selectedIds,
    toggleSelectRow,
    toggleSelectAll,
    selectAllFiltered,
    clearSelection,
    isAllFilteredSelected,
    onBulkDelete,
    onUnblock,
    onExport,
    currentPage,
    setCurrentPage,
    itemsPerPage,
    setItemsPerPage,
    totalPages,
    listTab
}) {
    const isAllVisibleSelected = paginatedContacts.length > 0 && paginatedContacts.every(c => selectedIds.has(c.id));
    const selectedCount = selectedIds.size;

    // Mostra o banner quando a página inteira está selecionada mas NÃO todos os filtrados
    const showSelectAllBanner = isAllVisibleSelected && !isAllFilteredSelected && filteredContacts.length > paginatedContacts.length;

    return (
        <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-sm border border-white/5 overflow-hidden transition-all duration-200">
            <Filters
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                reasonFilter={reasonFilter}
                setReasonFilter={setReasonFilter}
                contacts={contacts}
                selectedCount={selectedCount}
                onBulkDelete={onBulkDelete}
                onExport={onExport}
            />

            {/* Banner: Selecionar todos os filtrados */}
            {showSelectAllBanner && (
                <div className="px-6 py-3 bg-red-500/10 border-b border-red-500/20 flex items-center justify-center gap-3 text-sm">
                    <span className="text-gray-300">
                        Os <strong className="text-white">{paginatedContacts.length}</strong> contatos desta página estão selecionados.
                    </span>
                    <button
                        onClick={selectAllFiltered}
                        className="font-bold text-red-400 hover:text-red-300 underline underline-offset-2 transition-colors"
                    >
                        Selecionar todos os {filteredContacts.length} contatos
                    </button>
                </div>
            )}

            {/* Banner: Todos os filtrados selecionados */}
            {isAllFilteredSelected && filteredContacts.length > 0 && (
                <div className="px-6 py-3 bg-red-500/15 border-b border-red-500/30 flex items-center justify-center gap-3 text-sm">
                    <span className="text-gray-200">
                        Todos os <strong className="text-white">{filteredContacts.length}</strong> contatos estão selecionados.
                    </span>
                    <button
                        onClick={clearSelection}
                        className="font-bold text-red-400 hover:text-red-300 underline underline-offset-2 transition-colors"
                    >
                        Limpar seleção
                    </button>
                </div>
            )}

            {loading ? (
                <div className="p-12 text-center text-gray-500 animate-pulse font-bold tracking-widest uppercase text-xs">
                    Carregando contatos...
                </div>
            ) : filteredContacts.length === 0 ? (
                <div className="p-12 text-center text-gray-400 font-medium">
                    {searchTerm || reasonFilter ? 'Nenhum resultado encontrado para os filtros aplicados.' : 'Nenhum contato bloqueado no momento.'}
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
                        listTab={listTab}
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
