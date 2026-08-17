import React from 'react';
import { FiMail } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { WEBHOOK_BASE_URL } from '../../../../config';

export default function EmailWebhookStatusCard() {
  const webhookUrl = `${WEBHOOK_BASE_URL.replace(/\/+$/, '')}/api/email/status-webhook`;

  const handleCopy = () => {
    navigator.clipboard.writeText(webhookUrl);
    toast.success("URL do Webhook copiada!");
  };

  return (
    <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
          <FiMail size={14} /> Webhook de Status de Entrega (Brevo / SES / Resend)
        </span>
      </div>
      <p className="text-xs text-gray-600 dark:text-gray-300">
        Copie a URL pública abaixo e cadastre na Brevo (em <em>Transactional &gt; Settings &gt; Webhooks</em>) para rastrear entregas, bounces e confirmações em tempo real:
      </p>
      <div className="flex items-center gap-2">
        <input
          type="text"
          readOnly
          value={webhookUrl}
          className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800 rounded-lg text-xs font-mono text-gray-800 dark:text-gray-200 select-all"
        />
        <button
          type="button"
          onClick={handleCopy}
          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all whitespace-nowrap"
        >
          Copiar URL
        </button>
      </div>
    </div>
  );
}
