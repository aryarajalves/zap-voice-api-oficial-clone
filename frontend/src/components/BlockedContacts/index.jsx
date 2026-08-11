import React, { useState } from 'react';
import { FiSlash } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import ConfirmModal from '../ConfirmModal';
import { useBlockedContacts } from './hooks/useBlockedContacts';
import BlockedTabs from './components/BlockedTabs';
import ManualInput from './components/ManualInput';
import FileUpload from './components/FileUpload';
import ColumnSelector from './components/ColumnSelector';
import ContactList from './components/ContactList';
import FullPreviewModal from './components/FullPreviewModal';
import { ProgressOverlay, LoadingOverlay } from './components/Overlays';

export default function BlockedContactsModular() {
    const hook = useBlockedContacts();
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false, title: '', message: '', onConfirm: () => { }, isDangerous: false, confirmText: 'Confirmar'
    });

    const closeConfirm = () => setConfirmModal(prev => ({ ...prev, isOpen: false }));

    const confirmUnblockSingle = (contactId) => {
        const contact = hook.contacts.find(c => c.id === contactId);
        const isResting = hook.listTab === 'resting';
        setConfirmModal({
            isOpen: true,
            title: isResting ? 'Remover do Repouso' : 'Desbloquear Contato',
            message: isResting 
                ? `Tem certeza que deseja tirar o número ${contact?.phone} do repouso?`
                : `Tem certeza que deseja remover o bloqueio do número ${contact?.phone}?`,
            confirmText: isResting ? 'Remover' : 'Desbloquear',
            isDangerous: true,
            onConfirm: async () => {
                const success = await hook.performUnblock(contactId);
                if (success) {
                    toast.success(isResting ? 'Contato removido do repouso!' : 'Contato desbloqueado!');
                }
            }
        });
    };

    const confirmBulkDelete = () => {
        const isResting = hook.listTab === 'resting';
        setConfirmModal({
            isOpen: true,
            title: isResting ? 'Remover em Massa' : 'Desbloqueio em Massa',
            message: isResting 
                ? `Tem certeza que deseja remover do repouso os ${hook.selectedIds.size} contatos selecionados?`
                : `Tem certeza que deseja desbloquear ${hook.selectedIds.size} contatos selecionados?`,
            confirmText: isResting ? `Remover ${hook.selectedIds.size}` : `Desbloquear ${hook.selectedIds.size}`,
            isDangerous: true,
            onConfirm: hook.handleBulkDelete
        });
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">

            {/* Seção de Adição */}
            <div className="bg-white/10 backdrop-blur-md p-6 rounded-2xl shadow-sm border border-white/5 transition-all duration-200">
                <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2 mb-4">
                    <FiSlash className="text-red-500" />
                    Bloqueio Manual de Números
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                    Adicione contatos que <strong>NUNCA</strong> devem receber mensagens.
                </p>

                <BlockedTabs mode={hook.mode} setMode={hook.setMode} />

                {hook.mode === 'manual' && (
                    <ManualInput 
                        manualInput={hook.manualInput}
                        setManualInput={hook.setManualInput}
                        handleBlockManual={hook.handleBlockManual}
                        adding={hook.adding}
                        add55ToManualInput={hook.add55ToManualInput}
                        blockType={hook.blockType}
                        setBlockType={hook.setBlockType}
                    />
                )}

                {hook.mode === 'upload' && !hook.showColumnSelector && (
                    <FileUpload handleFileUpload={hook.handleFileUpload} />
                )}

                {hook.mode === 'upload' && hook.showColumnSelector && (
                    <ColumnSelector 
                        importData={hook.importData}
                        selectedPhoneCols={hook.selectedPhoneCols}
                        setSelectedPhoneCols={hook.setSelectedPhoneCols}
                        selectedNameCol={hook.selectedNameCol}
                        setSelectedNameCol={hook.setSelectedNameCol}
                        phoneColSearch={hook.phoneColSearch}
                        setPhoneColSearch={hook.setPhoneColSearch}
                        nameColSearch={hook.nameColSearch}
                        setNameColSearch={hook.setNameColSearch}
                        setShowFullPreview={hook.setShowFullPreview}
                        processMappedImport={hook.processMappedImport}
                        importing={hook.importing}
                        onCancel={() => {
                            hook.setShowColumnSelector(false);
                            hook.setImportData({ headers: [], rows: [], nonEmptyIndices: [] });
                        }}
                    />
                )}
            </div>

            {/* Abas de Listagem */}
            <div className="flex bg-gray-100 dark:bg-gray-900/60 p-1 rounded-xl w-80 select-none mb-1">
                <button
                    onClick={() => hook.setListTab('permanent')}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                        hook.listTab === 'permanent' 
                            ? 'bg-white dark:bg-gray-800 shadow-sm text-red-600 dark:text-red-400' 
                            : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'
                    }`}
                >
                    🚫 Permanente
                </button>
                <button
                    onClick={() => hook.setListTab('resting')}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                        hook.listTab === 'resting' 
                            ? 'bg-white dark:bg-gray-800 shadow-sm text-amber-600 dark:text-amber-400' 
                            : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'
                    }`}
                >
                    ⏰ Em Repouso
                </button>
            </div>

            {/* Lista de Contatos */}
            <ContactList
                loading={hook.loading}
                contacts={hook.contacts}
                filteredContacts={hook.filteredContacts}
                paginatedContacts={hook.paginatedContacts}
                searchTerm={hook.searchTerm}
                setSearchTerm={hook.setSearchTerm}
                reasonFilter={hook.reasonFilter}
                setReasonFilter={hook.setReasonFilter}
                selectedIds={hook.selectedIds}
                toggleSelectRow={hook.toggleSelectRow}
                toggleSelectAll={hook.toggleSelectAll}
                onBulkDelete={confirmBulkDelete}
                onUnblock={confirmUnblockSingle}
                onExport={hook.exportBlockedContacts}
                currentPage={hook.currentPage}
                setCurrentPage={hook.setCurrentPage}
                itemsPerPage={hook.itemsPerPage}
                setItemsPerPage={hook.setItemsPerPage}
                totalPages={hook.totalPages}
                listTab={hook.listTab}
            />

            {/* Modais e Overlays */}
            <ConfirmModal 
                isOpen={confirmModal.isOpen}
                title={confirmModal.title}
                message={confirmModal.message}
                confirmText={confirmModal.confirmText}
                isDangerous={confirmModal.isDangerous}
                onClose={closeConfirm}
                onConfirm={() => {
                    confirmModal.onConfirm();
                    closeConfirm();
                }}
            />

            <FullPreviewModal 
                isOpen={hook.showFullPreview}
                onClose={() => hook.setShowFullPreview(false)}
                importData={hook.importData}
                selectedPhoneCols={hook.selectedPhoneCols}
                selectedNameCol={hook.selectedNameCol}
            />

            <ProgressOverlay 
                importing={hook.importing}
                importLabel={hook.importLabel}
                importProgress={hook.importProgress}
            />

            <LoadingOverlay 
                visible={hook.isReadingFile}
                message={{ title: 'Lendo Arquivo', subtitle: 'Estamos processando as colunas do seu arquivo...' }}
            />

            <LoadingOverlay 
                visible={hook.isWorking}
                message={{ title: 'Processando', subtitle: hook.workingMessage }}
            />
        </div>
    );
}
