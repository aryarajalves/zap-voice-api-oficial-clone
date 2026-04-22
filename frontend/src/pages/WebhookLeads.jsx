import React, { useState, useEffect } from 'react';
import { FiSearch, FiFilter, FiRefreshCw, FiExternalLink, FiUser, FiCalendar, FiBox, FiDollarSign, FiDownload, FiTrash2, FiTag, FiEdit2, FiSlash, FiMessageSquare } from 'react-icons/fi';
import { API_URL } from '../config';
import { fetchWithAuth } from '../AuthContext';
import { useClient } from '../contexts/ClientContext';
import { toast } from 'react-hot-toast';
import ConfirmModal from '../components/ConfirmModal';
import EditLeadModal from '../components/EditLeadModal';
import ContactImportModal from '../components/ContactImportModal';
import CreateLeadModal from '../components/CreateLeadModal';
import { FiUpload, FiPlus } from 'react-icons/fi';

export default function WebhookLeads() {
  const { activeClient } = useClient();
  const [leads, setLeads] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [limit] = useState(20);
  
  // Filters
  const [search, setSearch] = useState('');
  const [eventType, setEventType] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [availableFilters, setAvailableFilters] = useState({ event_types: [], product_names: [], tags: [] });

  // Selection & Deletion
  const [selectedLeads, setSelectedLeads] = useState([]);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [leadToDelete, setLeadToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Edit Lead
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [leadToEdit, setLeadToEdit] = useState(null);

  // Clean corrupted tags
  const [isCleaningTags, setIsCleaningTags] = useState(false);
  const [isCleanConfirmOpen, setIsCleanConfirmOpen] = useState(false);

  useEffect(() => {
    if (activeClient) {
      fetchLeads();
      fetchFilters();
    }
  }, [activeClient, page, eventType, selectedTag]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (activeClient) fetchLeads();
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      let url = `${API_URL}/leads?skip=${page * limit}&limit=${limit}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      if (eventType) url += `&event_type=${encodeURIComponent(eventType)}`;
      if (selectedTag) url += `&tag=${encodeURIComponent(selectedTag)}`;

      const res = await fetchWithAuth(url, {}, activeClient.id);
      if (res.ok) {
        const data = await res.json();
        setLeads(data.items);
        setTotal(data.total);
      }
    } catch (err) {
      console.error(err);
      toast.error("Erro ao carregar leads.");
    } finally {
      setLoading(false);
    }
  };

  const fetchFilters = async () => {
    try {
      const res = await fetchWithAuth(`${API_URL}/leads/filters`, {}, activeClient.id);
      if (res.ok) {
        const data = await res.json();
        setAvailableFilters(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCleanTags = async () => {
    setIsCleaningTags(true);
    try {
      const res = await fetchWithAuth(`${API_URL}/leads/clean-corrupted-tags`, { method: 'POST' }, activeClient.id);
      if (res.ok) {
        const data = await res.json();
        toast.success(data.message);
        fetchLeads();
        fetchFilters();
      } else {
        toast.error('Erro ao limpar etiquetas.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Erro ao limpar etiquetas.');
    } finally {
      setIsCleaningTags(false);
    }
  };

  const formatDateBrasilia = (isoStr) => {
    if (!isoStr) return '---';
    try {
      return new Date(isoStr).toLocaleString('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '---';
    }
  };

  const handleExport = async () => {
    if (total === 0) {
      toast.error("Não há dados para exportar ainda.");
      return;
    }
    try {
      let url = `${API_URL}/leads/export?`;
      if (search) url += `search=${encodeURIComponent(search)}&`;
      if (eventType) url += `event_type=${encodeURIComponent(eventType)}&`;
      if (selectedTag) url += `tag=${encodeURIComponent(selectedTag)}&`;

      const response = await fetchWithAuth(url, {}, activeClient.id);
      if (response.ok) {
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        const filename = `leads_${new Date().toISOString().split('T')[0]}.csv`;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        link.remove();
        toast.success("Exportação concluída!");
      } else {
        throw new Error("Erro na exportação");
      }
    } catch (err) {
      console.error(err);
      toast.error("Erro ao exportar leads.");
    }
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedLeads(leads.map(lead => lead.id));
    } else {
      setSelectedLeads([]);
    }
  };

  const handleSelectLead = (leadId) => {
    setSelectedLeads(prev => 
      prev.includes(leadId) ? prev.filter(id => id !== leadId) : [...prev, leadId]
    );
  };

  const executeDelete = async () => {
    setIsDeleting(true);
    try {
      if (leadToDelete === 'bulk') {
        const res = await fetchWithAuth(`${API_URL}/leads/bulk-delete`, {
          method: 'POST',
          body: JSON.stringify({ lead_ids: selectedLeads })
        }, activeClient.id);
        
        if (res.ok) {
          toast.success(`${selectedLeads.length} leads excluídos com sucesso.`);
          setSelectedLeads([]);
          fetchLeads();
        } else {
          toast.error("Erro ao deletar leads selecionados.");
        }
      } else if (leadToDelete) {
        const res = await fetchWithAuth(`${API_URL}/leads/${leadToDelete.id}`, {
          method: 'DELETE'
        }, activeClient.id);
        
        if (res.ok) {
          toast.success("Lead excluído com sucesso.");
          setSelectedLeads(prev => prev.filter(id => id !== leadToDelete.id));
          fetchLeads();
        } else {
          toast.error("Erro ao deletar o lead.");
        }
      }
    } catch (err) {
      console.error(err);
      toast.error("Erro ao processar exclusão.");
    } finally {
      setIsDeleting(false);
      setIsDeleteModalOpen(false);
      setLeadToDelete(null);
    }
  };

  const getStatusBadge = (status) => {
    const s = status?.toLowerCase() || '';
    if (s.includes('aprovada') || s.includes('paid')) return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800';
    if (s.includes('pix') || s.includes('waiting')) return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800';
    if (s.includes('recusado') || s.includes('refused') || s.includes('cancelado')) return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800';
    if (s.includes('reembolso')) return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 dark:border-purple-800';
    return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400 border-gray-200 dark:border-gray-700';
  };

  const formatStatus = (status) => {
    if (!status) return 'Outros';
    return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <div className="p-8 max-w-7xl mx-auto animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-xl shadow-lg shadow-blue-500/20">
              <FiUser className="text-white" />
            </div>
            Contatos
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2">
            Central de contatos capturados via integrações de webhook.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {selectedLeads.length > 0 && (
            <button 
              onClick={() => { setLeadToDelete('bulk'); setIsDeleteModalOpen(true); }}
              className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 rounded-xl text-sm font-medium hover:bg-red-200 dark:hover:bg-red-900/50 transition-all border border-red-200 dark:border-red-800/30"
            >
              <FiTrash2 />
              Excluir ({selectedLeads.length})
            </button>
          )}

          <button
            onClick={() => setIsCleanConfirmOpen(true)}
            disabled={isCleaningTags}
            title="Remover etiquetas corrompidas de todos os contatos"
            className="flex items-center gap-2 px-4 py-2 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 rounded-xl text-sm font-medium hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-all border border-amber-200 dark:border-amber-800/30 disabled:opacity-50"
          >
            <FiSlash className={isCleaningTags ? 'animate-spin' : ''} />
            {isCleaningTags ? 'Limpando...' : 'Limpar Tags Corrompidas'}
          </button>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-500/20"
          >
            <FiPlus />
            Novo Contato
          </button>

          <button 
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20"
          >
            <FiUpload />
            Importar
          </button>

          <button 
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-500/20"
          >
            <FiDownload />
            Exportar CSV
          </button>
          
          <button 
            onClick={() => { fetchLeads(); fetchFilters(); }}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-all shadow-sm"
          >
            <FiRefreshCw className={loading ? 'animate-spin' : ''} />
            Atualizar
          </button>
        </div>
      </div>

      {/* FILTERS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="relative">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            type="text" 
            placeholder="Buscar por nome ou telefone..."
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        
        <div className="relative">
          <FiTag className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <select 
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all appearance-none"
            value={selectedTag}
            onChange={(e) => setSelectedTag(e.target.value)}
          >
            <option value="">Todas as Etiquetas</option>
            {availableFilters.tags?.map(tag => (
              <option key={tag} value={tag}>{tag}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center justify-end px-2">
           <span className="text-xs font-semibold text-gray-400">Total: {total} leads</span>
        </div>
      </div>

    {/* TABLE */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700">
                <th className="w-10 px-6 py-4">
                  <input 
                    type="checkbox" 
                    className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 bg-white dark:bg-gray-800"
                    checked={leads.length > 0 && selectedLeads.length === leads.length}
                    onChange={handleSelectAll}
                  />
                </th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Lead</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Etiquetas</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Chegada</th>
                <th className="px-6 py-3 text-right text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {loading ? (
                Array(5).fill(0).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan="6" className="px-6 py-8">
                       <div className="h-4 bg-gray-100 dark:bg-gray-700 rounded w-full"></div>
                    </td>
                  </tr>
                ))
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-gray-500 italic">
                    Nenhum lead encontrado com os filtros atuais.
                  </td>
                </tr>
              ) : (
                leads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors group">
                    <td className="px-6 py-4">
                      <input 
                        type="checkbox" 
                        className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 bg-white dark:bg-gray-800"
                        checked={selectedLeads.includes(lead.id)}
                        onChange={() => handleSelectLead(lead.id)}
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold border border-blue-100 dark:border-blue-800">
                          {lead.name ? lead.name[0].toUpperCase() : '?'}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-white leading-tight">
                            {lead.name || 'Sem Nome'}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
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
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                        <span className="text-sm truncate max-w-[200px]" title={lead.email}>
                          {lead.email || '---'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1.5">
                        {lead.tags ? lead.tags.split(',').map((tag, idx) => (
                          <span 
                            key={idx} 
                            className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-100 dark:border-blue-800/50"
                          >
                            {tag.trim()}
                          </span>
                        )) : (
                          <span className="text-[10px] text-gray-400 italic">Sem etiquetas</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
                        <FiCalendar size={12} className="flex-shrink-0 text-gray-400" />
                        <span className="text-xs font-mono">{formatDateBrasilia(lead.created_at)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        {lead.chatwoot_url && (
                          <a 
                            href={lead.chatwoot_url} 
                            target="_blank" 
                            rel="noreferrer"
                            className="p-2 text-purple-400 hover:text-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors"
                            title="Ver Conversa no Chatwoot"
                          >
                            <FiMessageSquare size={18} />
                          </a>
                        )}
                        <button
                          onClick={() => { setLeadToEdit(lead); setIsEditModalOpen(true); }}
                          className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                          title="Editar Informações"
                        >
                          <FiEdit2 size={18} />
                        </button>
                        <button 
                          onClick={() => { setLeadToDelete(lead); setIsDeleteModalOpen(true); }}
                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          title="Excluir Contato e Histórico"
                        >
                          <FiTrash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <button 
            disabled={page === 0}
            onClick={() => setPage(p => p - 1)}
            className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 disabled:opacity-50 transition-colors"
          >
            Anterior
          </button>
          <span className="text-xs text-gray-500 font-bold uppercase tracking-widest">
            Página {page + 1} de {Math.ceil(total / limit) || 1}
          </span>
          <button 
            disabled={(page + 1) * limit >= total}
            onClick={() => setPage(p => p + 1)}
            className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 disabled:opacity-50 transition-colors"
          >
            Próxima
          </button>
        </div>
      </div>

      <ConfirmModal
        isOpen={isCleanConfirmOpen}
        onClose={() => setIsCleanConfirmOpen(false)}
        onConfirm={handleCleanTags}
        title="Limpar Etiquetas Corrompidas"
        message="Isso vai varrer todos os contatos e remover automaticamente as etiquetas com caracteres especiais ou escapados (vindas do Chatwoot). Etiquetas normais não serão afetadas."
        confirmText="Limpar Agora"
        cancelText="Cancelar"
        isDangerous={false}
      />

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => { setIsDeleteModalOpen(false); setLeadToDelete(null); }}
        onConfirm={executeDelete}
        title={leadToDelete === 'bulk' ? 'Excluir Vários Contatos' : 'Excluir Contato e Histórico'}
        message={
          leadToDelete === 'bulk' 
            ? `Tem certeza que deseja excluir os ${selectedLeads.length} contatos selecionados? Esta ação também apagará todo o histórico de eventos e agendamentos desses contatos.`
            : `Tem certeza que deseja excluir este contato? Esta ação apagará todo o histórico de eventos e agendamentos atrelados ao número dele (${leadToDelete?.phone}).`
        }
        confirmText={isDeleting ? "Excluindo..." : "Excluir Definitivamente"}
        cancelText="Cancelar"
        confirmColor="red"
      />

      <ContactImportModal 
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportComplete={() => {
          fetchLeads();
          fetchFilters();
        }}
      />

      <EditLeadModal
        isOpen={isEditModalOpen}
        onClose={() => { setIsEditModalOpen(false); setLeadToEdit(null); }}
        lead={leadToEdit}
        onSuccess={() => {
          fetchLeads();
          fetchFilters();
        }}
      />

      <CreateLeadModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => {
          fetchLeads();
          fetchFilters();
        }}
      />
    </div>
  );
}
