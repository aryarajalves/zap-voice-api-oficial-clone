import React from 'react';
import { FiDatabase, FiEdit2, FiSlash, FiLock, FiUnlock, FiTrash2 } from 'react-icons/fi';
import { toast } from 'react-hot-toast';

export default function LeadRowActions({
  lead,
  togglingLock,
  onOpenVariables,
  onEdit,
  onOpenBlockModal,
  onUnblockSingle,
  onToggleLock,
  onDelete
}) {
  const handleBlockClick = () => {
    if (lead.is_really_blocked || lead.resting_expires_at) {
      if (onUnblockSingle) {
        onUnblockSingle(lead);
      } else {
        onOpenBlockModal(lead);
      }
    } else {
      onOpenBlockModal(lead);
    }
  };

  const handleDeleteClick = () => {
    if (lead.is_locked) {
      toast.error('Não é possível deletar um contato protegido.');
    } else {
      onDelete(lead);
    }
  };

  return (
    <div className="flex items-center justify-end gap-1">
      {lead.variables && Object.keys(lead.variables).length > 0 && (
        <button
          type="button"
          onClick={() => onOpenVariables(lead)}
          className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors cursor-pointer"
          title="Ver Variáveis Customizadas / IA"
        >
          <FiDatabase size={15} />
        </button>
      )}
      <button
        type="button"
        onClick={() => onEdit(lead)}
        className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors cursor-pointer"
        title="Editar Lead"
      >
        <FiEdit2 size={15} />
      </button>
      <button
        type="button"
        onClick={handleBlockClick}
        className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
          lead.is_really_blocked
            ? 'text-rose-500 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'
            : lead.resting_expires_at
            ? 'text-amber-500 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'
            : 'text-gray-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20'
        }`}
        title={
          lead.is_really_blocked
            ? 'Contato Bloqueado — clique para desbloquear'
            : lead.resting_expires_at
            ? 'Contato em Repouso — clique para remover do repouso'
            : 'Bloquear ou Colocar em Repouso'
        }
      >
        <FiSlash size={15} />
      </button>
      <button
        type="button"
        onClick={() => onToggleLock(lead)}
        disabled={togglingLock === lead.id}
        className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
          lead.is_locked
            ? 'text-amber-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20'
            : 'text-gray-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20'
        } disabled:opacity-50`}
        title={lead.is_locked ? 'Remover proteção do contato' : 'Proteger contato (impede exclusão)'}
      >
        {lead.is_locked ? <FiLock size={15} /> : <FiUnlock size={15} />}
      </button>
      <button
        type="button"
        onClick={handleDeleteClick}
        className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
          lead.is_locked
            ? 'text-gray-400/30 cursor-not-allowed'
            : 'text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'
        }`}
        title={lead.is_locked ? 'Contato protegido — remova a proteção para excluir' : 'Excluir Contato e Histórico'}
      >
        <FiTrash2 size={15} />
      </button>
    </div>
  );
}
