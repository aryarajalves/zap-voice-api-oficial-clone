import React from 'react';
import SearchableSelect from '../../BulkSender/common/SearchableSelect';
import {
  BulkSendContactsModalHeader,
  BulkSendContactsModalFooter,
  ScheduleSection,
  ButtonActionsSection,
  VariablesSection,
  TemplatePreviewSection,
  useBulkSendContacts,
} from './BulkSendContactsModal/index';

const BulkSendContactsModal = ({
  isOpen,
  onClose,
  selectedPhones = [],
  clientId,
  triggerId,
  onSuccess
}) => {
  const {
    isLoadingTemplates,
    selectedTemplateName,
    setSelectedTemplateName,
    templateParams,
    setTemplateParams,
    isSending,
    buttonActions,
    setButtonActions,
    isScheduleEnabled,
    setIsScheduleEnabled,
    scheduledTime,
    setScheduledTime,
    selectedTemplate,
    variables,
    templateButtons,
    selectOptions,
    funnelOptions,
    handleParamChange,
    handleButtonActionChange,
    handleSend
  } = useBulkSendContacts({
    isOpen,
    onClose,
    selectedPhones,
    clientId,
    triggerId,
    onSuccess
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black bg-opacity-70 backdrop-blur-sm animated-fade-in">
      <div
        className="bg-slate-900 border border-slate-800 rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.5)] max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        style={{ userSelect: 'none', cursor: 'default' }}
      >
        <BulkSendContactsModalHeader
          selectedCount={selectedPhones.length}
          onClose={onClose}
        />

        <div className="p-6 overflow-y-auto flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-950/20">
          <div className="space-y-6">
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">
                Escolha o Template
              </label>
              {isLoadingTemplates ? (
                <div className="text-xs text-slate-500 font-bold uppercase tracking-widest animate-pulse">
                  Carregando templates...
                </div>
              ) : (
                <SearchableSelect
                  options={selectOptions}
                  value={selectedTemplateName}
                  onChange={(val) => {
                    setSelectedTemplateName(val);
                    setTemplateParams({});
                    setButtonActions({});
                  }}
                  placeholder="SELECIONE UM TEMPLATE"
                />
              )}
            </div>

            {selectedTemplate && (
              <ScheduleSection
                isScheduleEnabled={isScheduleEnabled}
                setIsScheduleEnabled={setIsScheduleEnabled}
                scheduledTime={scheduledTime}
                setScheduledTime={setScheduledTime}
              />
            )}

            {selectedTemplate && (
              <ButtonActionsSection
                templateButtons={templateButtons}
                buttonActions={buttonActions}
                handleButtonActionChange={handleButtonActionChange}
                funnelOptions={funnelOptions}
              />
            )}

            {selectedTemplate && (
              <VariablesSection
                variables={variables}
                templateParams={templateParams}
                handleParamChange={handleParamChange}
              />
            )}
          </div>

          <TemplatePreviewSection
            selectedTemplate={selectedTemplate}
            templateParams={templateParams}
          />
        </div>

        <BulkSendContactsModalFooter
          onClose={onClose}
          handleSend={handleSend}
          isSending={isSending}
          selectedTemplate={selectedTemplate}
          isScheduleEnabled={isScheduleEnabled}
        />
      </div>
    </div>
  );
};

export default BulkSendContactsModal;
