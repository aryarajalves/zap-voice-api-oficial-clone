import React from 'react';
import { FiSend } from 'react-icons/fi';

export default function AssistantInputForm({ input, setInput, loading, isMaximized, onSubmit }) {
  return (
    <form
      onSubmit={onSubmit}
      className="p-4 border-t border-gray-150 dark:border-gray-800/40 bg-white/40 dark:bg-gray-900/40 backdrop-blur-md flex items-end gap-2"
    >
      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Escreva sua mensagem aqui..."
        disabled={loading}
        rows={isMaximized ? 3 : 1}
        className="flex-1 bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700/60 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all dark:text-white disabled:opacity-50 resize-none py-2"
      />
      <button
        type="submit"
        disabled={!input.trim() || loading}
        className="w-10 h-10 bg-blue-600 hover:bg-blue-700 text-white rounded-xl flex items-center justify-center shadow-md active:scale-95 transition-all disabled:opacity-50 disabled:scale-100 flex-shrink-0"
      >
        <FiSend size={16} />
      </button>
    </form>
  );
}
