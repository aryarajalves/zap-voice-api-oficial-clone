import React, { useState, useEffect } from 'react';
import { resolveUrl, WEBHOOK_BASE_URL, META_APP_ID } from '../../../config';
import { useClient } from '../../../contexts/ClientContext';
import { useWhatsAppTabData } from '../hooks/useWhatsAppTabData';

// Import dos Subcomponentes Modularizados
import WhatsAppApiSubTab from '../components/whatsapp/WhatsAppApiSubTab';
import WhatsAppProfileSection from '../components/WhatsAppProfileSection';
import WhatsAppAutomationSubTab from '../components/whatsapp/WhatsAppAutomationSubTab';
import WhatsAppRemindersSubTab from '../components/whatsapp/WhatsAppRemindersSubTab';

const SUB_TABS = [
    { id: 'api', label: 'Conexão & Webhook' },
    { id: 'profile', label: 'Perfil Comercial' },
    { id: 'automation', label: 'Automação & IA' },
    { id: 'reminders', label: 'Lembretes de Agenda' }
];

const WhatsAppTab = ({
    user, formData, setFormData, handleChange, visibleFields, handleRevealSetting, copyToClipboard,
    whatsappProfile, whatsappAbout, setWhatsappAbout, handleUpdateWhatsAppAbout, isUpdatingWaAbout,
    whatsappName, setWhatsappName, handleUpdateWhatsAppName, isUpdatingWaName,
    handleRegisterWhatsAppNumber, isRegisteringWa, handleWhatsAppLogoUpload, isUpdatingWaLogo
}) => {
    const { activeClient } = useClient();
    const [waSubTab, setWaSubTab] = useState('api');

    const isUniqueWebhook = formData.WA_USE_UNIQUE_WEBHOOK === true || formData.WA_USE_UNIQUE_WEBHOOK === 'true';
    const baseWebhookUrl = formData.WEBHOOK_BASE_URL || WEBHOOK_BASE_URL || resolveUrl('/').replace(/\/$/, '');
    const metaWebhookUrl = isUniqueWebhook && formData.WA_WEBHOOK_SLUG
        ? `${baseWebhookUrl}/api/meta/${formData.WA_WEBHOOK_SLUG}`.replace('http://', 'https://')
        : `${baseWebhookUrl}/api/meta`.replace('http://', 'https://');

    const {
        templates,
        availableLabels,
        funnels,
        appointmentParams,
        buttonActions,
        handleParamChange,
        handleButtonActionChange
    } = useWhatsAppTabData({ activeClient, formData, handleChange });

    // Inicialização do SDK da Meta (Facebook JS SDK)
    useEffect(() => {
        if (!META_APP_ID) return;
        
        window.fbAsyncInit = function() {
            window.FB.init({
                appId: META_APP_ID,
                cookie: true,
                xfbml: true,
                version: 'v19.0'
            });
        };

        (function(d, s, id) {
            var js, fjs = d.getElementsByTagName(s)[0];
            if (d.getElementById(id)) return;
            js = d.createElement(s); js.id = id;
            js.src = "https://connect.facebook.net/pt_BR/sdk.js";
            fjs.parentNode.insertBefore(js, fjs);
        }(document, 'script', 'facebook-jssdk'));
    }, []);

    const isAuthorized = ['super_admin', 'admin', 'administrator', 'owner'].includes(user?.role);

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Sub-abas horizontais */}
            <div className="flex flex-wrap gap-2 p-1.5 bg-gray-100/50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/5 mb-4">
                {SUB_TABS.map(tab => (
                    <button
                        key={tab.id}
                        type="button"
                        onClick={() => setWaSubTab(tab.id)}
                        className={`flex-1 min-w-[120px] py-2 px-3 text-xs font-bold rounded-xl transition-all duration-200 ${
                            waSubTab === tab.id
                                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25'
                                : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/5'
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Conteúdo das Sub-abas */}
            {isAuthorized && (
                <div className="space-y-4">
                    {waSubTab === 'api' && (
                        <WhatsAppApiSubTab
                            formData={formData}
                            setFormData={setFormData}
                            handleChange={handleChange}
                            visibleFields={visibleFields}
                            handleRevealSetting={handleRevealSetting}
                            copyToClipboard={copyToClipboard}
                            activeClient={activeClient}
                            isUniqueWebhook={isUniqueWebhook}
                            metaWebhookUrl={metaWebhookUrl}
                        />
                    )}

                    {waSubTab === 'profile' && (
                        <div className="space-y-4 animate-in fade-in duration-200">
                            <WhatsAppProfileSection
                                formData={formData}
                                handleChange={handleChange}
                                whatsappProfile={whatsappProfile}
                                whatsappName={whatsappName}
                                setWhatsappName={setWhatsappName}
                                handleUpdateWhatsAppName={handleUpdateWhatsAppName}
                                isUpdatingWaName={isUpdatingWaName}
                                whatsappAbout={whatsappAbout}
                                setWhatsappAbout={setWhatsappAbout}
                                handleUpdateWhatsAppAbout={handleUpdateWhatsAppAbout}
                                isUpdatingWaAbout={isUpdatingWaAbout}
                                handleRegisterWhatsAppNumber={handleRegisterWhatsAppNumber}
                                isRegisteringWa={isRegisteringWa}
                                handleWhatsAppLogoUpload={handleWhatsAppLogoUpload}
                                isUpdatingWaLogo={isUpdatingWaLogo}
                                copyToClipboard={copyToClipboard}
                            />
                        </div>
                    )}

                    {waSubTab === 'automation' && (
                        <WhatsAppAutomationSubTab
                            formData={formData}
                            handleChange={handleChange}
                            availableLabels={availableLabels}
                        />
                    )}

                    {waSubTab === 'reminders' && (
                        <WhatsAppRemindersSubTab
                            formData={formData}
                            handleChange={handleChange}
                            templates={templates}
                            funnels={funnels}
                            appointmentParams={appointmentParams}
                            buttonActions={buttonActions}
                            handleParamChange={handleParamChange}
                            handleButtonActionChange={handleButtonActionChange}
                        />
                    )}
                </div>
            )}
        </div>
    );
};

export default WhatsAppTab;
