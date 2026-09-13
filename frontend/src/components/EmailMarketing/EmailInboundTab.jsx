import React from 'react';
import {
  EmailInboundHeader,
  EmailInboundTable,
  EmailInboundReplyModal,
  useEmailInbound
} from './EmailInbound/index';

export default function EmailInboundTab() {
  const {
    inbounds,
    unreadCount,
    loading,
    search,
    setSearch,
    selectedInbound,
    setSelectedInbound,
    replySubject,
    setReplySubject,
    replyBody,
    replyLoading,
    slashActive,
    replyBodyRef,
    webhookUrl,
    fetchInbounds,
    handleOpenInbound,
    handleSendReply,
    copyToClipboard,
    insertVariableCode,
    handleBodyChange,
    filteredSlashVars
  } = useEmailInbound();

  return (
    <div className="space-y-6">
      {/* Card Informativo do Webhook de Entrada */}
      <EmailInboundHeader
        webhookUrl={webhookUrl}
        copyToClipboard={copyToClipboard}
        totalCount={inbounds.length}
        unreadCount={unreadCount}
      />

      {/* Barra de Filtro e Tabela de Respostas */}
      <EmailInboundTable
        inbounds={inbounds}
        loading={loading}
        search={search}
        setSearch={setSearch}
        onRefresh={fetchInbounds}
        onOpenInbound={handleOpenInbound}
      />

      {/* Modal / Drawer para Leitura e Resposta Direta */}
      <EmailInboundReplyModal
        selectedInbound={selectedInbound}
        onClose={() => setSelectedInbound(null)}
        replySubject={replySubject}
        setReplySubject={setReplySubject}
        replyBody={replyBody}
        onBodyChange={handleBodyChange}
        replyBodyRef={replyBodyRef}
        onSendReply={handleSendReply}
        replyLoading={replyLoading}
        slashActive={slashActive}
        filteredSlashVars={filteredSlashVars}
        insertVariableCode={insertVariableCode}
      />
    </div>
  );
}
