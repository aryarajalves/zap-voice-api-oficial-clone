import React from 'react';
import { FiX, FiSettings, FiBook, FiLayout, FiMessageSquare, FiSmartphone, FiCpu } from 'react-icons/fi';
import { toast } from 'react-hot-toast';

// Hooks
import { useSettingsLogic } from './hooks/useSettingsLogic';

// Components
import TabButton from './components/TabButton';
import SettingsGuide from './components/SettingsGuide';
import DeleteAgentModal from './components/DeleteAgentModal';

// Tabs
import GeralTab from './tabs/GeralTab';
import ChatwootTab from './tabs/ChatwootTab';
import WhatsAppTab from './tabs/WhatsAppTab';
import AdvancedTab from './tabs/AdvancedTab';

const SettingsModal = ({ isOpen, onClose, onSaved }) => {
    const logic = useSettingsLogic(isOpen, onClose, onSaved);

    if (!isOpen) return null;

    const copyToClipboard = (text, label) => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        toast.success(`${label} copiado!`);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white dark:bg-[#1e293b] w-full max-w-4xl h-[90vh] flex flex-col rounded-[2.5rem] shadow-2xl overflow-hidden border border-gray-100 dark:border-white/5 animate-in zoom-in-95 duration-300">
                {/* Header */}
                <div className="p-6 flex items-center justify-between border-b border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/5">
                    <div className="flex items-center gap-3">
                        <FiSettings className="text-blue-500 w-6 h-6" />
                        <h2 className="text-xl font-bold text-gray-800 dark:text-white tracking-tight">Configurações do Sistema</h2>
                    </div>
                    
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => logic.setIsSettingsGuideOpen(true)}
                            className="flex items-center gap-2 px-4 py-1.5 bg-blue-600/10 text-blue-600 dark:text-blue-400 rounded-xl hover:bg-blue-600/20 transition-all font-bold text-sm border border-blue-600/20"
                        >
                            <FiBook size={16} />
                            Guia
                        </button>
                        
                        <button
                            type="button"
                            onClick={onClose}
                            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl transition-all"
                        >
                            <FiX size={24} />
                        </button>
                    </div>
                </div>

                {/* Main Content Area */}
                <form onSubmit={logic.handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
                    {/* Horizontal Tab Navigation */}
                    <div className="px-6 py-4 bg-gray-50/30 dark:bg-[#1f2937]/50 border-b border-gray-100 dark:border-white/5 overflow-x-auto custom-scrollbar">
                        <div className="flex items-center gap-2">
                            <TabButton 
                                id="geral" 
                                activeTab={logic.activeTab} 
                                onClick={logic.setActiveTab} 
                                label="Básico" 
                                icon={FiLayout} 
                            />
                            <TabButton 
                                id="chatwoot" 
                                activeTab={logic.activeTab} 
                                onClick={logic.setActiveTab} 
                                label="Chatwoot" 
                                icon={FiMessageSquare} 
                            />
                            <TabButton 
                                id="whatsapp" 
                                activeTab={logic.activeTab} 
                                onClick={logic.setActiveTab} 
                                label="WhatsApp" 
                                icon={FiSmartphone} 
                            />
                            <TabButton 
                                id="advanced" 
                                activeTab={logic.activeTab} 
                                onClick={logic.setActiveTab} 
                                label="Avançado" 
                                icon={FiCpu} 
                            />
                        </div>
                    </div>

                    <div className="flex-1 flex flex-col min-h-0">

                        {/* Content Pane */}
                        <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
                            {logic.activeTab === 'geral' && (
                                <GeralTab 
                                    user={logic.user}
                                    formData={logic.formData}
                                    setFormData={logic.setFormData}
                                    handleChange={logic.handleChange}
                                    handleLogoUpload={logic.handleLogoUpload}
                                    isUploading={logic.isUploading}
                                    profileData={logic.profileData}
                                    handleProfileChange={logic.handleProfileChange}
                                    showPassword={logic.showPassword}
                                    setShowPassword={logic.setShowPassword}
                                />
                            )}

                            {logic.activeTab === 'chatwoot' && (
                                <ChatwootTab 
                                    user={logic.user}
                                    activeClient={logic.activeClient}
                                    formData={logic.formData}
                                    handleChange={logic.handleChange}
                                    visibleFields={logic.visibleFields}
                                    handleRevealSetting={logic.handleRevealSetting}
                                    agents={logic.agents}
                                    loadingAgents={logic.loadingAgents}
                                    newAgent={logic.newAgent}
                                    setNewAgent={logic.setNewAgent}
                                    handleAddAgent={logic.handleAddAgent}
                                    isAddingAgent={logic.isAddingAgent}
                                    setAgentToDelete={logic.setAgentToDelete}
                                    labels={logic.labels}
                                    loadingLabels={logic.loadingLabels}
                                    labelForm={logic.labelForm}
                                    setLabelForm={logic.setLabelForm}
                                    editingLabel={logic.editingLabel}
                                    setEditingLabel={logic.setEditingLabel}
                                    isAddingLabel={logic.isAddingLabel}
                                    handleUpdateLabel={logic.handleUpdateLabel}
                                    handleAddLabel={logic.handleAddLabel}
                                    handleDeleteLabel={logic.handleDeleteLabel}
                                    fetchAgents={logic.fetchAgents}
                                    fetchLabels={logic.fetchLabels}
                                />
                            )}

                            {logic.activeTab === 'whatsapp' && (
                                <WhatsAppTab 
                                    user={logic.user}
                                    formData={logic.formData}
                                    handleChange={logic.handleChange}
                                    visibleFields={logic.visibleFields}
                                    handleRevealSetting={logic.handleRevealSetting}
                                    copyToClipboard={copyToClipboard}
                                    whatsappProfile={logic.whatsappProfile}
                                    whatsappAbout={logic.whatsappAbout}
                                    setWhatsappAbout={logic.setWhatsappAbout}
                                    handleUpdateWhatsAppAbout={logic.handleUpdateWhatsAppAbout}
                                    isUpdatingWaAbout={logic.isUpdatingWaAbout}
                                    whatsappName={logic.whatsappName}
                                    setWhatsappName={logic.setWhatsappName}
                                    handleUpdateWhatsAppName={logic.handleUpdateWhatsAppName}
                                    isUpdatingWaName={logic.isUpdatingWaName}
                                    handleRegisterWhatsAppNumber={logic.handleRegisterWhatsAppNumber}
                                    isRegisteringWa={logic.isRegisteringWa}
                                    handleWhatsAppLogoUpload={logic.handleWhatsAppLogoUpload}
                                    isUpdatingWaLogo={logic.isUpdatingWaLogo}
                                />
                            )}

                            {logic.activeTab === 'advanced' && (
                                <AdvancedTab 
                                    user={logic.user}
                                    formData={logic.formData}
                                    handleChange={logic.handleChange}
                                    visibleFields={logic.visibleFields}
                                    handleRevealSetting={logic.handleRevealSetting}
                                    showContactsTable={logic.showContactsTable}
                                    setShowContactsTable={logic.setShowContactsTable}
                                    loadingContacts={logic.loadingContacts}
                                    fetchSyncedContacts={logic.fetchSyncedContacts}
                                    setContactsPage={logic.setContactsPage}
                                    syncedContacts={logic.syncedContacts}
                                    contactsPage={logic.contactsPage}
                                    contactsLimit={logic.contactsLimit}
                                    contactsTotal={logic.contactsTotal}
                                    setContactsLimit={logic.setContactsLimit}
                                    testingWebhook={logic.testingWebhook}
                                    handleTestWebhook={logic.handleTestWebhook}
                                    showMemoryLogsTable={logic.showMemoryLogsTable}
                                    setShowMemoryLogsTable={logic.setShowMemoryLogsTable}
                                    loadingMemoryLogs={logic.loadingMemoryLogs}
                                    fetchMemoryLogs={logic.fetchMemoryLogs}
                                    setMemoryLogsPage={logic.setMemoryLogsPage}
                                    memoryLogs={logic.memoryLogs}
                                    memoryLogsPage={logic.memoryLogsPage}
                                    memoryLogsLimit={logic.memoryLogsLimit}
                                    memoryLogsTotal={logic.memoryLogsTotal}
                                    setMemoryLogsLimit={logic.setMemoryLogsLimit}
                                />
                            )}
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="p-6 flex justify-end gap-3 border-t border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-[#0f172a]">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-5 py-2.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg font-medium transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={logic.loading}
                            className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 shadow-md hover:shadow-lg transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {logic.loading ? (
                                <>
                                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Salvando...
                                </>
                            ) : (
                                "Salvar Configurações"
                            )}
                        </button>
                    </div>
                </form>
            </div>

            {/* Modals */}
            <SettingsGuide 
                isOpen={logic.isSettingsGuideOpen} 
                onClose={() => logic.setIsSettingsGuideOpen(false)} 
            />
            
            <DeleteAgentModal 
                agent={logic.agentToDelete} 
                onCancel={() => logic.setAgentToDelete(null)} 
                onConfirm={logic.confirmDeleteAgent} 
            />
        </div>
    );
};

export default SettingsModal;
