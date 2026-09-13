import React from 'react';

export default function VendedorHomeView({ logic }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-gray-100">
      <div className="text-center space-y-4 px-8 max-w-sm">
        <div className="w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center mx-auto">
          <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        </div>
        <p className="text-sm text-gray-400 dark:text-gray-500">
          Clique no botão abaixo para abrir o chat e começar a atender seus contatos.
        </p>
        <button
          onClick={() => logic.handleViewChange('chat_conversations')}
          className="mt-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition w-full"
        >
          💬 Abrir Atendimento
        </button>
      </div>
    </div>
  );
}
