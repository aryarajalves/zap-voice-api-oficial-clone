import React, { useEffect } from 'react';
import { FiX, FiSettings, FiBook, FiLayout, FiSmartphone, FiCpu, FiInstagram, FiKey, FiTag } from 'react-icons/fi';
import { toast } from 'react-hot-toast';

// Hooks
import { useSettingsLogic } from './hooks/useSettingsLogic';

// Components
import TabButton from './components/TabButton';
import SettingsGuide from './components/SettingsGuide';

// Tabs
import GeralTab from './tabs/GeralTab';
import WhatsAppTab from './tabs/WhatsAppTab';
import InstagramTab from './tabs/InstagramTab';
import AdvancedTab from './tabs/AdvancedTab';
import ApiKeysTab from './tabs/ApiKeysTab';
import LabelsTab from './tabs/LabelsTab';

const SettingsModal = ({ isOpen, onClose, onSaved }) => {
    const logic = useSettingsLogic(isOpen, onClose, onSaved);

    useEffect(() => {
        const mainEl = document.querySelector('main');
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            if (mainEl) mainEl.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
            if (mainEl) mainEl.style.overflow = 'auto';
        }
        return () => {
            document.body.style.overflow = 'unset';
            if (mainEl) mainEl.style.overflow = 'auto';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    const copyToClipboard = (text, label) => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        toast.success(`${label} copiado!`);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white dark:bg-[#1e293b] w-full max-w-5xl h-[85vh] flex rounded-[2.5rem] shadow-2xl overflow-hidden border border-gray-100 dark:border-white/5 animate-in zoom-in-95 duration-300">
                
                {/* 1. Barra Lateral de Navegação (Esquerda) */}
                <div className="w-64 bg-gray-50/50 dark:bg-white/5 border-r border-gray-100 dark:border-white/5 flex flex-col h-full shrink-0">
                    {/* Header da Barra Lateral */}
                    <div className="p-6 border-b border-gray-100 dark:border-white/5 flex items-center gap-3">
                        <FiSettings className="text-blue-500 w-5 h-5 shrink-0" />
                        <h2 className="text-base font-bold text-gray-800 dark:text-white tracking-tight">Configurações</h2>
                    </div>

                    {/* Lista Vertical de Abas */}
                    <div className="flex-1 py-4 px-4 overflow-y-auto space-y-1.5 custom-scrollbar">
                        <TabButton 
                            id="geral" 
                            activeTab={logic.activeTab} 
                            onClick={logic.setActiveTab} 
                            label="Básico" 
                            icon={FiLayout} 
                        />
                        {logic.user?.role !== 'user' && logic.user?.role !== 'premium' && (
                            <>
                                <TabButton 
                                    id="whatsapp" 
                                    activeTab={logic.activeTab} 
                                    onClick={logic.setActiveTab} 
                                    label="WhatsApp" 
                                    icon={FiSmartphone} 
                                />
                                <TabButton 
                                    id="instagram" 
                                    activeTab={logic.activeTab} 
                                    onClick={logic.setActiveTab} 
                                    label="Instagram" 
                                    icon={FiInstagram} 
                                />
                                <TabButton 
                                    id="advanced" 
                                    activeTab={logic.activeTab} 
                                    onClick={logic.setActiveTab} 
                                    label="Avançado" 
                                    icon={FiCpu} 
                                />
                                <TabButton 
                                    id="api_tokens" 
                                    activeTab={logic.activeTab} 
                                    onClick={logic.setActiveTab} 
                                    label="Tokens de API" 
                                    icon={FiKey} 
                                />
                                <TabButton 
                                    id="marcadores" 
                                    activeTab={logic.activeTab} 
                                    onClick={logic.setActiveTab} 
                                    label="Marcadores" 
                                    icon={FiTag} 
                                />
                            </>
                        )}
                    </div>

                    {/* Rodapé da Barra Lateral com o Guia */}
                    <div className="p-4 border-t border-gray-100 dark:border-white/5">
                        <button
                            type="button"
                            onClick={() => logic.setIsSettingsGuideOpen(true)}
                            className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600/10 hover:bg-blue-600/20 text-blue-600 dark:text-blue-400 rounded-xl transition-all font-bold text-xs border border-blue-600/20"
                        >
                            <FiBook size={14} />
                            Guia de Configuração
                        </button>
                    </div>
                </div>

                {/* 2. Área de Conteúdo Principal (Direita) */}
                <form onSubmit={logic.handleSubmit} className="flex-1 flex flex-col h-full overflow-hidden">
                    {/* Header da Área de Conteúdo */}
                    <div className="px-6 py-4 flex items-center justify-between border-b border-gray-100 dark:border-white/5 bg-white dark:bg-[#1e293b]">
                        <span className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                            Aba Ativa: {logic.activeTab === 'geral' ? 'Básico' : logic.activeTab === 'whatsapp' ? 'WhatsApp' : logic.activeTab === 'instagram' ? 'Instagram' : logic.activeTab === 'advanced' ? 'Avançado' : logic.activeTab === 'api_tokens' ? 'Tokens de API' : 'Marcadores'}
                        </span>
                        <button
                            type="button"
                            onClick={onClose}
                            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-all"
                        >
                            <FiX size={20} />
                        </button>
                    </div>

                    {/* Painel do Conteúdo */}
                    <div className="flex-1 p-6 overflow-y-auto custom-scrollbar bg-white dark:bg-[#1e293b]">
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

                        {logic.activeTab === 'whatsapp' && (
                            <WhatsAppTab 
                                user={logic.user}
                                formData={logic.formData}
                                setFormData={logic.setFormData}
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

                        {logic.activeTab === 'instagram' && (
                            <InstagramTab 
                                user={logic.user}
                                formData={logic.formData}
                                handleChange={logic.handleChange}
                                visibleFields={logic.visibleFields}
                                handleRevealSetting={logic.handleRevealSetting}
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
                                testingChatWebhook={logic.testingChatWebhook}
                                handleTestChatWebhook={logic.handleTestChatWebhook}
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
                                showChatLogsTable={logic.showChatLogsTable}
                                setShowChatLogsTable={logic.setShowChatLogsTable}
                                loadingChatLogs={logic.loadingChatLogs}
                                fetchChatLogs={logic.fetchChatLogs}
                                setChatLogsPage={logic.setChatLogsPage}
                                chatLogs={logic.chatLogs}
                                chatLogsPage={logic.chatLogsPage}
                                chatLogsLimit={logic.chatLogsLimit}
                                chatLogsTotal={logic.chatLogsTotal}
                                setChatLogsLimit={logic.setChatLogsLimit}
                            />
                        )}

                        {logic.activeTab === 'api_tokens' && (
                            <ApiKeysTab 
                                user={logic.user}
                                activeClient={logic.activeClient}
                            />
                        )}

                        {logic.activeTab === 'marcadores' && (
                            <LabelsTab 
                                user={logic.user}
                                activeClient={logic.activeClient}
                            />
                        )}
                    </div>

                    {/* Footer Actions */}
                    <div className="p-6 flex justify-end gap-3 border-t border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-[#0f172a] shrink-0">
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
        </div>
    );
};

export default SettingsModal;
