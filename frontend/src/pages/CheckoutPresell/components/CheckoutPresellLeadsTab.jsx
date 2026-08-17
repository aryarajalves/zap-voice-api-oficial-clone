import React from 'react';
import {
  FiUsers, FiSearch, FiTag, FiLink, FiCheck,
  FiMessageSquare, FiTrash2, FiSend, FiChevronLeft, FiChevronRight
} from 'react-icons/fi';

export default function CheckoutPresellLeadsTab({
  leads = [],
  totalLeads,
  loadingLeads,
  search,
  setSearch,
  onSearchSubmit,
  page,
  setPage,
  limit,
  setLimit,
  copiedLeadId,
  onCopyPrepopulatedLink,
  onNavigateToChat,
  onOpenDeleteModal,
  onOpenTemplateModal,
  loadingTemplateConvo
}) {
  const totalPages = Math.ceil(totalLeads / limit) || 1;
  const startItem = totalLeads === 0 ? 0 : (page - 1) * limit + 1;
  const endItem = Math.min(page * limit, totalLeads);

  return (
    <div className="bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-white/5 rounded-2xl p-6 shadow-sm space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 dark:border-gray-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-green-500/10 text-green-500 rounded-xl">
            <FiUsers size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Leads Capturados ({totalLeads})</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">Contatos que preencheram o checkout de aplicação nesta página</p>
          </div>
        </div>

        {/* Search Box */}
        <form onSubmit={onSearchSubmit} className="relative w-full md:w-72">
          <FiSearch className="absolute left-3.5 top-3 text-gray-400" size={16} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, email ou zap..."
            className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
          />
        </form>
      </div>

      {/* Table Content */}
      {loadingLeads ? (
        <div className="py-12 text-center text-gray-400 animate-pulse">Carregando leads capturados...</div>
      ) : leads.length === 0 ? (
        <div className="py-12 text-center space-y-3">
          <FiUsers className="mx-auto text-gray-300 dark:text-gray-600" size={40} />
          <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">Nenhum lead capturado ainda nesta página.</p>
          <p className="text-xs text-gray-400">Divulgue seu link público para começar a receber inscrições.</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Nome</th>
                  <th className="py-3 px-4">E-mail</th>
                  <th className="py-3 px-4">WhatsApp</th>
                  <th className="py-3 px-4">Etiqueta</th>
                  <th className="py-3 px-4">Data/Hora</th>
                  <th className="py-3 px-4 text-right">Ações Rápidas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800/50 text-sm">
                {leads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-gray-900 dark:text-white">{lead.name}</td>
                    <td className="py-3.5 px-4 text-gray-600 dark:text-gray-300">{lead.email}</td>
                    <td className="py-3.5 px-4 font-mono text-gray-600 dark:text-gray-300">+{lead.phone}</td>
                    <td className="py-3.5 px-4">
                      {lead.tag_name ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                          <FiTag size={10} /> {lead.tag_name}
                        </span>
                      ) : '-'}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-gray-400">
                      {lead.created_at ? new Date(lead.created_at).toLocaleString('pt-BR') : '-'}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* Copiar Link Pré-populado */}
                        <button
                          onClick={() => onCopyPrepopulatedLink(lead)}
                          className="px-2.5 py-1.5 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 text-blue-600 dark:text-blue-400 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer"
                          title="Copiar link pré-populado para este lead"
                        >
                          {copiedLeadId === lead.id ? <FiCheck size={14} /> : <FiLink size={14} />}
                          {copiedLeadId === lead.id ? 'Copiado!' : 'Copiar Link Lead'}
                        </button>

                        {/* Ir para o Chat */}
                        {lead.has_chat && onNavigateToChat && (
                          <button
                            onClick={() => onNavigateToChat({ id: lead.conversation_id, name: lead.name, phone: lead.phone })}
                            className="p-1.5 bg-green-500/10 hover:bg-green-500/20 text-green-600 dark:text-green-400 rounded-lg text-xs transition-all cursor-pointer"
                            title="Abrir conversa no Chat"
                          >
                            <FiMessageSquare size={16} />
                          </button>
                        )}

                        {/* Excluir Lead */}
                        <button
                          onClick={() => onOpenDeleteModal(lead)}
                          className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 rounded-lg text-xs transition-all cursor-pointer"
                          title="Excluir Lead"
                        >
                          <FiTrash2 size={16} />
                        </button>

                        {/* Escolher Template / Disparo Rápido */}
                        <button
                          onClick={() => onOpenTemplateModal(lead)}
                          disabled={loadingTemplateConvo}
                          className="p-1.5 bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 rounded-lg text-xs transition-all disabled:opacity-50 cursor-pointer"
                          title="Escolher Template para Disparo"
                        >
                          <FiSend size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Rodapé da Tabela com Paginação & Dropdown (20, 50, 100, 200) */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-gray-100 dark:border-gray-800 text-sm text-gray-500 dark:text-gray-400">
            {/* Seletor de limite por página */}
            <div className="flex items-center gap-2">
              <span>Exibir</span>
              <select
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  setPage(1);
                }}
                className="px-2.5 py-1.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg text-xs font-bold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={200}>200</option>
              </select>
              <span>contatos por página</span>
            </div>

            {/* Range de contatos exibidos */}
            <div className="text-xs">
              Mostrando <strong className="text-gray-900 dark:text-white">{startItem}</strong> a <strong className="text-gray-900 dark:text-white">{endItem}</strong> de <strong className="text-gray-900 dark:text-white">{totalLeads}</strong> contatos
            </div>

            {/* Botões de Navegação de Página */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPage(prev => Math.max(1, prev - 1))}
                disabled={page === 1}
                className="p-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all cursor-pointer"
                title="Página Anterior"
              >
                <FiChevronLeft size={16} />
              </button>

              <span className="px-3 py-1 bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold rounded-lg text-xs">
                Página {page} de {totalPages}
              </span>

              <button
                onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
                disabled={page >= totalPages}
                className="p-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all cursor-pointer"
                title="Próxima Página"
              >
                <FiChevronRight size={16} />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
