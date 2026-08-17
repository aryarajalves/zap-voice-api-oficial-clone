import React from 'react';

export default function EmailSenderFields({
  fromEmail,
  fromName,
  onChangeFromEmail,
  onChangeFromName
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-gray-100 dark:border-gray-800">
      <div>
        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
          E-mail do Remetente *
        </label>
        <input
          type="email"
          required
          placeholder="contato@seu-dominio.com.br"
          value={fromEmail}
          onChange={e => onChangeFromEmail(e.target.value)}
          className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 text-gray-800 dark:text-white"
        />
      </div>
      <div>
        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
          Nome do Remetente
        </label>
        <input
          type="text"
          placeholder="Ex: ZapVoice Equipe"
          value={fromName}
          onChange={e => onChangeFromName(e.target.value)}
          className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 text-gray-800 dark:text-white"
        />
      </div>
    </div>
  );
}
