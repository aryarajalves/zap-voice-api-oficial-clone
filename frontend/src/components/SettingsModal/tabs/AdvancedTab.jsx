import React from 'react';

// Subcomponentes Modulares
import ManyChatTokensSection from './AdvancedTab/ManyChatTokensSection';
import MemoryWebhookSection from './AdvancedTab/MemoryWebhookSection';
import ChatMessagesWebhookSection from './AdvancedTab/ChatMessagesWebhookSection';
import MemoryLogsModal from './AdvancedTab/MemoryLogsModal';
import ChatLogsModal from './AdvancedTab/ChatLogsModal';

const AdvancedTab = ({
    user, formData, handleChange, visibleFields, handleRevealSetting,
    showContactsTable, setShowContactsTable, loadingContacts, fetchSyncedContacts, setContactsPage,
    syncedContacts, contactsPage, contactsLimit, contactsTotal, setContactsLimit,
    testingWebhook, handleTestWebhook, testingChatWebhook, handleTestChatWebhook, showMemoryLogsTable, setShowMemoryLogsTable,
    loadingMemoryLogs, fetchMemoryLogs, setMemoryLogsPage, memoryLogs,
    memoryLogsPage, memoryLogsLimit, memoryLogsTotal, setMemoryLogsLimit,
    showChatLogsTable, setShowChatLogsTable, loadingChatLogs, fetchChatLogs, setChatLogsPage,
    chatLogs, chatLogsPage, chatLogsLimit, chatLogsTotal, setChatLogsLimit
}) => {
    const isSuperAdminOrAdmin = ['super_admin', 'admin', 'administrator', 'owner'].includes(user?.role);

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {isSuperAdminOrAdmin && (
                <>
                    {/* ManyChat API Key Section */}
                    <ManyChatTokensSection
                        formData={formData}
                        handleChange={handleChange}
                        visibleFields={visibleFields}
                    />

                    {/* Webhook de Memória do Agente */}
                    <MemoryWebhookSection
                        formData={formData}
                        handleChange={handleChange}
                        testingWebhook={testingWebhook}
                        handleTestWebhook={handleTestWebhook}
                        setShowMemoryLogsTable={setShowMemoryLogsTable}
                        setMemoryLogsPage={setMemoryLogsPage}
                        fetchMemoryLogs={fetchMemoryLogs}
                    />

                    {/* Webhook de Integração de Mensagens (AgentFlow) */}
                    <ChatMessagesWebhookSection
                        formData={formData}
                        handleChange={handleChange}
                        testingChatWebhook={testingChatWebhook}
                        handleTestChatWebhook={handleTestChatWebhook}
                        setShowChatLogsTable={setShowChatLogsTable}
                        setChatLogsPage={setChatLogsPage}
                        fetchChatLogs={fetchChatLogs}
                    />
                </>
            )}

            {/* Modal de Logs de Sincronização de Memória */}
            <MemoryLogsModal
                showMemoryLogsTable={showMemoryLogsTable}
                setShowMemoryLogsTable={setShowMemoryLogsTable}
                loadingMemoryLogs={loadingMemoryLogs}
                fetchMemoryLogs={fetchMemoryLogs}
                setMemoryLogsPage={setMemoryLogsPage}
                memoryLogs={memoryLogs}
                memoryLogsPage={memoryLogsPage}
                memoryLogsLimit={memoryLogsLimit}
                memoryLogsTotal={memoryLogsTotal}
                setMemoryLogsLimit={setMemoryLogsLimit}
            />

            {/* Modal de Logs de Integração de Mensagens (AgentFlow) */}
            <ChatLogsModal
                showChatLogsTable={showChatLogsTable}
                setShowChatLogsTable={setShowChatLogsTable}
                loadingChatLogs={loadingChatLogs}
                fetchChatLogs={fetchChatLogs}
                setChatLogsPage={setChatLogsPage}
                chatLogs={chatLogs}
                chatLogsPage={chatLogsPage}
                chatLogsLimit={chatLogsLimit}
                chatLogsTotal={chatLogsTotal}
                setChatLogsLimit={setChatLogsLimit}
            />
        </div>
    );
};

export default AdvancedTab;
