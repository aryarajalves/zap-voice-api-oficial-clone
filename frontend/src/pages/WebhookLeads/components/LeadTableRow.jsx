import React, { useState } from 'react';
import { FiCalendar } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { API_URL } from '../../../config';
import { fetchWithAuth } from '../../../AuthContext';
import { useClient } from '../../../contexts/ClientContext';
import {
  LeadInfoCell,
  TagsCell,
  LeadRowActions,
  ResetTemplateModal,
  formatDateBrasilia
} from './LeadTableRow/index.js';

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
  onUnblockSingle,
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
      {/* Seleção */}
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

      {/* Identificação e Contato */}
      <td className="px-3 py-2.5">
        <LeadInfoCell lead={lead} onOpenResetModal={() => setShowResetModal(true)} />
      </td>

      {/* E-mail */}
      <td className="px-3 py-2.5">
        <span className="text-xs truncate block max-w-[160px]" title={lead.email}>
          {lead.email || '---'}
        </span>
      </td>

      {/* Etiquetas */}
      <td className="px-3 py-2.5">
        <div className="flex flex-wrap gap-1 items-center max-w-[180px]">
          <TagsCell lead={lead} onOpenTagsModal={onOpenTagsModal} />
        </div>
      </td>

      {/* Colunas Customizadas */}
      {showCustomColumns && customColumnsKeys.map(key => (
        <td key={key} className="px-3 py-2.5 text-xs font-semibold text-gray-700 dark:text-gray-300 font-mono">
          {(lead.variables && lead.variables[key]) || '---'}
        </td>
      ))}

      {/* Atualização */}
      <td className="px-3 py-2.5 whitespace-nowrap">
        <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
          <FiCalendar size={11} className="flex-shrink-0 text-gray-400" />
          <span className="text-xs font-mono">{formatDateBrasilia(lead.updated_at || lead.created_at)}</span>
        </div>
      </td>

      {/* Criação */}
      <td className="px-3 py-2.5 whitespace-nowrap">
        <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
          <FiCalendar size={11} className="flex-shrink-0 text-gray-400" />
          <span className="text-xs font-mono">{formatDateBrasilia(lead.created_at)}</span>
        </div>
      </td>

      {/* Ações */}
      <td className="px-3 py-2.5 text-right whitespace-nowrap">
        <LeadRowActions
          lead={lead}
          togglingLock={togglingLock}
          onOpenVariables={onOpenVariables}
          onEdit={onEdit}
          onOpenBlockModal={onOpenBlockModal}
          onUnblockSingle={onUnblockSingle}
          onToggleLock={onToggleLock}
          onDelete={onDelete}
        />
      </td>

      {/* Modal de Confirmação de Remoção do Histórico do Template */}
      <ResetTemplateModal
        isOpen={showResetModal}
        isResetting={isResetting}
        lead={lead}
        onClose={() => setShowResetModal(false)}
        onConfirm={handleConfirmResetTemplateHistory}
      />
    </tr>
  );
}
