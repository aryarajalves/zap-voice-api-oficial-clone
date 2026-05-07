import React from 'react';
import { FiUser, FiTrash2, FiSlash, FiPlus, FiUpload, FiDownload, FiRefreshCw } from 'react-icons/fi';

export default function Header({ 
  selectedLeads, 
  setIsDeleteModalOpen, 
  setLeadToDelete, 
  setIsCleanConfirmOpen, 
  isCleaningTags, 
  setIsCreateModalOpen, 
  setIsImportModalOpen, 
  handleExport, 
  fetchLeads, 
  fetchFilters, 
  loading 
}) {
  return (
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
          {isCleaningTags ? 'Limpando...' : 'Limpar Tags'}
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
  );
}
