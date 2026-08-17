import React from 'react';
import { FiAlertCircle, FiAlertTriangle, FiInfo, FiZap } from 'react-icons/fi';

export const TIME_RE  = /(\d{2}:\d{2}:\d{2})/;
export const LEVEL_RE = /\b(CRITICAL|FATAL|ERROR|WARNING|WARN|INFO|DEBUG|TRACE)\b/i;

export function parseLine(raw, idx) {
  const timeMatch  = raw.match(TIME_RE);
  const levelMatch = raw.match(LEVEL_RE);
  return {
    idx,
    raw,
    rawLower: raw.toLowerCase(),
    time:  timeMatch  ? timeMatch[1]  : null,
    level: levelMatch ? levelMatch[1].toUpperCase() : null,
  };
}

export function getLineSignature(raw) {
  return raw
    .replace(TIME_RE, '')
    .replace(/\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{2,4}/g, '')
    .replace(/\d+/g, '#')
    .replace(/\s+/g, ' ')
    .trim();
}

export function formatDateBR(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

export const LEVEL_COLORS = {
  CRITICAL: { bg: 'bg-purple-900/40', text: 'text-purple-300', badge: 'bg-purple-700 text-purple-100' },
  FATAL:    { bg: 'bg-purple-900/40', text: 'text-purple-300', badge: 'bg-purple-700 text-purple-100' },
  ERROR:    { bg: 'bg-red-900/30',    text: 'text-red-300',    badge: 'bg-red-700 text-red-100' },
  WARNING:  { bg: 'bg-yellow-900/20', text: 'text-yellow-300', badge: 'bg-yellow-700 text-yellow-100' },
  WARN:     { bg: 'bg-yellow-900/20', text: 'text-yellow-300', badge: 'bg-yellow-700 text-yellow-100' },
  INFO:     { bg: '',                 text: 'text-gray-300',   badge: 'bg-blue-700 text-blue-100' },
  DEBUG:    { bg: '',                 text: 'text-gray-500',   badge: 'bg-gray-600 text-gray-200' },
  TRACE:    { bg: '',                 text: 'text-gray-600',   badge: 'bg-gray-700 text-gray-300' },
};

export function levelIcon(level) {
  if (!level) return null;
  if (['CRITICAL','FATAL','ERROR'].includes(level)) return <FiAlertCircle size={11} className="text-red-400 flex-shrink-0" />;
  if (['WARNING','WARN'].includes(level))           return <FiAlertTriangle size={11} className="text-yellow-400 flex-shrink-0" />;
  if (level === 'INFO')                             return <FiInfo size={11} className="text-blue-400 flex-shrink-0" />;
  return <FiZap size={11} className="text-gray-500 flex-shrink-0" />;
}

export const QUICK_FILTERS = [
  {
    id: 'bulk', label: 'Disparo em Massa', emoji: '📤', color: 'bg-blue-700 text-blue-100',
    pattern: /\[(bulk|disparo|wa-trigger|direct|bulk-post-send|bulk_resend)\]/i,
    description: "Linhas de disparos em massa (envio para vários contatos de uma vez). Procura pelas marcações [bulk], [disparo], [wa-trigger], [direct], [bulk-post-send] e [bulk_resend]."
  },
  {
    id: 'followup', label: 'Follow-up', emoji: '🔁', color: 'bg-cyan-700 text-cyan-100',
    pattern: /\[follow-up|\[bulk-play-followup|\[play-followup/i,
    description: "Linhas de mensagens de follow-up automático (reenvio programado para quem não respondeu). Procura pelas marcações [follow-up], [bulk-play-followup] e [play-followup]."
  },
  {
    id: 'funnel', label: 'Funis', emoji: '🔀', color: 'bg-indigo-700 text-indigo-100',
    pattern: /\[(graph|engine|funil|wa-resume|play-clone|button_action_funnel|resume)\]/i,
    description: "Linhas da execução dos funis de automação (o motor que processa cada etapa do fluxo). Procura pelas marcações [graph], [engine], [funil], [wa-resume], [play-clone], [button_action_funnel] e [resume]."
  },
  {
    id: 'webhook', label: 'Webhooks / Atendimento', emoji: '🔗', color: 'bg-orange-700 text-orange-100',
    pattern: /\[(webhook|atendimento|chatwoot|meta|sync_atendimento|sync_chatwoot|meta_webhook|meta_inbound|webhooks)\]/i,
    description: "Linhas de webhooks recebidos (Meta/WhatsApp) e de sincronização com o chat de Atendimento do ZapVoice. Procura pelas marcações [webhook], [atendimento], [meta], [sync_atendimento], [meta_webhook], [meta_inbound] e [webhooks]."
  },
  {
    id: 'scheduler', label: 'Agendamentos', emoji: '⏰', color: 'bg-yellow-700 text-yellow-100',
    pattern: /\[(scheduler|backup-scheduler|schedule)\]/i,
    description: "Linhas do agendador de tarefas: disparos agendados e rotinas de backup programadas. Procura pelas marcações [scheduler], [backup-scheduler] e [schedule]."
  },
  {
    id: 'ai', label: 'IA', emoji: '🤖', color: 'bg-violet-700 text-violet-100',
    pattern: /\[(ai_condition|input-data-ai|mem_lock|event)\]/i,
    description: "Linhas de processamento por inteligência artificial: condições de funil decididas por IA e extração de dados de respostas. Procura pelas marcações [ai_condition], [input-data-ai], [mem_lock] e [event]."
  },
  {
    id: 'database', label: 'Banco / PostgreSQL', emoji: '🗄', color: 'bg-green-700 text-green-100',
    pattern: /\[(database|migration|auto-migrate|storage)\]|postgres|sqlalchemy|psycopg/i,
    description: "Linhas relacionadas ao banco de dados: migrações automáticas, armazenamento e erros de conexão. Procura pelas marcações [database], [migration], [auto-migrate], [storage] ou menções a postgres, sqlalchemy e psycopg."
  },
  {
    id: 'backup', label: 'Backup', emoji: '💾', color: 'bg-teal-700 text-teal-100',
    pattern: /\[(backup|upload-backup|restore)\]/i,
    description: "Linhas do processo de backup automático do banco de dados e uploads, incluindo restaurações. Procura pelas marcações [backup], [upload-backup] e [restore]."
  },
  {
    id: 'upload', label: 'Uploads', emoji: '📁', color: 'bg-pink-700 text-pink-100',
    pattern: /\[upload/i,
    description: "Linhas de upload de arquivos e mídias (imagens, áudios, vídeos, documentos). Procura pela marcação [upload."
  },
  {
    id: 'import', label: 'Importacao', emoji: '📥', color: 'bg-rose-700 text-rose-100',
    pattern: /import|duplicity_check|leads_import/i,
    description: "Linhas de importação de contatos/leads e verificação de duplicidade. Procura pelas palavras 'import', 'duplicity_check' e 'leads_import'."
  },
];

export const LINE_OPTIONS    = [500, 1000, 2000, 5000, 10000];
export const LEVELS_OPTIONS  = ['CRITICAL', 'ERROR', 'WARNING', 'INFO', 'DEBUG'];

export function highlightText(text, search) {
  if (!search) return text;
  try {
    const terms = search.split(/[\s,]+/).filter(t => t.trim().length > 0);
    if (terms.length === 0) return text;
    
    const pattern = terms
      .map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      .join('|');
        
    const parts = text.split(new RegExp(`(${pattern})`, 'gi'));
    const termSet = new Set(terms.map(t => t.toLowerCase()));
    
    return parts.map((part, i) =>
      termSet.has(part.toLowerCase())
        ? <mark key={i} className="bg-yellow-400/40 text-yellow-200 rounded px-0.5">{part}</mark>
        : part
    );
  } catch (_) {
    return text;
  }
}
