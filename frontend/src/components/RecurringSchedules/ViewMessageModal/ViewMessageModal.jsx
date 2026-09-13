import React from 'react';
import { useViewMessageModal } from './hooks/useViewMessageModal';
import ViewMessageModalHeader from './components/ViewMessageModalHeader';
import ViewMessageModalViewMode from './components/ViewMessageModalViewMode';
import ViewMessageModalEditMode from './components/ViewMessageModalEditMode';
import ViewMessageModalFooter from './components/ViewMessageModalFooter';

export function ViewMessageModal({
  viewingMessageSchedule,
  onClose,
  onSave,
  templates = [],
  funnels = [],
  isUpdating = false
}) {
  if (!viewingMessageSchedule) return null;

  const {
    isEditing,
    setIsEditing,
    sendType,
    selectedTemplateName,
    setSelectedTemplateName,
    selectedTemplateObj,
    selectedFunnelId,
    directMessage,
    templateParams,
    setTemplateParams,
    buttonActions,
    setButtonActions,
    handleParamChange,
    handleSaveClick
  } = useViewMessageModal({
    viewingMessageSchedule,
    templates,
    onSave
  });

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-slate-900 border border-white/10 rounded-[3rem] w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl relative">
        {/* Cabeçalho */}
        <ViewMessageModalHeader isEditing={isEditing} />

        {/* Conteúdo Central */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8 premium-scrollbar">
          {isEditing ? (
            <ViewMessageModalEditMode
              templates={templates}
              selectedTemplateName={selectedTemplateName}
              setSelectedTemplateName={setSelectedTemplateName}
              selectedTemplateObj={selectedTemplateObj}
              templateParams={templateParams}
              setTemplateParams={setTemplateParams}
              handleParamChange={handleParamChange}
              buttonActions={buttonActions}
              setButtonActions={setButtonActions}
              funnels={funnels}
            />
          ) : (
            <ViewMessageModalViewMode
              sendType={sendType}
              directMessage={directMessage}
              selectedFunnelId={selectedFunnelId}
              funnels={funnels}
              selectedTemplateName={selectedTemplateName}
              selectedTemplateObj={selectedTemplateObj}
              templateParams={templateParams}
            />
          )}
        </div>

        {/* Rodapé do Modal */}
        <ViewMessageModalFooter
          isEditing={isEditing}
          setIsEditing={setIsEditing}
          onClose={onClose}
          handleSaveClick={handleSaveClick}
          isUpdating={isUpdating}
        />
      </div>
    </div>
  );
}

export default ViewMessageModal;
