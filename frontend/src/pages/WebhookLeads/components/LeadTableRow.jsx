import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { FiExternalLink, FiMessageSquare, FiEdit2, FiTrash2, FiCalendar, FiLock, FiUnlock, FiDatabase, FiSlash } from 'react-icons/fi';
import { SiChatwoot } from 'react-icons/si';
import { toast } from 'react-hot-toast';
import { API_URL } from '../../../config';
import { fetchWithAuth } from '../../../AuthContext';
import { useClient } from '../../../contexts/ClientContext';

/**
 * O backend guarda/retorna datas em UTC "ingênuo" (sem 'Z' no fim, ex:
 * "2026-07-03T10:15:30"). Sem isso, `new Date(...)` interpreta a string como
 * horário LOCAL do navegador, deslocando o cálculo pelo fuso do usuário
 * (mesmo problema já corrigido em TriggerTableUtils.jsx e importHistoryUtils.js).
 */
function parseUtcDate(raw) {
  if (!raw) return null;
  const str = String(raw);
  const hasTimezone = /[Zz]$|[+-]\d{2}:?\d{2}$/.test(str);
  const date = new Date(hasTimezone ? str : `${str}Z`);
  return isNaN(date.getTime()) ? null : date;
}

/** Mostra quanto tempo falta para o contato sair do repouso, atualizando sozinho. */
function RestingCountdown({ expiresAt }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!expiresAt) return;
    // Sincroniza imediatamente ao montar/trocar de contato, e depois a cada 1s
    // para o contador ficar sempre correto (inclusive logo após um refresh).
    setNow(Date.now());
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  const expiresAtDate = parseUtcDate(expiresAt);
  if (!expiresAtDate) return null;

  const diffMs = expiresAtDate.getTime() - now;
  if (diffMs <= 0) return null;

  const totalSeconds = Math.floor(diffMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const label = hours > 0 ? `${hours}h ${minutes}min` : `${minutes}min`;

  return (
    <span
      className="text-[10px] text-amber-500 font-bold font-mono tracking-wide"
      title={`Volta a receber disparos em ${label}`}
    >
      😴 Repouso: {label} restantes
    </span>
  );
}

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
  onOpenBlockModal,
  updateLeadInPlace,
}) {
  const { activeClient } = useClient();
  const [showResetModal, setShowResetModal] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const handleConfirmResetTemplateHistory = async () => {
    setIsResetting(true);
    try {
      const res = await fetchWithAuth(
        `${API_URL}/leads/${lead.id}/template-history`,
        { method: 'DELETE' },
        activeClient?.id
      );
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success("Histórico do template removido! Contato liberado para novo disparo.");
        setShowResetModal(false);
        if (updateLeadInPlace) {
          updateLeadInPlace(lead.id, {
            last_template_name: null,
            last_template_dispatched_at: null
          });
        }
      } else {
        toast.error(data.detail || "Erro ao remover histórico do template.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Erro de conexão ao remover histórico do template.");
    } finally {
      setIsResetting(false);
    }
  };
  return (
    <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors group">
      <td className="px-3 py-2.5">
        <input
          type="checkbox"
          className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 bg-white dark:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed"
          checked={selectedLeads.includes(lead.id)}
          onChange={() => onSelectLead(lead.id)}
          disabled={lead.is_locked}
          title={lead.is_locked ? "Contatos protegidos não podem ser selecionados para exclusão em massa." : ""}
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
              {lead.is_really_blocked && (
                <span className="text-[10px] text-red-500 font-bold font-mono tracking-wide" title="Bloqueado — não recebe disparos">
                  🚫 Bloqueado
                </span>
              )}
              {lead.last_template_name && (
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/50 w-fit max-w-[200px] truncate" title={`Último Template: ${lead.last_template_name} enviado em ${formatDateBrasilia(lead.last_template_dispatched_at)}`}>
                    📄 {lead.last_template_name} {lead.last_template_dispatched_at && <span className="text-[8.5px] font-normal opacity-80">({formatDateBrasilia(lead.last_template_dispatched_at)})</span>}
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowResetModal(true)}
                    className="p-1 hover:bg-rose-50 text-rose-500 hover:text-rose-600 dark:hover:bg-rose-950/40 rounded transition-colors"
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
      <td className="px-3 py-2.5 text-right whitespace-nowrap">
        <div className="flex items-center justify-end gap-1">
          {lead.variables && Object.keys(lead.variables).length > 0 && (
            <button
              onClick={() => onOpenVariables(lead)}
              className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
              title="Ver Variáveis Customizadas / IA"
            >
              <FiDatabase size={15} />
            </button>
          )}
          <button
            onClick={() => onEdit(lead)}
            className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
            title="Editar Lead"
          >
            <FiEdit2 size={15} />
          </button>
          <button
            onClick={() => onOpenBlockModal(lead)}
            className={`p-1.5 rounded-lg transition-colors ${
              lead.is_really_blocked || lead.resting_expires_at
                ? 'text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20'
                : 'text-gray-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20'
            }`}
            title={
              lead.is_really_blocked
                ? 'Contato Bloqueado — clique para gerenciar'
                : lead.resting_expires_at
                ? 'Contato em Repouso — clique para gerenciar'
                : 'Gerenciar Bloqueio / Repouso'
            }
          >
            <FiSlash size={15} />
          </button>
          <button
            onClick={() => onToggleLock(lead)}
            disabled={togglingLock === lead.id}
            className={`p-1.5 rounded-lg transition-colors ${lead.is_locked ? 'text-amber-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20' : 'text-gray-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20'} disabled:opacity-50`}
            title={lead.is_locked ? 'Remover proteção do contato' : 'Proteger contato (impede exclusão)'}
          >
            {lead.is_locked ? <FiLock size={15} /> : <FiUnlock size={15} />}
          </button>
          <button
            onClick={() => {
              if (lead.is_locked) toast.error("Não é possível deletar um contato protegido.");
              else onDelete(lead);
            }}
            className={`p-1.5 rounded-lg transition-colors ${lead.is_locked ? 'text-gray-400/30 cursor-not-allowed' : 'text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'}`}
            title={lead.is_locked ? 'Contato protegido — remova a proteção para excluir' : 'Excluir Contato e Histórico'}
          >
            <FiTrash2 size={15} />
          </button>
        </div>
      </td>

      {/* Modal de Confirmação de Remoção do Histórico do Template */}
      {showResetModal && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 w-screen h-screen">
          <div className="w-full max-w-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-3xl p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200" style={{ userSelect: 'none', cursor: 'default' }}>
            <h3 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2 mb-3">
              <FiTrash2 className="text-rose-500 w-5 h-5" /> 
              Remover Trava de 24h de Template?
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed mb-6 bg-gray-50 dark:bg-gray-900/50 p-3.5 rounded-2xl border border-gray-150 dark:border-gray-700">
              Isso irá remover o registro do último template (<strong>{lead.last_template_name}</strong>) para o contato <strong>{lead.name || lead.phone}</strong>. O contato ficará liberado para receber este mesmo template novamente de imediato.
            </p>
            <div className="flex justify-end gap-2.5">
              <button
                type="button"
                disabled={isResetting}
                onClick={() => setShowResetModal(false)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-xl text-xs font-bold transition-all"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isResetting}
                onClick={handleConfirmResetTemplateHistory}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
              >
                {isResetting ? "Removendo..." : "Confirmar Remoção"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </tr>
  );
}
