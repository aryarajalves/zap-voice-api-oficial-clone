import React, { useState } from 'react';
import { FiDatabase } from 'react-icons/fi';
import { API_URL } from '../../../config';
import { fetchWithAuth } from '../../../AuthContext';
import { useClient } from '../../../contexts/ClientContext';
import { toast } from 'react-hot-toast';
import CustomFieldsModal from './CustomFieldsModal';
import LeadTableRow from './LeadTableRow';
import { TagsVisibilityModal } from './TagsVisibilityModal';

export default function Table({
  loading,
  leads,
  selectedLeads,
  handleSelectAll,
  handleSelectLead,
  setLeadToEdit,
  setIsEditModalOpen,
  setLeadToDelete,
  setIsDeleteModalOpen,
  page,
  setPage,
  total,
  limit,
  setLimit,
  fetchLeads,
  selectAllPages,
  handleSelectAllPages,
  handleClearSelectAllPages,
  updateLeadInPlace,
  onOpenBlockModal,
}) {
  const { activeClient } = useClient();
  const [togglingLock, setTogglingLock] = useState(null);

  // Custom Columns
  const [showCustomColumns, setShowCustomColumns] = useState(false);

  // Variables Modal
  const [isVariablesModalOpen, setIsVariablesModalOpen] = useState(false);
  const [leadForVariables, setLeadForVariables] = useState(null);

  // Tags Visibility Modal
  const [selectedTagsForModal, setSelectedTagsForModal] = useState(null);
  const [modalTags, setModalTags] = useState([]);
  const [savingTags, setSavingTags] = useState(false);

  const customColumnsKeys = React.useMemo(() => {
    const keysSet = new Set();
    leads.forEach(l => {
      if (l.variables && typeof l.variables === 'object') Object.keys(l.variables).forEach(k => keysSet.add(k));
    });
    return Array.from(keysSet);
  }, [leads]);

  const handleOpenTagsModal = (lead) => {
    const cleanedTags = lead.tags
      ? lead.tags.replace(/[\[\]'"]/g, '').split(',').map(t => t.trim()).filter(Boolean)
      : [];
    const prefVisible = lead.variables?.visible_tags;
    const tagsWithVisibility = Array.isArray(prefVisible)
      ? cleanedTags.map(name => ({ name, visible: prefVisible.includes(name) }))
      : cleanedTags.map((name, idx) => ({ name, visible: idx < 3 }));
    setModalTags(tagsWithVisibility);
    setSelectedTagsForModal({ leadId: lead.id, contactName: lead.name || 'Sem Nome', leadVariables: lead.variables || {} });
  };

  const handleToggleTagVisibility = (index) => {
    const targetTag = modalTags[index];
    const currentlyVisibleCount = modalTags.filter(t => t.visible).length;
    if (!targetTag.visible && currentlyVisibleCount >= 3) {
      toast.error("Você pode selecionar no máximo 3 etiquetas para exibir na tela inicial.");
      return;
    }
    const updated = [...modalTags];
    updated[index] = { ...targetTag, visible: !targetTag.visible };
    setModalTags(updated);
  };

  const handleSaveTagsVisibility = async () => {
    setSavingTags(true);
    try {
      const visible = modalTags.filter(t => t.visible).map(t => t.name);
      const updatedVariables = { ...selectedTagsForModal.leadVariables, visible_tags: visible };
      const res = await fetchWithAuth(`${API_URL}/leads/${selectedTagsForModal.leadId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ variables: updatedVariables })
      }, activeClient?.id);
      if (res.ok) {
        toast.success("Visibilidade das etiquetas salva com sucesso!");
        setSelectedTagsForModal(null);
        fetchLeads();
      } else {
        toast.error("Erro ao salvar visibilidade das etiquetas.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Erro ao salvar visibilidade das etiquetas.");
    } finally {
      setSavingTags(false);
    }
  };

  const handleToggleLock = async (lead) => {
    setTogglingLock(lead.id);
    try {
      const res = await fetchWithAuth(`${API_URL}/leads/${lead.id}/lock`, { method: 'PATCH' }, activeClient?.id);
      if (res.ok) {
        const data = await res.json();
        toast.success(data.message);
        // Atualiza o contato no lugar ao invés de recarregar a lista inteira
        // (evita que o contato "suma" por mudança de updated_at e reordenação)
        if (updateLeadInPlace) {
          updateLeadInPlace(lead.id, { is_locked: data.is_locked });
        } else {
          fetchLeads();
        }
      } else {
        toast.error('Erro ao alterar proteção do contato.');
      }
    } catch {
      toast.error('Erro ao alterar bloqueio do contato.');
    } finally {
      setTogglingLock(null);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
      <div className="px-6 py-4 bg-gray-50/55 dark:bg-gray-900/30 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center flex-wrap gap-2">
        <h4 className="text-xs font-black text-gray-500 uppercase tracking-widest">Base de Leads</h4>
        {customColumnsKeys.length > 0 && (
          <button
            onClick={() => setShowCustomColumns(!showCustomColumns)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all active:scale-95 flex items-center gap-1.5 ${
              showCustomColumns
                ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50'
            }`}
          >
            <FiDatabase size={13} />
            {showCustomColumns ? 'Ocultar Colunas IA' : 'Mostrar Colunas IA'}
            <span className="bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-[9px] px-1.5 py-0.5 rounded-full font-black">
              {customColumnsKeys.length}
            </span>
          </button>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700">
              <th className="w-8 px-3 py-3">
                <input
                  type="checkbox"
                  className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 bg-white dark:bg-gray-800"
                  checked={leads.length > 0 && leads.filter(l => !l.is_locked).length > 0 && selectedLeads.length === leads.filter(l => !l.is_locked).length}
                  onChange={handleSelectAll}
                />
              </th>
              <th className="px-3 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Lead</th>
              <th className="px-3 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Email</th>
              <th className="px-3 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Etiquetas</th>
              {showCustomColumns && customColumnsKeys.map(key => (
                <th key={key} className="px-3 py-3 text-xs font-bold text-rose-500 uppercase tracking-wider font-mono">{key}</th>
              ))}
              <th className="px-3 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Atualizado</th>
              <th className="px-3 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Chegada</th>
              <th className="px-3 py-3 text-right text-[11px] font-bold text-gray-500 uppercase tracking-wider">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {/* Banner de seleção de todas as páginas */}
            {(() => {
              const pageUnlocked = leads.filter(l => !l.is_locked);
              const allPageSelected = pageUnlocked.length > 0 && selectedLeads.length === pageUnlocked.length;
              const hasMorePages = total > limit;
              if (!allPageSelected || !hasMorePages) return null;
              return (
                <tr>
                  <td colSpan={7 + (leads.some(l => l.variables && Object.keys(l.variables).length) ? 1 : 0)} className="px-6 py-3 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-100 dark:border-blue-800/30">
                    <div className="flex items-center justify-center gap-3 text-sm flex-wrap">
                      {selectAllPages ? (
                        <>
                          <span className="text-blue-700 dark:text-blue-300 font-semibold">
                            Todos os <strong>{total.toLocaleString('pt-BR')}</strong> contatos estão selecionados.
                          </span>
                          <button
                            onClick={handleClearSelectAllPages}
                            className="text-blue-600 dark:text-blue-400 underline font-bold hover:text-blue-800 text-xs"
                          >
                            Limpar seleção
                          </button>
                        </>
                      ) : (
                        <>
                          <span className="text-blue-700 dark:text-blue-300 font-semibold">
                            Os <strong>{pageUnlocked.length}</strong> contatos desta página estão selecionados.
                          </span>
                          <button
                            onClick={handleSelectAllPages}
                            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-all"
                          >
                            Selecionar todos os {total.toLocaleString('pt-BR')} contatos
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })()}
            {loading ? (
              Array(5).fill(0).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td colSpan={7 + (showCustomColumns ? customColumnsKeys.length : 0)} className="px-6 py-8">
                    <div className="h-4 bg-gray-100 dark:bg-gray-700 rounded w-full"></div>
                  </td>
                </tr>
              ))
            ) : leads.length === 0 ? (
              <tr><td colSpan={7 + (showCustomColumns ? customColumnsKeys.length : 0)} className="px-6 py-12 text-center text-gray-500 italic">Nenhum lead encontrado com os filtros atuais.</td></tr>
            ) : (
              leads.map(lead => (
                <LeadTableRow
                  key={lead.id}
                  lead={lead}
                  selectedLeads={selectedLeads}
                  showCustomColumns={showCustomColumns}
                  customColumnsKeys={customColumnsKeys}
                  togglingLock={togglingLock}
                  onSelectLead={handleSelectLead}
                  onEdit={(l) => { setLeadToEdit(l); setIsEditModalOpen(true); }}
                  onDelete={(l) => { setLeadToDelete(l); setIsDeleteModalOpen(true); }}
                  onToggleLock={handleToggleLock}
                  onOpenVariables={(l) => { setLeadForVariables(l); setIsVariablesModalOpen(true); }}
                  onOpenTagsModal={handleOpenTagsModal}
                  onOpenBlockModal={onOpenBlockModal}
                  updateLeadInPlace={updateLeadInPlace}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Paginação */}
      <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between gap-4 flex-wrap">
        <button disabled={page === 0} onClick={() => setPage(p => p - 1)} className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 disabled:opacity-50 transition-colors">Anterior</button>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500 font-bold uppercase tracking-widest">Página {page + 1} de {Math.ceil(total / limit) || 1}</span>
          <span className="text-gray-300 dark:text-gray-600">|</span>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-400">Exibir</span>
            <select value={limit} onChange={(e) => { setLimit(Number(e.target.value)); setPage(0); }} className="text-xs font-bold px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer">
              {[50, 100, 200, 500].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
            <span className="text-xs text-gray-400">por página</span>
          </div>
          <span className="text-gray-300 dark:text-gray-600">|</span>
          <span className="text-xs text-gray-400">{total} total</span>
        </div>
        <button disabled={(page + 1) * limit >= total} onClick={() => setPage(p => p + 1)} className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 disabled:opacity-50 transition-colors">Próxima</button>
      </div>

      <CustomFieldsModal isOpen={isVariablesModalOpen} onClose={() => { setIsVariablesModalOpen(false); setLeadForVariables(null); }} lead={leadForVariables} />

      <TagsVisibilityModal
        selectedTagsForModal={selectedTagsForModal}
        modalTags={modalTags}
        savingTags={savingTags}
        onClose={() => setSelectedTagsForModal(null)}
        onToggle={handleToggleTagVisibility}
        onSave={handleSaveTagsVisibility}
      />
    </div>
  );
}
