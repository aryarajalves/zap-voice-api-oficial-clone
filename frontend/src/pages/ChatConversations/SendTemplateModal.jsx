import React from 'react';
import { FiRefreshCw } from 'react-icons/fi';
import {
  useSendTemplate,
  SendTemplateModalHeader,
  TemplateSelectorSection,
  TemplateHeaderMediaSection,
  TemplateVariablesSection,
  TemplatePreviewSection,
  TemplateButtonsConfigSection,
  TemplateFunnelTriggerSection,
  SendTemplateModalFooter
} from './components/SendTemplateModal/index';

export default function SendTemplateModal({
  isOpen,
  onClose,
  activeClient,
  selectedConvo,
  onSendSuccess
}) {
  const {
    templates,
    loading,
    selectedTemplate,
    variables,
    funnels,
    selectedFunnelId,
    setSelectedFunnelId,
    loadingFunnels,
    buttonActions,
    templateParams,
    contactName,
    contactFirstName,
    windowOpen,
    handleSelectTemplate,
    handleVariableChange,
    handleButtonActionChange,
    handleParamChange,
    getPreviewWithVars,
    getTemplateButtons,
    handleSend
  } = useSendTemplate({
    isOpen,
    onClose,
    activeClient,
    selectedConvo,
    onSendSuccess
  });

  if (!isOpen) return null;

  const previewText = getPreviewWithVars();
  const templateButtons = getTemplateButtons();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[#0f172a] border border-white/10 rounded-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] shadow-2xl">
        {/* Header do Modal */}
        <SendTemplateModalHeader onClose={onClose} />

        {/* Conteúdo do Modal */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400 gap-3">
              <FiRefreshCw className="animate-spin text-blue-500" size={24} />
              <span>Carregando templates...</span>
            </div>
          ) : templates.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              Nenhum template encontrado para esta conta.
            </div>
          ) : (
            <>
              {/* Seletor de template */}
              <TemplateSelectorSection
                templates={templates}
                selectedTemplate={selectedTemplate}
                onSelectTemplate={handleSelectTemplate}
              />

              {selectedTemplate && (
                <div className="space-y-4">
                  {/* Mídia do Cabeçalho (HEADER: IMAGE, VIDEO, DOCUMENT) */}
                  <TemplateHeaderMediaSection
                    selectedTemplate={selectedTemplate}
                    templateParams={templateParams}
                    handleParamChange={handleParamChange}
                  />

                  {/* Variáveis */}
                  <TemplateVariablesSection
                    variables={variables}
                    handleVariableChange={handleVariableChange}
                    contactName={contactName}
                    contactFirstName={contactFirstName}
                  />

                  {/* Pré-visualização com variáveis preenchidas */}
                  <TemplatePreviewSection previewText={previewText} />

                  {/* Configuração de Ações dos Botões */}
                  <TemplateButtonsConfigSection
                    templateButtons={templateButtons}
                    buttonActions={buttonActions}
                    handleButtonActionChange={handleButtonActionChange}
                    funnels={funnels}
                  />

                  {/* Disparo de Funil após envio */}
                  <TemplateFunnelTriggerSection
                    selectedFunnelId={selectedFunnelId}
                    setSelectedFunnelId={setSelectedFunnelId}
                    funnels={funnels}
                    loadingFunnels={loadingFunnels}
                  />
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer do Modal com badges e ações */}
        <SendTemplateModalFooter
          selectedTemplate={selectedTemplate}
          windowOpen={windowOpen}
          onClose={onClose}
          onSend={handleSend}
        />
      </div>
    </div>
  );
}
