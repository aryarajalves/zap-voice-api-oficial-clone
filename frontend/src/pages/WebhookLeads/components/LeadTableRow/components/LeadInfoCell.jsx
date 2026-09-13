import React from 'react';
import { FiExternalLink, FiMessageSquare, FiTrash2 } from 'react-icons/fi';
import { SiChatwoot } from 'react-icons/si';
import RestingCountdown from './RestingCountdown';
import { formatDateBrasilia } from '../utils/leadTableUtils';

export default function LeadInfoCell({ lead, onOpenResetModal }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-8 h-8 flex-shrink-0 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-sm border border-blue-100 dark:border-blue-800">
        {lead.name ? lead.name[0].toUpperCase() : '?'}
      </div>
      <div>
        <div className="flex flex-wrap items-center gap-1 max-w-[220px]">
          <p className="font-semibold text-gray-900 dark:text-white leading-tight">{lead.name || 'Sem Nome'}</p>
          {lead.platform === 'chatwoot_import' && (
            <span
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800/50 whitespace-nowrap"
              title="Importado do Chatwoot"
            >
              <SiChatwoot size={9} /> Chatwoot
            </span>
          )}
          {lead.platform === 'manual' && (
            <span
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700 whitespace-nowrap"
              title="Criado Manualmente"
            >
              👤 Manual
            </span>
          )}
          {lead.platform === 'manual_bulk' && (
            <span
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-100 dark:border-amber-800/50 whitespace-nowrap"
              title="Importado via planilha/CSV"
            >
              📥 Planilha
            </span>
          )}
          {lead.variables?.created_by_webhook && (
            <span
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-violet-50 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400 border border-violet-100 dark:border-violet-800/50 whitespace-nowrap"
              title={`Criado via Webhook: ${lead.variables.webhook_name}`}
            >
              🔗 {lead.variables.webhook_name || 'Webhook'}
            </span>
          )}
          {!['manual', 'manual_bulk', 'chatwoot_import'].includes(lead.platform) &&
            !lead.variables?.created_by_webhook &&
            lead.platform && (
              <span
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-violet-50 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400 border border-violet-100 dark:border-violet-800/50 whitespace-nowrap"
                title={`Webhook: ${lead.platform}`}
              >
                🔗 Webhook
              </span>
            )}
          {lead.imported_by_name && (
            <span
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-150 text-slate-700 dark:bg-slate-800/60 dark:text-slate-300 border border-slate-200/65 dark:border-slate-700 whitespace-nowrap"
              title={`Importado/Criado por: ${lead.imported_by_name}`}
            >
              👤 {lead.imported_by_name}
            </span>
          )}
        </div>
        <div className="flex flex-col gap-0.5 mt-1">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 font-mono">{lead.phone}</span>
            <a
              href={`https://wa.me/${lead.phone}`}
              target="_blank"
              rel="noreferrer"
              className="opacity-0 group-hover:opacity-100 text-blue-500 hover:text-blue-600 transition-opacity"
              title="Abrir WhatsApp"
            >
              <FiExternalLink size={12} />
            </a>
            {lead.chatwoot_url && (
              <a
                href={lead.chatwoot_url}
                target="_blank"
                rel="noreferrer"
                className="opacity-0 group-hover:opacity-100 text-purple-500 hover:text-purple-600 transition-opacity"
                title="Abrir Chat no Chatwoot"
              >
                <FiMessageSquare size={12} />
              </a>
            )}
          </div>
          {lead.bsud && (
            <span className="text-[10px] text-pink-500 font-bold font-mono tracking-wide" title="Business-scoped User ID (Meta)">
              BSUD: {lead.bsud}
            </span>
          )}
          {lead.is_really_blocked && (
            <span className="text-[10px] text-red-500 font-bold font-mono tracking-wide" title="Bloqueado — não recebe disparos">
              🚫 Bloqueado
            </span>
          )}
          {lead.last_template_name && (
            <div className="flex items-center gap-1 mt-0.5">
              <span
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/50 w-fit max-w-[200px] truncate"
                title={`Último Template: ${lead.last_template_name} enviado em ${formatDateBrasilia(lead.last_template_dispatched_at)}`}
              >
                📄 {lead.last_template_name}{' '}
                {lead.last_template_dispatched_at && (
                  <span className="text-[8.5px] font-normal opacity-80">
                    ({formatDateBrasilia(lead.last_template_dispatched_at)})
                  </span>
                )}
              </span>
              <button
                type="button"
                onClick={onOpenResetModal}
                className="p-1 hover:bg-rose-50 text-rose-500 hover:text-rose-600 dark:hover:bg-rose-950/40 rounded transition-colors cursor-pointer"
                title="Remover trava de 24h para permitir novo disparo deste template"
              >
                <FiTrash2 size={11} />
              </button>
            </div>
          )}
          <RestingCountdown expiresAt={lead.resting_expires_at} />
        </div>
      </div>
    </div>
  );
}
