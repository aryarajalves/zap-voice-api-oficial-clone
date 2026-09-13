import React from 'react';
import useTemplateAssistant from './hooks/useTemplateAssistant';
import {
  AssistantLauncher,
  AssistantHeader,
  AssistantMessageList,
  AssistantInputForm
} from './components';

export default function TemplateAssistant({ logic }) {
  const {
    isOpen,
    setIsOpen,
    isMaximized,
    setIsMaximized,
    messages,
    input,
    setInput,
    loading,
    expandedCardIndex,
    setExpandedCardIndex,
    fieldsToApply,
    toggleField,
    chatEndRef,
    handleSend,
    handleApplyTemplate
  } = useTemplateAssistant(logic);

  return (
    <div className="fixed bottom-6 right-6 z-[999] transition-all duration-300">
      {!isOpen && <AssistantLauncher onOpen={() => setIsOpen(true)} />}

      {isOpen && (
        <div
          className={`bg-white/80 dark:bg-gray-900/90 backdrop-blur-xl rounded-3xl border border-gray-200/50 dark:border-gray-800/80 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 duration-300 transition-all ${
            isMaximized
              ? 'w-[90vw] md:w-[750px] h-[80vh]'
              : 'w-[380px] sm:w-[420px] h-[550px]'
          }`}
        >
          <AssistantHeader
            isMaximized={isMaximized}
            onToggleMaximize={() => setIsMaximized(!isMaximized)}
            onClose={() => setIsOpen(false)}
          />

          <AssistantMessageList
            messages={messages}
            expandedCardIndex={expandedCardIndex}
            onToggleExpand={(index) =>
              setExpandedCardIndex(expandedCardIndex === index ? null : index)
            }
            fieldsToApply={fieldsToApply}
            toggleField={toggleField}
            onApplyTemplate={handleApplyTemplate}
            loading={loading}
            chatEndRef={chatEndRef}
          />

          <AssistantInputForm
            input={input}
            setInput={setInput}
            loading={loading}
            isMaximized={isMaximized}
            onSubmit={handleSend}
          />
        </div>
      )}
    </div>
  );
}
