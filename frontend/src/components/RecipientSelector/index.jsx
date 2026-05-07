
import React, { useEffect } from 'react';
import { useRecipientSelector } from './hooks/useRecipientSelector';
import Tabs from './components/Tabs';
import ManualInput from './components/ManualInput';
import FileUpload from './components/FileUpload';
import TagSelector from './components/TagSelector';
import ContactList from './components/ContactList';
import ColumnSelectorModal from './components/Modals/ColumnSelectorModal';
import ProcessingOverlay from './components/Modals/ProcessingOverlay';

const RecipientSelector = ({
    onSelect,
    selectedInbox,
    requireOpenWindow = false,
    title = "Destinatários",
    showValidation = true,
    exclusionList = [],
    templateVariables = []
}) => {
    const hook = useRecipientSelector({
        onSelect,
        selectedInbox,
        requireOpenWindow,
        templateVariables,
        exclusionList
    });

    // Prevent page reload during validation/processing
    useEffect(() => {
        const handleBeforeUnload = (e) => {
            if (hook.isValidating || hook.isProcessing) {
                e.preventDefault();
                e.returnValue = '';
            }
        };
        if (hook.isValidating || hook.isProcessing) {
            window.addEventListener('beforeunload', handleBeforeUnload);
        }
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [hook.isValidating, hook.isProcessing]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (hook.isSaveTagsDropdownOpen && !event.target.closest('.save-tags-dropdown-container')) {
                hook.setIsSaveTagsDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [hook.isSaveTagsDropdownOpen, hook.setIsSaveTagsDropdownOpen]);

    return (
        <div className="space-y-6">
            <h3 className="text-xl font-black text-white tracking-tight flex items-center gap-4 px-2">
                {title}
            </h3>
            <div className="bg-slate-900/40 backdrop-blur-sm p-1 rounded-3xl border border-white/5 p-8 relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent opacity-50"></div>

                <Tabs mode={hook.mode} setMode={hook.setMode} />

                {hook.mode === 'manual' ? (
                    <ManualInput 
                        inputText={hook.inputText}
                        setInputText={hook.setInputText}
                        parseContacts={hook.parseContacts}
                        add55ToInput={hook.add55ToInput}
                        templateVariables={templateVariables}
                    />
                ) : hook.mode === 'upload' ? (
                    <FileUpload 
                        handleFileUpload={hook.handleFileUpload} 
                        templateVariables={templateVariables}
                        fileVariables={hook.fileVariables}
                        setFileVariables={hook.setFileVariables}
                        activeDropdown={hook.activeDropdown}
                        setActiveDropdown={hook.setActiveDropdown}
                    />
                ) : (
                    <TagSelector 
                        selectedTag={hook.selectedTag}
                        setSelectedTag={hook.setSelectedTag}
                        availableTags={hook.availableTags}
                        isLoadingTags={hook.isLoadingTags}
                        templateVariables={templateVariables}
                        tagVariables={hook.tagVariables}
                        setTagVariables={hook.setTagVariables}
                        activeDropdown={hook.activeDropdown}
                        setActiveDropdown={hook.setActiveDropdown}
                        loadContactsByTag={hook.loadContactsByTag}
                        isProcessing={hook.isProcessing}
                    />
                )}
            </div>

            {hook.contacts.length > 0 && (
                <ContactList 
                    title={title}
                    contacts={hook.contacts}
                    setContacts={hook.setContacts}
                    searchTerm={hook.searchTerm}
                    setSearchTerm={hook.setSearchTerm}
                    dddSearch={hook.dddSearch}
                    setDddSearch={hook.setDddSearch}
                    filterOpenOnly={hook.filterOpenOnly}
                    setFilterOpenOnly={hook.setFilterOpenOnly}
                    filterBlockedOnly={hook.filterBlockedOnly}
                    setFilterBlockedOnly={hook.setFilterBlockedOnly}
                    blockedCount={hook.blockedCount}
                    addBrazilCode={hook.addBrazilCode}
                    copyToClipboard={hook.copyToClipboard}
                    clearAll={hook.clearAll}
                    saveLeadsTags={hook.saveLeadsTags}
                    setSaveLeadsTags={hook.setSaveLeadsTags}
                    isSaveTagsDropdownOpen={hook.isSaveTagsDropdownOpen}
                    setIsSaveTagsDropdownOpen={hook.setIsSaveTagsDropdownOpen}
                    saveTagsSearch={hook.saveTagsSearch}
                    setSaveTagsSearch={hook.setSaveTagsSearch}
                    availableTags={hook.availableTags}
                    handleSaveToLeads={hook.handleSaveToLeads}
                    isSavingLeads={hook.isSavingLeads}
                    selectedList={hook.selectedList}
                    displayedContacts={hook.displayedContacts}
                    filteredContacts={hook.filteredContacts}
                    displayLimit={hook.displayLimit}
                    setDisplayLimit={hook.setDisplayLimit}
                    templateVariables={templateVariables}
                    showValidation={showValidation}
                    removeContact={hook.removeContact}
                    startValidation={hook.startValidation}
                    isValidating={hook.isValidating}
                    progress={hook.progress}
                />
            )}

            <ProcessingOverlay 
                isVisible={hook.isReadingFile}
                title="Lendo Arquivo"
                message="Extraindo dados das planilhas..."
                type="blue"
            />

            <ProcessingOverlay 
                isVisible={hook.isProcessing}
                title="Processando"
                message={hook.workingMessage || 'Finalizando importação...'}
                type="emerald"
            />

            <ProcessingOverlay 
                isVisible={hook.isValidating}
                title="Validando Público"
                message="Sincronizando com o banco do Chatwoot para identificar janelas ativas."
                type="blue"
                progress={hook.progress}
            />

            <ProcessingOverlay 
                isVisible={hook.isWorking}
                title="Processando Lista"
                message={hook.workingMessage || 'Aguarde um instante...'}
                type="emerald"
            />

            <ColumnSelectorModal 
                isVisible={hook.showColumnSelector}
                csvData={hook.csvData}
                columnMapping={hook.columnMapping}
                setColumnMapping={hook.setColumnMapping}
                templateVariables={templateVariables}
                onConfirm={hook.confirmColumns}
                onClose={() => hook.setShowColumnSelector(false)}
            />
        </div>
    );
};

export default RecipientSelector;
