import { FiExternalLink, FiMessageSquare, FiEdit2, FiTrash2, FiCalendar, FiLock, FiUnlock, FiDatabase } from 'react-icons/fi';
import { SiChatwoot } from 'react-icons/si';
import { toast } from 'react-hot-toast';

function formatDateBrasilia(isoStr) {
  if (!isoStr) return '---';
  try {
    return new Date(isoStr).toLocaleString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return '---';
  }
}

function TagsCell({ lead, onOpenTagsModal }) {
  if (!lead.tags) return <span className="text-[10px] text-gray-400 italic">Sem etiquetas</span>;

  const cleanedTags = lead.tags.replace(/[\[\]'"]/g, '').split(',').map(t => t.trim()).filter(Boolean);
  if (cleanedTags.length === 0) return <span className="text-[10px] text-gray-400 italic">Sem etiquetas</span>;

  const prefVisible = lead.variables?.visible_tags;
  let displayedTags, hiddenTags;
  if (Array.isArray(prefVisible)) {
    displayedTags = cleanedTags.filter(t => prefVisible.includes(t));
    hiddenTags = cleanedTags.filter(t => !prefVisible.includes(t));
  } else {
    displayedTags = cleanedTags.slice(0, 3);
    hiddenTags = cleanedTags.slice(3);
  }

  return (
    <>
      {displayedTags.map((tag, idx) => (
        <span key={idx} className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-100 dark:border-blue-800/50">
          {tag}
        </span>
      ))}
      {displayedTags.length === 0 && <span className="text-[10px] text-gray-400 italic">Ocultas</span>}
      {hiddenTags.length > 0 && (
        <button 
          onClick={() => onOpenTagsModal(lead)}
          className="px-2 py-0.5 bg-gray-150 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-md text-[10px] font-bold transition-all shadow-sm"
          title="Ver todas as etiquetas"
        >
          +{hiddenTags.length}
        </button>
      )}
    </>
  );
}

export default function LeadTableRow({
  lead,
  selectedLeads,
  showCustomColumns,
  customColumnsKeys,
  togglingLock,
  onSelectLead,
  onEdit,
  onDelete,
  onToggleLock,
  onOpenVariables,
  onOpenTagsModal,
}) {
  return (
    <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors group">
      <td className="px-3 py-2.5">
        <input
          type="checkbox"
          className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 bg-white dark:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed"
          checked={selectedLeads.includes(lead.id)}
          onChange={() => onSelectLead(lead.id)}
          disabled={lead.is_locked}
          title={lead.is_locked ? "Contatos bloqueados não podem ser selecionados para exclusão em massa." : ""}
        />
      </td>
      <td className="px-3 py-2.5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 flex-shrink-0 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-sm border border-blue-100 dark:border-blue-800">
            {lead.name ? lead.name[0].toUpperCase() : '?'}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-1 max-w-[220px]">
              <p className="font-semibold text-gray-900 dark:text-white leading-tight">{lead.name || 'Sem Nome'}</p>
              {lead.platform === 'chatwoot_import' && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800/50 whitespace-nowrap" title="Importado do Chatwoot">
                  <SiChatwoot size={9} /> Chatwoot
                </span>
              )}
              {lead.platform === 'manual' && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700 whitespace-nowrap" title="Criado Manualmente">
                  👤 Manual
                </span>
              )}
              {lead.platform === 'manual_bulk' && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-100 dark:border-amber-800/50 whitespace-nowrap" title="Importado via planilha/CSV">
                  📥 Planilha
                </span>
              )}
              {lead.variables?.created_by_webhook && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-violet-50 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400 border border-violet-100 dark:border-violet-800/50 whitespace-nowrap" title={`Criado via Webhook: ${lead.variables.webhook_name}`}>
                  🔗 {lead.variables.webhook_name || 'Webhook'}
                </span>
              )}
              {!['manual', 'manual_bulk', 'chatwoot_import'].includes(lead.platform) && !lead.variables?.created_by_webhook && lead.platform && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-violet-50 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400 border border-violet-100 dark:border-violet-800/50 whitespace-nowrap" title={`Webhook: ${lead.platform}`}>
                  🔗 Webhook
                </span>
              )}
              {lead.imported_by_name && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-150 text-slate-700 dark:bg-slate-800/60 dark:text-slate-300 border border-slate-200/65 dark:border-slate-700 whitespace-nowrap" title={`Importado/Criado por: ${lead.imported_by_name}`}>
                  👤 {lead.imported_by_name}
                </span>
              )}
            </div>
            <div className="flex flex-col gap-0.5 mt-1">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 font-mono">{lead.phone}</span>
                <a href={`https://wa.me/${lead.phone}`} target="_blank" rel="noreferrer" className="opacity-0 group-hover:opacity-100 text-blue-500 hover:text-blue-600 transition-opacity" title="Abrir WhatsApp">
                  <FiExternalLink size={12} />
                </a>
                {lead.chatwoot_url && (
                  <a href={lead.chatwoot_url} target="_blank" rel="noreferrer" className="opacity-0 group-hover:opacity-100 text-purple-500 hover:text-purple-600 transition-opacity" title="Abrir Chat no Chatwoot">
                    <FiMessageSquare size={12} />
                  </a>
                )}
              </div>
              {lead.bsud && (
                <span className="text-[10px] text-pink-500 font-bold font-mono tracking-wide" title="Business-scoped User ID (Meta)">
                  BSUD: {lead.bsud}
                </span>
              )}
            </div>
          </div>
        </div>
      </td>
      <td className="px-3 py-2.5">
        <span className="text-xs truncate block max-w-[160px]" title={lead.email}>{lead.email || '---'}</span>
      </td>
      <td className="px-3 py-2.5">
        <div className="flex flex-wrap gap-1 items-center max-w-[180px]">
          <TagsCell lead={lead} onOpenTagsModal={onOpenTagsModal} />
        </div>
      </td>
      {showCustomColumns && customColumnsKeys.map(key => (
        <td key={key} className="px-3 py-2.5 text-xs font-semibold text-gray-700 dark:text-gray-300 font-mono">
          {(lead.variables && lead.variables[key]) || '---'}
        </td>
      ))}
      <td className="px-3 py-2.5 whitespace-nowrap">
        <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
          <FiCalendar size={11} className="flex-shrink-0 text-gray-400" />
          <span className="text-xs font-mono">{formatDateBrasilia(lead.updated_at || lead.created_at)}</span>
        </div>
      </td>
      <td className="px-3 py-2.5 whitespace-nowrap">
        <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
          <FiCalendar size={11} className="flex-shrink-0 text-gray-400" />
          <span className="text-xs font-mono">{formatDateBrasilia(lead.created_at)}</span>
        </div>
      </td>
      <td className="px-3 py-2.5 whitespace-nowrap text-right text-sm font-medium">
        <div className="flex items-center justify-end gap-1">
          {lead.chatwoot_url && (
            <a href={lead.chatwoot_url} target="_blank" rel="noreferrer" className="p-1.5 text-purple-400 hover:text-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors" title="Ver Conversa no Chatwoot">
              <FiMessageSquare size={15} />
            </a>
          )}
          <button onClick={() => onOpenVariables(lead)} className="p-1.5 text-gray-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors" title="Ver Variáveis Extraídas">
            <FiDatabase size={15} />
          </button>
          <button onClick={() => onEdit(lead)} className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors" title="Editar Informações">
            <FiEdit2 size={15} />
          </button>
          <button
            onClick={() => onToggleLock(lead)}
            disabled={togglingLock === lead.id}
            className={`p-1.5 rounded-lg transition-colors ${lead.is_locked ? 'text-amber-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20' : 'text-gray-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20'} disabled:opacity-50`}
            title={lead.is_locked ? 'Desbloquear contato' : 'Bloquear contato (impede exclusão)'}
          >
            {lead.is_locked ? <FiLock size={15} /> : <FiUnlock size={15} />}
          </button>
          <button
            onClick={() => {
              if (lead.is_locked) toast.error("Não é possível deletar um contato bloqueado.");
              else onDelete(lead);
            }}
            className={`p-1.5 rounded-lg transition-colors ${lead.is_locked ? 'text-gray-400/30 cursor-not-allowed' : 'text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'}`}
            title={lead.is_locked ? 'Contato bloqueado — desbloqueie para excluir' : 'Excluir Contato e Histórico'}
          >
            <FiTrash2 size={15} />
          </button>
        </div>
      </td>
    </tr>
  );
}
