import React, { useState } from 'react';
import { FiSlash } from 'react-icons/fi';
import ConfirmModal from '../ConfirmModal';
import { useBlockedContacts } from './hooks/useBlockedContacts';
import KeywordSection from './components/KeywordSection';
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
        setConfirmModal({
            isOpen: true,
            title: 'Desbloquear Contato',
            message: `Tem certeza que deseja remover o bloqueio do número ${contact?.phone}?`,
            confirmText: 'Desbloquear',
            isDangerous: true,
            onConfirm: async () => {
                const success = await hook.performUnblock(contactId);
                if (success) {
                    // toast is handled in hook or here? 
                    // Let's keep it in hook to reduce code here.
                }
            }
        });
    };

    const confirmBulkDelete = () => {
        setConfirmModal({
            isOpen: true,
            title: 'Desbloqueio em Massa',
            message: `Tem certeza que deseja desbloquear ${hook.selectedIds.size} contatos selecionados?`,
            confirmText: `Desbloquear ${hook.selectedIds.size}`,
            isDangerous: true,
            onConfirm: hook.handleBulkDelete
        });
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Seção de Gatilhos */}
            <KeywordSection 
                keywords={hook.keywords}
                newKeyword={hook.newKeyword}
                setNewKeyword={hook.setNewKeyword}
                addKeyword={hook.addKeyword}
                removeKeyword={hook.removeKeyword}
            />

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

            {/* Lista de Contatos */}
            <ContactList 
                loading={hook.loading}
                contacts={hook.contacts}
                filteredContacts={hook.filteredContacts}
                paginatedContacts={hook.paginatedContacts}
                searchTerm={hook.searchTerm}
                setSearchTerm={hook.setSearchTerm}
                selectedIds={hook.selectedIds}
                toggleSelectRow={hook.toggleSelectRow}
                toggleSelectAll={hook.toggleSelectAll}
                onBulkDelete={confirmBulkDelete}
                onUnblock={confirmUnblockSingle}
                currentPage={hook.currentPage}
                setCurrentPage={hook.setCurrentPage}
                itemsPerPage={hook.itemsPerPage}
                setItemsPerPage={hook.setItemsPerPage}
                totalPages={hook.totalPages}
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
