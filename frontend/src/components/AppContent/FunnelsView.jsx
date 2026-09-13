import React from 'react';
import { FiArchive, FiTag, FiTrash2, FiGlobe } from 'react-icons/fi';
import VisualFlowBuilder from '../VisualFlowBuilder';
import { FunnelList } from '../FunnelList';
import PageGuard from './PageGuard';

export default function FunnelsView({ logic }) {
  return (
    <PageGuard pageKey="funnels" pagesStatus={logic.user?.pages_status}>
      {logic.showBuilder ? (
        <div className="h-full">
          <VisualFlowBuilder
            funnelId={logic.editingFunnel?.id}
            onBack={() => {
              logic.setShowBuilder(false);
              logic.setEditingFunnel(null);
              logic.fetchFunnels();
            }}
            onSave={logic.fetchFunnels}
            onDelete={() => logic.confirmDelete(logic.editingFunnel?.id)}
          />
        </div>
      ) : (
        <div className="space-y-8">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              {logic.selectedFunnelIds.length > 0 && (
                <div className="flex items-center gap-3 animate-in fade-in slide-in-from-left-4 duration-200 flex-wrap">
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    {logic.selectedFunnelIds.length} selecionado(s)
                  </span>

                  {/* Arquivar / Restaurar em Lote */}
                  <button
                    onClick={() => logic.handleBulkArchive(!logic.isArchivedTab)}
                    className="px-4 py-2 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded-lg font-bold hover:bg-yellow-200 flex items-center"
                  >
                    <FiArchive size={16} className="mr-2" /> {logic.isArchivedTab ? 'Restaurar' : 'Arquivar'}
                  </button>

                  {/* Etiqueta em Lote */}
                  <button
                    onClick={() => {
                      logic.setFunnelForTag('bulk');
                      logic.setIsTagModalOpen(true);
                    }}
                    className="px-4 py-2 bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400 rounded-lg font-bold hover:bg-violet-200 flex items-center"
                  >
                    <FiTag size={16} className="mr-2" /> Etiqueta
                  </button>

                  {/* Excluir em Lote */}
                  <button
                    onClick={() => logic.setIsBulkDeleteModalOpen(true)}
                    className="px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg font-bold hover:bg-red-200"
                  >
                    <FiTrash2 size={16} className="inline mr-2" /> Excluir
                  </button>

                  <button
                    onClick={() => logic.setSelectedFunnelIds([])}
                    className="text-sm text-gray-500 hover:underline"
                  >
                    Limpar
                  </button>
                </div>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => logic.setIsGlobalsModalOpen(true)}
                className="px-5 py-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg font-semibold border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all flex items-center gap-2 shadow-sm text-sm"
              >
                <FiGlobe size={16} className="text-blue-500" />
                Variáveis Globais
              </button>
              <button
                onClick={logic.handleCreateFunnel}
                className="px-6 py-5 bg-blue-600 text-white rounded-lg font-semibold shadow-lg hover:bg-blue-700 hover:shadow-xl transition-all active:scale-95 flex items-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                Novo Funil
              </button>
            </div>
          </div>

          <FunnelList logic={logic} />
        </div>
      )}
    </PageGuard>
  );
}
