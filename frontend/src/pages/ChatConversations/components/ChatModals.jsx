import React from 'react';
import MediaPreviewModal from '../MediaPreviewModal';
import DeleteConvoModal from '../DeleteConvoModal';
import BlockContactModal from '../../WebhookLeads/components/BlockContactModal';
import ResendAgentflowModal from '../ResendAgentflowModal';
import SendTemplateModal from '../SendTemplateModal';
import MaximizedInputModal from '../MaximizedInputModal';
import TriggerFunnelModal from '../TriggerFunnelModal';
import AutomationPipelineModal from '../../../components/TriggerHistory/components/AutomationPipelineModal';
import BulkTagModal from '../Modals/BulkTagModal';
import CancelFunnelModal from '../Modals/CancelFunnelModal';
import AiReportModal from '../Modals/AiReportModal';
import PrivateNoteMaximizedModal from '../Modals/PrivateNoteMaximizedModal';
import DeletePrivateNoteConfirmModal from '../Modals/DeletePrivateNoteConfirmModal';
import ClearChatConfirmModal from '../Modals/ClearChatConfirmModal';

export default function ChatModals({
    engine,
    selectedConvo,
    activeClient,
    mediaUploader,
    noteAndAi,
    chatOps,
    showTemplateModal,
    setShowTemplateModal,
    isMaximizedInputOpen,
    setIsMaximizedInputOpen,
    showFunnelModal,
    setShowFunnelModal,
    isCancelFunnelModalOpen,
    setIsCancelFunnelModalOpen,
    isCancelingFunnel,
    setIsCancelingFunnel,
    selectAllPages
}) {
    return (
        <>
            <MediaPreviewModal
                mediaPreview={engine.mediaPreview}
                previewCaption={engine.previewCaption}
                setPreviewCaption={engine.setPreviewCaption}
                isSendingMedia={engine.isSendingMedia}
                onClose={() => { engine.setMediaPreview(null); engine.setPreviewCaption(''); }}
                onSend={() => mediaUploader.sendMedia(engine.mediaPreview.file, engine.mediaPreview.messageType, engine.previewCaption)}
            />

            <DeleteConvoModal
                isOpen={!!engine.confirmDeleteConvos}
                isBulk={engine.confirmDeleteConvos === 'bulk'}
                selectedCount={selectAllPages ? engine.totalConvos : engine.selectedConvoIds.length}
                selectAllPages={selectAllPages}
                onClose={() => { engine.setConfirmDeleteConvos(null); engine.setDeletingConvoId(null); }}
                onConfirm={engine.confirmDeleteConvos === 'bulk' ? chatOps.handleDeleteSelectedConversations : () => chatOps.handleDeleteConversation(engine.deletingConvoId)}
            />

            <ClearChatConfirmModal
                isOpen={engine.isClearChatModalOpen}
                onClose={() => engine.setIsClearChatModalOpen(false)}
                onConfirm={() => selectedConvo && chatOps.handleClearConversationMessages(selectedConvo.id)}
                isClearing={engine.isClearingChat}
                contactName={selectedConvo?.contact_name || selectedConvo?.phone}
            />

            <BlockContactModal
                isOpen={engine.isBlockModalOpen}
                onClose={() => engine.setIsBlockModalOpen(false)}
                onConfirm={chatOps.handleConfirmBlockContact}
                isSaving={engine.isBlockingContact}
                count={1}
                selectAllPages={false}
                targetLabel={selectedConvo ? `${selectedConvo.contact_name || selectedConvo.phone} (${selectedConvo.phone})` : null}
            />

            <ResendAgentflowModal
                isOpen={engine.confirmResendAgentflow !== null}
                onClose={() => engine.setConfirmResendAgentflow(null)}
                onConfirm={async (editedContent) => {
                    const msgId = engine.confirmResendAgentflow;
                    engine.setConfirmResendAgentflow(null);
                    await chatOps.handleResendToAgentFlow(msgId, editedContent);
                }}
                initialContent={engine.messages?.find(m => m.id === engine.confirmResendAgentflow)?.content || ""}
            />

            <SendTemplateModal
                isOpen={showTemplateModal}
                onClose={() => setShowTemplateModal(false)}
                activeClient={activeClient}
                selectedConvo={selectedConvo}
                onSendSuccess={(sentMsg) => {
                    engine.setMessages(prev => [...prev, sentMsg]);
                    engine.setShouldScrollToBottom(true);
                }}
            />

            {selectedConvo && (
                <MaximizedInputModal
                    isOpen={isMaximizedInputOpen}
                    onClose={() => setIsMaximizedInputOpen(false)}
                    value={engine.newMessage}
                    onChange={engine.setNewMessage}
                    onSend={async (e, options) => {
                        if (!engine.newMessage.trim() || engine.isSending) return;
                        await engine.handleSendMessage(e, options);
                        setIsMaximizedInputOpen(false);
                    }}
                    isSending={engine.isSending}
                    contactName={selectedConvo.contact_name || selectedConvo.phone}
                    selectedConvo={selectedConvo}
                    activeClientId={activeClient?.id}
                />
            )}

            <PrivateNoteMaximizedModal
                isOpen={noteAndAi.isNoteModalMaximized}
                onClose={() => noteAndAi.setIsNoteModalMaximized(false)}
                contactName={selectedConvo?.contact_name || selectedConvo?.phone}
                editingNoteText={noteAndAi.editingNoteText}
                setEditingNoteText={noteAndAi.setEditingNoteText}
                onSave={async () => {
                    if (noteAndAi.editingNoteId) {
                        await noteAndAi.handleSaveEditedNote(noteAndAi.editingNoteId);
                    }
                    noteAndAi.setIsNoteModalMaximized(false);
                }}
                isSaving={noteAndAi.isSavingNoteMsg}
            />

            <DeletePrivateNoteConfirmModal
                isOpen={!!noteAndAi.deleteNoteConfirmMsgId}
                onClose={() => noteAndAi.setDeleteNoteConfirmMsgId(null)}
                onConfirm={() => noteAndAi.handleDeleteNoteMsg(noteAndAi.deleteNoteConfirmMsgId)}
                isDeleting={noteAndAi.isDeletingNoteMsg}
            />

            {selectedConvo && (
                <TriggerFunnelModal
                    isOpen={showFunnelModal}
                    onClose={() => setShowFunnelModal(false)}
                    onTrigger={async (funnelId) => {
                        const success = await engine.handleTriggerFunnel(funnelId);
                        if (success) setShowFunnelModal(false);
                    }}
                    isTriggering={engine.isSending}
                />
            )}

            <CancelFunnelModal
                isOpen={isCancelFunnelModalOpen && !!selectedConvo?.active_funnel}
                onClose={() => setIsCancelFunnelModalOpen(false)}
                funnelName={selectedConvo?.active_funnel?.name}
                contactName={selectedConvo?.contact_name || selectedConvo?.phone}
                onConfirm={async () => {
                    setIsCancelingFunnel(true);
                    const success = await engine.handleCancelFunnel();
                    setIsCancelingFunnel(false);
                    if (success) setIsCancelFunnelModalOpen(false);
                }}
                isCanceling={isCancelingFunnel}
            />

            {chatOps.pipelineTrigger && (
                <AutomationPipelineModal
                    trigger={chatOps.pipelineTrigger}
                    onClose={() => chatOps.setPipelineTrigger(null)}
                    onStop={async () => {
                        await engine.handleCancelFunnel();
                        chatOps.setPipelineTrigger(null);
                    }}
                    hideTabs={true}
                />
            )}

            <BulkTagModal
                isOpen={chatOps.isBulkTagModalOpen}
                onClose={() => {
                    chatOps.setIsBulkTagModalOpen(false);
                    chatOps.setSelectedBulkTag('');
                    chatOps.setCustomBulkTag('');
                }}
                availableLabels={engine.availableLabels}
                selectedBulkTag={chatOps.selectedBulkTag}
                setSelectedBulkTag={chatOps.setSelectedBulkTag}
                customBulkTag={chatOps.customBulkTag}
                setCustomBulkTag={chatOps.setCustomBulkTag}
                onApply={() => chatOps.handleBulkTagConversations()}
                isApplying={chatOps.isApplyingBulkTag}
                selectedCount={selectAllPages ? engine.totalConvos : engine.selectedConvoIds.length}
            />

            <AiReportModal
                isOpen={noteAndAi.isAiReportModalOpen}
                onClose={() => noteAndAi.setIsAiReportModalOpen(false)}
                aiReportData={noteAndAi.aiReportData}
                onExportHtml={noteAndAi.exportAiReportHtml}
            />
        </>
    );
}
