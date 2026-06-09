import React from 'react';
import { createPortal } from 'react-dom';
import { FiTag, FiRefreshCw, FiDatabase } from 'react-icons/fi';
import ConfirmModal from '../../../components/ConfirmModal';

export function BackupModals({
  // Controle de carregamento/atualização do backup manual
  isManualBackupUpdating,
  isLoadingInfo,

  // Deleção individual
  confirmDelete,
  setConfirmDelete,
  handleDeleteBackup,

  // Deleção em lote
  confirmBulkDelete,
  setConfirmBulkDelete,
  isBulkDeleting,
  handleBulkDeleteBackups,
  selectedBackupCount,

  // Restauração
  confirmRestore,
  setConfirmRestore,
  isRestoring,
  handleRestoreBackup,

  // Edição de etiqueta (tag)
  editTagModal,
  setEditTagModal,
  handleSaveTag,
}) {
  return (
    <>
      {/* ── Popup Central de Atualização / Carregamento do Backup Manual ou Inicial ── */}
      {(isManualBackupUpdating || isLoadingInfo) && createPortal(
        <div className="fixed inset-0 z-[20000] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-300">
          <style>{`
            @keyframes loading-bar-progress {
              0% { transform: translateX(-100%); }
              100% { transform: translateX(200%); }
            }
            .animate-loading-bar {
              animation: loading-bar-progress 1.5s infinite linear;
            }
          `}</style>
          <div className="relative bg-white dark:bg-[#1e293b] w-full max-w-md rounded-[2.5rem] p-10 shadow-2xl border border-gray-100 dark:border-white/5 animate-in zoom-in-95 duration-200 text-center">
            {/* Linha de gradiente no topo */}
            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 rounded-t-[2.5rem]" />
            
            <div className="flex flex-col items-center gap-6 mt-4">
              <div className="relative p-6 rounded-[2rem] bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 shadow-lg shadow-blue-500/10 flex items-center justify-center">
                <FiDatabase size={40} className="animate-pulse" />
                <FiRefreshCw size={20} className="absolute bottom-2 right-2 animate-spin text-indigo-500 dark:text-indigo-400" />
              </div>
              
              <div className="space-y-3">
                <h3 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight">
                  {isLoadingInfo ? 'Carregando Dados' : 'Atualizando Banco'}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed font-medium text-sm">
                  {isLoadingInfo 
                    ? 'Buscando as configurações de backup e sincronizando a lista do S3. Por favor, aguarde...' 
                    : 'Estamos criando um novo backup de segurança e sincronizando as informações. Por favor, aguarde...'}
                </p>
              </div>

              {/* Barra de progresso indeterminada de carregamento premium */}
              <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden mt-2">
                <div className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 rounded-full w-1/2 animate-loading-bar" />
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── Modal de Confirmação de Deleção ── */}
      <ConfirmModal
        isOpen={confirmDelete.open}
        title="Excluir Backup"
        message={`Tem certeza que deseja excluir o backup "${confirmDelete.filename}"? Esta ação não pode ser desfeita.`}
        confirmText="Sim, Excluir"
        isDangerous={true}
        onClose={() => setConfirmDelete({ open: false, filename: null })}
        onConfirm={() => handleDeleteBackup(confirmDelete.filename)}
      />

      {/* ── Modal de Confirmação de Deleção em Lote ── */}
      <ConfirmModal
        isOpen={confirmBulkDelete.open}
        title="Excluir Vários Backups"
        message={`Tem certeza que deseja excluir os ${selectedBackupCount} backups selecionados? Esta ação não pode ser desfeita e os arquivos serão removidos do S3.`}
        confirmText={isBulkDeleting ? "Excluindo..." : "Sim, Excluir Todos"}
        isDangerous={true}
        onClose={() => setConfirmBulkDelete({ open: false })}
        onConfirm={handleBulkDeleteBackups}
      />

      {/* ── Modal de Confirmação de Restauração ── */}
      <ConfirmModal
        isOpen={confirmRestore.open}
        title="Restaurar Banco de Dados"
        message={`Tem certeza que deseja restaurar o banco de dados a partir do backup "${confirmRestore.filename}"? Isso irá sobrescrever e apagar todos os dados atuais.`}
        confirmText={isRestoring ? "Restaurando..." : "Sim, Restaurar"}
        isDangerous={true}
        onClose={() => setConfirmRestore({ open: false, filename: null })}
        onConfirm={() => handleRestoreBackup(confirmRestore.filename)}
      />

      {/* ── Modal de Edição de Etiqueta ── */}
      {editTagModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-2xl p-6 shadow-2xl border border-gray-100 dark:border-gray-700 animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">🏷️ Etiqueta do Backup</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 truncate font-mono">
              {editTagModal.filename}
            </p>
            <form onSubmit={handleSaveTag}>
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Nome da Etiqueta
                </label>
                <input
                  type="text"
                  maxLength={100}
                  placeholder="Ex: Backup Estável, Antes da Atualização"
                  value={editTagModal.tag}
                  onChange={e => setEditTagModal(prev => ({ ...prev, tag: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm font-medium focus:ring-2 focus:ring-violet-500 outline-none"
                  autoFocus
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditTagModal({ open: false, filename: null, tag: '' })}
                  className="px-4 py-2.5 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-sm font-bold text-white bg-violet-600 hover:bg-violet-700 rounded-xl shadow-lg transition-all active:scale-95"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
