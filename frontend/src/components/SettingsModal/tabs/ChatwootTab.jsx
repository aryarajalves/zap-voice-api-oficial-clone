import React from 'react';
import ChatwootApiConfigSection from './Chatwoot/ChatwootApiConfigSection';
import ChatwootAgentsSection from './Chatwoot/ChatwootAgentsSection';
import ChatwootWebhookSection from './Chatwoot/ChatwootWebhookSection';
import ChatwootLabelsSection from './Chatwoot/ChatwootLabelsSection';

const ChatwootTab = ({
    user, activeClient, formData, handleChange, visibleFields, handleRevealSetting,
    agents, loadingAgents, newAgent, setNewAgent, handleAddAgent, isAddingAgent, setAgentToDelete,
    labels, loadingLabels, labelForm, setLabelForm, editingLabel, setEditingLabel, isAddingLabel,
    handleUpdateLabel, handleAddLabel, handleDeleteLabel, fetchAgents, fetchLabels
}) => {
    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* 1. Configurações da API do Chatwoot */}
            <ChatwootApiConfigSection
                user={user}
                formData={formData}
                handleChange={handleChange}
                visibleFields={visibleFields}
                handleRevealSetting={handleRevealSetting}
                fetchAgents={fetchAgents}
                loadingAgents={loadingAgents}
            />

            {/* 2. Gerenciamento de Atendentes */}
            <ChatwootAgentsSection
                user={user}
                formData={formData}
                newAgent={newAgent}
                setNewAgent={setNewAgent}
                handleAddAgent={handleAddAgent}
                isAddingAgent={isAddingAgent}
                agents={agents}
                loadingAgents={loadingAgents}
                setAgentToDelete={setAgentToDelete}
            />

            {/* 3. Webhook de Eventos Chatwoot */}
            <ChatwootWebhookSection
                user={user}
                activeClient={activeClient}
                formData={formData}
            />

            {/* 4. Gerenciamento de Etiquetas */}
            <ChatwootLabelsSection
                user={user}
                formData={formData}
                fetchLabels={fetchLabels}
                loadingLabels={loadingLabels}
                labelForm={labelForm}
                setLabelForm={setLabelForm}
                editingLabel={editingLabel}
                setEditingLabel={setEditingLabel}
                isAddingLabel={isAddingLabel}
                handleUpdateLabel={handleUpdateLabel}
                handleAddLabel={handleAddLabel}
                handleDeleteLabel={handleDeleteLabel}
                labels={labels}
            />
        </div>
    );
};

export default ChatwootTab;
