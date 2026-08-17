import React from 'react';
import { createPortal } from 'react-dom';
import { FiMail } from 'react-icons/fi';

export default function EmailTestModal({
  isOpen,
  onClose,
  testEmail,
  setTestEmail,
  onSendTest,
  testLoading
}) {
  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-md w-full border border-gray-100 dark:border-white/10 shadow-2xl space-y-4">
        <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
          <FiMail className="text-blue-500" /> Enviar E-mail de Teste
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Digite o e-mail que receberá a mensagem de teste para validar se o provedor está funcionando.
        </p>
        <div>
          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
            E-mail de Destino
          </label>
          <input
            type="email"
            placeholder="seuemail@gmail.com"
            value={testEmail}
            onChange={e => setTestEmail(e.target.value)}
            className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-900 border border-gray-300 dark:border-gray-700 rounded-xl text-sm text-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex items-center justify-end gap-3 pt-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-xs font-semibold"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={testLoading}
            onClick={onSendTest}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/20 disabled:opacity-50"
          >
            {testLoading ? 'Enviando...' : 'Enviar Teste'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
