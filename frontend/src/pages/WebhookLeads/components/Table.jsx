import React from 'react';
import { FiExternalLink, FiMessageSquare, FiEdit2, FiTrash2, FiCalendar } from 'react-icons/fi';

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
  limit 
}) {
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

  return (
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
  );
}
