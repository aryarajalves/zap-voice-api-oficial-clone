import React from 'react';
import { toast } from 'react-hot-toast';
import { FiArchive, FiTag, FiTrash2, FiPlay, FiBookmark, FiCopy, FiEdit2, FiChevronLeft, FiChevronRight } from 'react-icons/fi';

export const FunnelList = ({ logic }) => {
  const hasTemplateNode = (funnel) => funnel.steps?.nodes?.some(n => n.type === 'templateNode');

  // Cálculo da Paginação
  const totalItems = logic.funnels.length;
  const totalPages = Math.ceil(totalItems / logic.itemsPerPage) || 1;
  const startIndex = (logic.currentPage - 1) * logic.itemsPerPage;
  const paginatedFunnels = logic.funnels.slice(startIndex, startIndex + logic.itemsPerPage);

  const handleEditTag = (funnel, e) => {
    if (e) e.stopPropagation();
    logic.setFunnelForTag(funnel);
    logic.setIsTagModalOpen(true);
  };

  return (
    <div className="lg:col-span-12 space-y-4">
      {/* Abas e Filtros no topo da lista */}
      <div className="flex bg-gray-100 dark:bg-gray-900/60 p-1 rounded-xl w-60 select-none">
        <button
          onClick={() => logic.setIsArchivedTab(false)}
          className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${!logic.isArchivedTab ? 'bg-white dark:bg-gray-800 shadow-sm text-blue-600 dark:text-blue-400' : 'text-gray-400 hover:text-gray-600'}`}
        >
          Ativos
        </button>
        <button
          onClick={() => logic.setIsArchivedTab(true)}
          className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${logic.isArchivedTab ? 'bg-white dark:bg-gray-800 shadow-sm text-blue-600 dark:text-blue-400' : 'text-gray-400 hover:text-gray-600'}`}
        >
          Arquivados
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-6 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex justify-between items-center">
          <div className="flex items-center gap-3">
            {logic.funnels.length > 0 && (
              <input
                type="checkbox"
                checked={logic.selectedFunnelIds.length === logic.funnels.length && logic.funnels.length > 0}
                onChange={logic.toggleSelectAll}
                className="w-5 h-5 text-blue-600 rounded border-gray-300"
                title="Selecionar Todos"
              />
            )}
            <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
              {logic.isArchivedTab ? 'Funis Arquivados' : 'Seus Funis'}
            </h2>
          </div>
          {logic.selectedFunnelIds.length > 0 && (
            <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
              {logic.selectedFunnelIds.length} de {logic.funnels.length} selecionados
            </span>
          )}
        </div>

        <div className="p-4 space-y-3">
          {logic.funnels.length === 0 && (
            <div className="text-center py-10 text-gray-400">
              <p>{logic.isArchivedTab ? 'Nenhum funil arquivado.' : 'Nenhum funil criado ainda.'}</p>
              {!logic.isArchivedTab && (
                <button onClick={logic.handleCreateFunnel} className="text-blue-600 font-medium hover:underline mt-2">Criar o primeiro</button>
              )}
            </div>
          )}

          {paginatedFunnels.map(funnel => (
            <div
              key={funnel.id}
              className={`group p-4 rounded-xl transition-all border-2 flex justify-between items-center ${
                logic.selectedFunnel?.id === funnel.id 
                  ? 'border-blue-500 bg-blue-50/10' 
                  : funnel.is_pinned
                    ? 'border-amber-300/50 bg-amber-500/[0.02] dark:border-amber-500/30'
                    : 'border-gray-100 dark:border-gray-700 hover:border-gray-200 dark:hover:border-gray-600'
              }`}
            >
              <div className="flex items-center gap-4">
                <input
                  type="checkbox"
                  checked={logic.selectedFunnelIds.includes(funnel.id)}
                  onChange={(e) => logic.toggleFunnelSelection(funnel.id, e)}
                  onClick={(e) => e.stopPropagation()}
                  className="w-5 h-5 text-blue-600 rounded border-gray-300"
                />
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className={`font-bold text-lg ${logic.selectedFunnel?.id === funnel.id ? 'text-blue-700 dark:text-blue-400' : 'text-gray-800 dark:text-gray-100'}`}>{funnel.name}</h3>
                    
                    {/* Badge de Fixado (Pinned) */}
                    {funnel.is_pinned && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-[10px] font-bold border border-amber-200 dark:border-amber-800/50 flex items-center gap-1 animate-pulse">
                        📌 FIXADO
                      </span>
                    )}

                    {/* Badge de Etiqueta (Tag) */}
                    {funnel.tag && (
                      <span className="px-2 py-0.5 rounded-full bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 text-[10px] font-bold border border-violet-200 dark:border-violet-800/50">
                        🏷️ {funnel.tag}
                      </span>
                    )}

                    {hasTemplateNode(funnel) && (
                      <span className="px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-[10px] font-bold uppercase border border-purple-200 dark:border-purple-800/50">
                        Template
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 flex-wrap">
                    <span>{Array.isArray(funnel.steps) ? funnel.steps.length : (funnel.steps?.nodes?.length || 0)} etapas</span>
                    {funnel.trigger_phrase && <span className="text-yellow-600 font-medium">⚡ Gatilho</span>}
                    {funnel.created_at && (
                      <span className="text-gray-400 dark:text-gray-500">
                        • Criado em: {new Date(funnel.created_at).toLocaleString('pt-BR', {
                          timeZone: 'America/Sao_Paulo',
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                {/* Botão Disparar (somente ativos e se não for template) */}
                {!funnel.is_archived && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (hasTemplateNode(funnel)) {
                        toast.error("Funis de Template devem ser disparados pela aba 'Disparo em Massa'.", {
                          duration: 5000,
                          icon: '⚠️'
                        });
                        return;
                      }
                      logic.setSelectedFunnel(funnel);
                      logic.setIsTriggerModalOpen(true);
                    }}
                    className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${hasTemplateNode(funnel)
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-gray-800 dark:text-gray-600'
                      : 'hover:bg-green-50 dark:hover:bg-green-900/20 text-green-600'
                      }`}
                    title={hasTemplateNode(funnel) ? "Use o Disparo em Massa" : "Disparar Funil"}
                  >
                    <FiPlay size={16} />
                    <span className="text-xs font-bold uppercase tracking-wider">Disparar</span>
                  </button>
                )}

                {/* Botão de Etiquetar */}
                <button
                  onClick={(e) => handleEditTag(funnel, e)}
                  className="px-3 py-1.5 hover:bg-violet-50 dark:hover:bg-violet-900/20 rounded-lg text-violet-600 flex items-center gap-1.5 transition-all"
                  title="Etiquetar Funil"
                >
                  <FiTag size={16} />
                  <span className="text-xs font-bold uppercase tracking-wider">Etiqueta</span>
                </button>

                {/* Botão de Fixar/Desafixar */}
                {!funnel.is_archived && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      logic.handlePinFunnel(funnel.id, !funnel.is_pinned);
                    }}
                    className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${funnel.is_pinned ? 'hover:bg-amber-50 dark:hover:bg-amber-900/20 text-amber-600' : 'hover:bg-gray-50 dark:hover:bg-gray-800/20 text-gray-500 hover:text-gray-700'}`}
                    title={funnel.is_pinned ? "Desafixar do Topo" : "Fixar no Topo"}
                  >
                    <FiBookmark size={16} fill={funnel.is_pinned ? "currentColor" : "none"} />
                    <span className="text-xs font-bold uppercase tracking-wider">{funnel.is_pinned ? 'Desafixar' : 'Fixar'}</span>
                  </button>
                )}

                {/* Botão de Arquivar/Desarquivar */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    logic.handleArchiveFunnel(funnel.id, !funnel.is_archived);
                  }}
                  className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${funnel.is_archived ? 'hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-emerald-600' : 'hover:bg-yellow-50 dark:hover:bg-yellow-900/20 text-yellow-600'}`}
                  title={funnel.is_archived ? "Restaurar Funil" : "Arquivar Funil"}
                >
                  <FiArchive size={16} />
                  <span className="text-xs font-bold uppercase tracking-wider">{funnel.is_archived ? 'Restaurar' : 'Arquivar'}</span>
                </button>

                {/* Botão de Duplicar */}
                <button
                  onClick={(e) => logic.handleDuplicateFunnel(funnel.id, e)}
                  className="px-3 py-1.5 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg text-indigo-600 flex items-center gap-1.5 transition-all"
                  title="Duplicar Funil"
                >
                  <FiCopy size={16} />
                  <span className="text-xs font-bold uppercase tracking-wider">Duplicar</span>
                </button>

                {/* Botão de Editar */}
                <button
                  onClick={(e) => logic.handleEdit(funnel, e)}
                  className="px-3 py-1.5 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg text-blue-600 flex items-center gap-1.5 transition-all"
                  title="Editar Funil"
                >
                  <FiEdit2 size={16} />
                  <span className="text-xs font-bold uppercase tracking-wider">Editar</span>
                </button>

                {/* Botão de Excluir */}
                <button
                  onClick={(e) => logic.confirmDelete(funnel.id, e)}
                  className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-red-600 transition-all"
                  title="Excluir"
                >
                  <FiTrash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Footer com Paginação e Seletor de Itens por Página */}
        {logic.funnels.length > 0 && (
          <div className="flex flex-col sm:flex-row justify-between items-center px-6 py-4 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-700 gap-4">
            <div className="flex items-center gap-2 text-xs text-gray-500 select-none">
              <span>Exibir</span>
              <select
                value={logic.itemsPerPage}
                onChange={(e) => {
                  logic.setItemsPerPage(Number(e.target.value));
                  logic.setCurrentPage(1);
                }}
                className="nodrag nopan p-1.5 text-xs border rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-semibold border-gray-200 dark:border-gray-700 outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
              </select>
              <span>funis por página</span>
            </div>

            <div className="flex items-center gap-3 select-none">
              <button
                onClick={() => logic.setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={logic.currentPage === 1}
                className="p-1.5 rounded-lg border bg-white dark:bg-gray-800 disabled:opacity-50 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
              >
                <FiChevronLeft size={16} />
              </button>
              <span className="text-xs font-bold text-gray-600 dark:text-gray-400 px-1">
                Página {logic.currentPage} de {totalPages}
              </span>
              <button
                onClick={() => logic.setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={logic.currentPage === totalPages}
                className="p-1.5 rounded-lg border bg-white dark:bg-gray-800 disabled:opacity-50 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
              >
                <FiChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
