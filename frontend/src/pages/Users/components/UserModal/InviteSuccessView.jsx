import React from 'react';
import { FiCheck, FiCopy } from 'react-icons/fi';

export default function InviteSuccessView({
  generatedLink,
  copied,
  onCopyLink,
  onClose
}) {
  return (
    <div className="p-6 space-y-6 flex flex-col items-center text-center">
      <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center text-green-600 dark:text-green-400">
        <FiCheck size={32} />
      </div>
      <div className="space-y-2">
        <h4 className="text-lg font-bold text-gray-900 dark:text-white">Convite Pronto!</h4>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Copie o link abaixo e envie para o novo usuário se cadastrar.
        </p>
      </div>

      <div className="w-full flex items-center gap-2 p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900/30">
        <input
          readOnly
          type="text"
          value={generatedLink}
          className="w-full bg-transparent text-sm text-gray-600 dark:text-gray-300 outline-none select-all px-2 font-mono"
        />
        <button
          type="button"
          onClick={onCopyLink}
          className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-colors flex-shrink-0 cursor-pointer"
          title="Copiar Link"
        >
          {copied ? <FiCheck size={18} /> : <FiCopy size={18} />}
        </button>
      </div>

      <button
        type="button"
        onClick={onClose}
        className="w-full py-2.5 bg-blue-600 text-white font-bold hover:bg-blue-700 rounded-lg transition-all shadow-lg shadow-blue-500/30 hover:-translate-y-0.5 cursor-pointer"
      >
        Concluir
      </button>
    </div>
  );
}
