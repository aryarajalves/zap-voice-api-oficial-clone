import React from 'react';
import ContactTableRow from './ContactTableRow';
import ContactTablePagination from './ContactTablePagination';
import ContactBulkDeleteModal from './ContactBulkDeleteModal';
import VariableActionModal from './VariableActionModal';
import { isPhoneExcluded } from '../../../../utils/phoneFilters';
import {
    ContactBulkActionBar,
    ContactTableToolbar,
    ContactTableHeader,
    useContactTableLogic
} from './ContactTable/index';

const ContactTable = ({
    displayedContacts = [],
    filteredContacts = [],
    activeVarColumns = [],
    showValidation,
    removeContact,
    unblockContact,
    displayLimit,
    setDisplayLimit,
    filteredContactsCount = 0,
    variableFilters = {},
    setVariableFilters,
    exclusionList = [],
    setContacts,
    filterExcludedOnly = false,
    setFilterExcludedOnly,
    excludedCount = 0
}) => {
    const {
        currentPage,
        setCurrentPage,
        itemsPerPage,
        selectedPhones,
        setSelectedPhones,
        showBulkDeleteModal,
        setShowBulkDeleteModal,
        varContentFilters,
        activeVarModal,
        setActiveVarModal,
        isDragging,
        dragProps,
        baseContacts,
        showContactTags,
        isLoadingTags,
        contactsTagsMap,
        toggleShowContactTags,
        totalItems,
        totalPages,
        pageContacts,
        isAllPageSelected,
        startIndex,
        endIndex,
        handleItemsPerPageChange,
        handleToggleSelectPage,
        handleToggleSelectPhone,
        handleSelectAllFiltered,
        handleConfirmBulkDelete,
        handleCopyPhone,
        handleVarChange,
        toggleVarFilter,
        handleSetVarContentFilter
    } = useContactTableLogic({
        displayedContacts,
        filteredContacts,
        removeContact,
        setDisplayLimit,
        setVariableFilters,
        setContacts
    });

    return (
        <div className="bg-slate-900/60 rounded-[2rem] border border-white/10 overflow-hidden shadow-2xl flex flex-col">
            
            {/* Barra de Ações em Lote quando houver itens selecionados */}
            <ContactBulkActionBar
                selectedPhonesCount={selectedPhones.length}
                totalItems={totalItems}
                onSelectAllFiltered={handleSelectAllFiltered}
                onClearSelection={() => setSelectedPhones([])}
                onOpenBulkDeleteModal={() => setShowBulkDeleteModal(true)}
            />

            {/* Barra de Ferramentas: Navegação e Opção de Etiquetas da Aba Contatos */}
            <ContactTableToolbar
                excludedCount={excludedCount}
                filterExcludedOnly={filterExcludedOnly}
                setFilterExcludedOnly={setFilterExcludedOnly}
                showContactTags={showContactTags}
                isLoadingTags={isLoadingTags}
                toggleShowContactTags={toggleShowContactTags}
            />

            {/* Tabela de Contatos */}
            <div 
                ref={dragProps.ref}
                onMouseDown={dragProps.onMouseDown}
                className={`max-h-[450px] overflow-auto premium-scrollbar ${
                    isDragging ? 'cursor-grabbing select-none' : 'cursor-grab'
                }`}
                title="Segure o botão esquerdo do mouse para rolar na horizontal e vertical"
            >
                <table className="w-full text-left border-collapse">
                    <ContactTableHeader
                        isAllPageSelected={isAllPageSelected}
                        onToggleSelectPage={handleToggleSelectPage}
                        activeVarColumns={activeVarColumns}
                        variableFilters={variableFilters}
                        varContentFilters={varContentFilters}
                        showValidation={showValidation}
                        showContactTags={showContactTags}
                        onOpenVarModal={setActiveVarModal}
                        onToggleVarFilter={toggleVarFilter}
                        onSetVarContentFilter={handleSetVarContentFilter}
                    />

                    <tbody className="divide-y divide-white/5">
                        {pageContacts.length === 0 ? (
                            <tr>
                                <td colSpan={4 + activeVarColumns.length + (showValidation ? 2 : 0) + (showContactTags ? 1 : 0)} className="px-8 py-12 text-center text-slate-500 italic text-xs">
                                    Nenhum contato encontrado nesta página.
                                </td>
                            </tr>
                        ) : (
                            pageContacts.map((c, i) => {
                                const globalIndex = startIndex + i + 1;
                                const isExcluded = isPhoneExcluded(c.phone, exclusionList);
                                const isSelected = selectedPhones.includes(c.phone);

                                return (
                                    <ContactTableRow
                                        key={c.phone}
                                        contact={c}
                                        globalIndex={globalIndex}
                                        isSelected={isSelected}
                                        isExcluded={isExcluded}
                                        showValidation={showValidation}
                                        showContactTags={showContactTags}
                                        activeVarColumns={activeVarColumns}
                                        variableFilters={variableFilters}
                                        contactsTagsMap={contactsTagsMap}
                                        isLoadingTags={isLoadingTags}
                                        onToggleSelect={handleToggleSelectPhone}
                                        onCopyPhone={handleCopyPhone}
                                        onVarChange={handleVarChange}
                                        onUnblock={unblockContact}
                                        onRemove={removeContact}
                                    />
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Rodapé de Paginação Otimizado */}
            <ContactTablePagination
                itemsPerPage={itemsPerPage}
                handleItemsPerPageChange={handleItemsPerPageChange}
                totalItems={totalItems}
                startIndex={startIndex}
                endIndex={endIndex}
                currentPage={currentPage}
                totalPages={totalPages}
                setCurrentPage={setCurrentPage}
            />

            {/* Modal de Confirmação para Exclusão em Lote */}
            <ContactBulkDeleteModal
                isOpen={showBulkDeleteModal}
                selectedCount={selectedPhones.length}
                onClose={() => setShowBulkDeleteModal(false)}
                onConfirm={handleConfirmBulkDelete}
            />

            {/* Modal de Ações e Filtros de Conteúdo da Variável */}
            <VariableActionModal
                isOpen={activeVarModal.isOpen}
                onClose={() => setActiveVarModal({ isOpen: false, varKey: '', varLabel: '' })}
                varKey={activeVarModal.varKey}
                varLabel={activeVarModal.varLabel}
                contacts={baseContacts}
                setContacts={setContacts}
                currentFilter={varContentFilters[activeVarModal.varKey] || 'all'}
                onSetFilter={(filterMode) => handleSetVarContentFilter(activeVarModal.varKey, filterMode)}
            />
        </div>
    );
};

export default ContactTable;
