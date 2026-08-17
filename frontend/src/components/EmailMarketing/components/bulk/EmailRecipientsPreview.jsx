import React, { useState } from 'react';
import { FiUsers, FiChevronDown, FiAlertTriangle, FiSearch, FiMail } from 'react-icons/fi';

export default function EmailRecipientsPreview({
  recipients,
  previewLoading
}) {
  const [showRecipientsList, setShowRecipientsList] = useState(true);
  const [recipientSearch, setRecipientSearch] = useState('');

  const filteredRecipients = recipients.filter(r => {
    const q = recipientSearch.toLowerCase().trim();
    if (!q) return true;
    return (
      r.email.toLowerCase().includes(q) ||
      (r.name && r.name.toLowerCase().includes(q))
    );
  });

  return (
    <div className="mt-3 bg-white dark:bg-slate-800/90 rounded-xl border border-gray-200 dark:border-white/10 p-3 shadow-inner space-y-3">
      <div className="flex items-center justify-between text-xs">
        <div className="font-bold text-gray-800 dark:text-white flex items-center gap-2">
          <FiUsers className="text-blue-500" />
          <span>E-mails que receberão esta mensagem:</span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
            recipients.length > 0
              ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
              : 'bg-red-500/10 text-red-500 border border-red-500/20'
          }`}>
            {previewLoading ? 'Carregando...' : `${recipients.length} contatos`}
          </span>
        </div>
        {recipients.length > 0 && (
          <button
            type="button"
            onClick={() => setShowRecipientsList(!showRecipientsList)}
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-semibold flex items-center gap-1 cursor-pointer"
          >
            {showRecipientsList ? 'Ocultar lista' : 'Ver e-mails'}
            <FiChevronDown className={`transition-transform ${showRecipientsList ? 'rotate-180' : ''}`} />
          </button>
        )}
      </div>

      {previewLoading ? (
        <div className="py-4 text-center text-xs text-gray-400 animate-pulse">
          Buscando contatos com e-mail...
        </div>
      ) : recipients.length === 0 ? (
        <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 font-medium">
          <FiAlertTriangle className="shrink-0 text-amber-500" size={16} />
          <span>Nenhum contato com e-mail cadastrado foi encontrado para a etiqueta selecionada.</span>
        </div>
      ) : (
        showRecipientsList && (
          <div className="space-y-2 pt-1 border-t border-gray-100 dark:border-gray-700/60">
            {/* Campo de pesquisa rápida dentro dos destinatários */}
            {recipients.length > 5 && (
              <div className="relative">
                <FiSearch className="absolute left-2.5 top-2 text-gray-400 text-xs" />
                <input
                  type="text"
                  placeholder="Filtrar e-mail na lista..."
                  value={recipientSearch}
                  onChange={e => setRecipientSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-gray-700 rounded-lg text-xs text-gray-800 dark:text-white placeholder-gray-400 focus:outline-none"
                />
              </div>
            )}

            {/* Lista scrollável de e-mails */}
            <div className="max-h-48 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-700/40 pr-1">
              {filteredRecipients.map(r => (
                <div key={r.id} className="py-1.5 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 truncate">
                    <FiMail className="text-blue-400 shrink-0" size={12} />
                    <span className="font-bold text-gray-800 dark:text-white truncate">{r.email}</span>
                    {r.name && r.name !== 'Sem nome' && (
                      <span className="text-gray-400 text-[11px] truncate">({r.name})</span>
                    )}
                  </div>
                  {r.tags && (
                    <span className="text-[10px] bg-blue-500/10 text-blue-500 px-1.5 py-0.5 rounded font-mono shrink-0 ml-2">
                      {r.tags}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )
      )}
    </div>
  );
}
