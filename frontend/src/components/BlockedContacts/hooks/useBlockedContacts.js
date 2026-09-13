import { useState } from 'react';
import { useClient } from '../../../contexts/ClientContext';
import { useBlockedList } from './blockedContacts/useBlockedList';
import { useBlockedManual } from './blockedContacts/useBlockedManual';
import { useBlockedImport } from './blockedContacts/useBlockedImport';

/**
 * Hook orquestrador para gerenciamento de contatos bloqueados e em repouso.
 * Integra listagem, inserção manual e importação via planilha com retrocompatibilidade total.
 */
export function useBlockedContacts() {
    const { activeClient } = useClient();

    // Modos gerais de operação
    const [mode, setMode] = useState('manual'); // 'manual' | 'upload'
    const [blockType, setBlockType] = useState('permanent'); // 'permanent' | 'resting'
    const [isWorking, setIsWorking] = useState(false);
    const [workingMessage, setWorkingMessage] = useState('');

    // 1. Submódulo de listagem, busca, paginação, exclusão e exportação
    const listState = useBlockedList({ activeClient });

    // 2. Submódulo de bloqueio manual
    const manualState = useBlockedManual({
        activeClient,
        blockType,
        fetchBlockedContacts: listState.fetchBlockedContacts,
        setIsWorking,
        setWorkingMessage
    });

    // 3. Submódulo de importação via arquivo (Excel/CSV)
    const importState = useBlockedImport({
        activeClient,
        blockType,
        fetchBlockedContacts: listState.fetchBlockedContacts
    });

    const handleBulkDelete = () => {
        return listState.handleBulkDelete({
            setImporting: importState.setImporting,
            setImportLabel: importState.setImportLabel,
            setImportProgress: importState.setImportProgress
        });
    };

    return {
        // List & Navigation
        contacts: listState.contacts,
        loading: listState.loading,
        searchTerm: listState.searchTerm,
        setSearchTerm: listState.setSearchTerm,
        reasonFilter: listState.reasonFilter,
        setReasonFilter: listState.setReasonFilter,
        selectedIds: listState.selectedIds,
        listTab: listState.listTab,
        setListTab: listState.setListTab,
        currentPage: listState.currentPage,
        setCurrentPage: listState.setCurrentPage,
        itemsPerPage: listState.itemsPerPage,
        setItemsPerPage: listState.setItemsPerPage,
        filteredContacts: listState.filteredContacts,
        paginatedContacts: listState.paginatedContacts,
        totalPages: listState.totalPages,
        performUnblock: listState.performUnblock,
        handleBulkDelete,
        exportBlockedContacts: listState.exportBlockedContacts,
        toggleSelectAll: listState.toggleSelectAll,
        selectAllFiltered: listState.selectAllFiltered,
        clearSelection: listState.clearSelection,
        isAllFilteredSelected: listState.isAllFilteredSelected,
        toggleSelectRow: listState.toggleSelectRow,

        // Mode & Status
        mode,
        setMode,
        blockType,
        setBlockType,
        isWorking,
        workingMessage,

        // Manual
        manualInput: manualState.manualInput,
        setManualInput: manualState.setManualInput,
        adding: manualState.adding,
        handleBlockManual: manualState.handleBlockManual,
        add55ToManualInput: manualState.add55ToManualInput,

        // Import
        importData: importState.importData,
        setImportData: importState.setImportData,
        selectedPhoneCols: importState.selectedPhoneCols,
        setSelectedPhoneCols: importState.setSelectedPhoneCols,
        selectedNameCol: importState.selectedNameCol,
        setSelectedNameCol: importState.setSelectedNameCol,
        importing: importState.importing,
        showColumnSelector: importState.showColumnSelector,
        setShowColumnSelector: importState.setShowColumnSelector,
        importProgress: importState.importProgress,
        importLabel: importState.importLabel,
        showFullPreview: importState.showFullPreview,
        setShowFullPreview: importState.setShowFullPreview,
        isReadingFile: importState.isReadingFile,
        phoneColSearch: importState.phoneColSearch,
        setPhoneColSearch: importState.setPhoneColSearch,
        nameColSearch: importState.nameColSearch,
        setNameColSearch: importState.setNameColSearch,
        handleFileUpload: importState.handleFileUpload,
        processMappedImport: importState.processMappedImport
    };
}
