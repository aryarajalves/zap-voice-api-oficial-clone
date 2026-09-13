import React from 'react';
import { FiInfo, FiCopy } from 'react-icons/fi';

const EmailInboundHeader = ({
  webhookUrl,
  copyToClipboard,
  totalCount,
  unreadCount
}) => {
  return (
    <div className="bg-gradient-to-r from-blue-600/10 via-indigo-600/10 to-purple-600/10 p-5 rounded-2xl border border-blue-500/20 backdrop-blur-md flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div className="space-y-1">
        <h3 className="text-sm font-bold text-gray-800 dark:text-white flex items-center gap-2">
          <FiInfo className="text-blue-500" /> Webhook de Captura de Respostas (Inbound Emails)
        </h3>
        <p className="text-xs text-gray-600 dark:text-gray-300">
          Configure esta URL de Webhook no seu provedor de e-mail (Resend Inbound, Amazon SES ou Cloudflare) para receber todas as respostas dos leads direto no ZapVoice.
        </p>
        <div className="flex items-center gap-2 pt-1 font-mono text-xs text-blue-600 dark:text-blue-400 bg-white/60 dark:bg-slate-900/60 px-3 py-1.5 rounded-xl border border-blue-500/20 w-fit">
          <span>{webhookUrl}</span>
          <button
            type="button"
            onClick={() => copyToClipboard(webhookUrl)}
            className="hover:text-blue-800 dark:hover:text-blue-200"
            title="Copiar URL"
          >
            <FiCopy />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="px-4 py-2 bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-white/10 text-center">
          <span className="text-xs text-gray-500 dark:text-gray-400 block">Total Recebidos</span>
          <span className="text-lg font-black text-gray-800 dark:text-white">{totalCount}</span>
        </div>
        <div className="px-4 py-2 bg-blue-500/10 rounded-xl border border-blue-500/20 text-center">
          <span className="text-xs text-blue-600 dark:text-blue-400 block font-bold">Não Lidas</span>
          <span className="text-lg font-black text-blue-600 dark:text-blue-400">{unreadCount}</span>
        </div>
      </div>
    </div>
  );
};

export default EmailInboundHeader;
