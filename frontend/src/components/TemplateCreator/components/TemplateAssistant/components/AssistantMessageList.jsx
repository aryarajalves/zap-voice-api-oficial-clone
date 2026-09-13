import React from 'react';
import { extractJSON } from '../hooks/useTemplateAssistant';
import SuggestedTemplateCard from './SuggestedTemplateCard';

export default function AssistantMessageList({
  messages,
  expandedCardIndex,
  onToggleExpand,
  fieldsToApply,
  toggleField,
  onApplyTemplate,
  loading,
  chatEndRef
}) {
  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-4 select-text">
      {messages.map((msg, index) => {
        const isUser = msg.role === 'user';
        const tplData = !isUser ? extractJSON(msg.content) : null;
        const cleanContent = msg.content.replace(/```json[\s\S]*?```/g, '').trim();
        const isExpanded = expandedCardIndex === index;

        return (
          <div key={index} className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm transition-all duration-300 leading-relaxed whitespace-pre-wrap ${
                isUser
                  ? 'bg-blue-600 text-white rounded-tr-none'
                  : 'bg-gray-100 dark:bg-gray-800/60 dark:border dark:border-gray-700/30 text-gray-800 dark:text-gray-100 rounded-tl-none'
              }`}
            >
              {cleanContent}
            </div>

            {tplData && (
              <SuggestedTemplateCard
                tplData={tplData}
                isExpanded={isExpanded}
                onToggleExpand={() => onToggleExpand(index)}
                fieldsToApply={fieldsToApply}
                toggleField={toggleField}
                onApplyTemplate={onApplyTemplate}
              />
            )}
          </div>
        );
      })}

      {loading && (
        <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-850 px-3 py-1.5 rounded-full w-max">
          <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce delay-100" />
          <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce delay-200" />
          <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce delay-300" />
          Assistente está pensando...
        </div>
      )}
      <div ref={chatEndRef} />
    </div>
  );
}
