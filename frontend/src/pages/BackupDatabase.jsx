import React from 'react';
import {
  FiDatabase, FiDownloadCloud, FiTrash2, FiSettings,
  FiClock, FiRefreshCw, FiCalendar, FiTag, FiEdit2, FiDownload
} from 'react-icons/fi';
import { useBackup } from './BackupDatabase/hooks/useBackup';
import { StatusCard } from './BackupDatabase/components/StatusCard';
import { BackupModals } from './BackupDatabase/components/BackupModals';

// ── Componente SVG para Pino ──────────────────────────────────────────────────
const PinIcon = ({ className, filled }) => (
  <svg
    stroke="currentColor"
    fill={filled ? "currentColor" : "none"}
    strokeWidth="2"
    viewBox="0 0 24 24"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    height="1em"
    width="1em"
    xmlns="http://www.w3.org/2000/svg"
  >
    <line x1="12" y1="17" x2="12" y2="22" />
    <path d="M5 17h14v-1.76a2 2 0 0 0-.44-1.24l-2.78-3.55A2 2 0 0 1 15 9.2V5H9v4.2a2 2 0 0 1-.78 1.25L5.44 14a2 2 0 0 0-.44 1.24Z" />
  </svg>
);

// ─── Formatadores ──────────────────────────────────────────────────────────────
function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  });
}

export default function BackupDatabase() {
  const {
    config, backups, isLoadingConfig, isLoadingBackups, isRunning, isSaving, isRestoring, isUploading, isManualBackupUpdating,
    enabled, setEnabled, intervalType, setIntervalType, intervalValue, setIntervalValue, retentionCount, setRetentionCount,
    confirmDelete, setConfirmDelete, confirmRestore, setConfirmRestore, editTagModal, setEditTagModal,
    handleTogglePin, handleSaveTag, fetchBackups, handleRunNow, handleSaveConfig,
    handleDeleteBackup, handleRestoreBackup, handleUploadBackup, handleDownloadBackup,
    selectedBackupFilenames, setSelectedBackupFilenames, confirmBulkDelete, setConfirmBulkDelete, isBulkDeleting,
    toggleBackupSelection, toggleSelectAllBackups, handleBulkDeleteBackups
  } = useBackup();

  const [currentPage, setCurrentPage] = React.useState(1);
  const [itemsPerPage, setItemsPerPage] = React.useState(5);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [backups.length, itemsPerPage]);

  const totalPages = Math.ceil(backups.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedBackups = backups.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* ── Status ── */}
      {isLoadingConfig ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/50 rounded-2xl p-5 animate-pulse h-28" />
          ))}
        </div>
      ) : (
        <StatusCard config={config} />
      )}

      {/* ── Backup Manual ── */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
              <FiDownloadCloud size={20} className="text-blue-500" />
              Backup Manual
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Clique para criar um backup imediato do banco de dados e enviar ao Backblaze S3.
            </p>
          </div>
          <button
            id="btn-run-backup-now"
            onClick={handleRunNow}
            disabled={isRunning || isRestoring || isUploading}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all active:scale-95"
          >
            {isRunning ? (
              <>
                <FiRefreshCw size={18} className="animate-spin" />
                Executando...
              </>
            ) : (
              <>
                <FiDownloadCloud size={18} />
                Fazer Backup Agora
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── Importar Backup Externo ── */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
              <FiDownloadCloud size={20} className="text-amber-500" />
              Importar Backup Externo
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Envie um arquivo de backup (.dump ou .dump.gz) de outro servidor para salvá-lo no S3 e restaurar quando desejar.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <label
              htmlFor="upload-backup-file"
              className={`flex items-center gap-2 px-6 py-3 bg-amber-600 hover:bg-amber-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all active:scale-95 cursor-pointer ${
                isUploading || isRestoring || isRunning ? 'opacity-60 cursor-not-allowed' : ''
              }`}
            >
              {isUploading ? (
                <>
                  <FiRefreshCw size={18} className="animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <FiDownloadCloud size={18} />
                  Fazer Upload de Backup
                </>
              )}
              <input
                id="upload-backup-file"
                type="file"
                accept=".dump,.gz"
                onChange={handleUploadBackup}
                disabled={isUploading || isRestoring || isRunning}
                className="hidden"
              />
            </label>
          </div>
        </div>
      </div>

      {/* ── Configuração de Agendamento ── */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2 mb-6">
          <FiCalendar size={20} className="text-violet-500" />
          Agendamento Automático
        </h2>

        <form onSubmit={handleSaveConfig} className="space-y-6">
          <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-900/40 rounded-xl border border-gray-200 dark:border-gray-700">
            <button
              type="button"
              id="toggle-backup-enabled"
              onClick={() => setEnabled(v => !v)}
              disabled={isRestoring || isUploading}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                enabled ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                enabled ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
            <div>
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                {enabled ? 'Agendamento Ativado' : 'Agendamento Desativado'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {enabled ? 'Backups serão realizados automaticamente.' : 'Apenas backups manuais.'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Frequência
              </label>
              <select
                id="select-interval-type"
                value={intervalType}
                onChange={e => setIntervalType(e.target.value)}
                disabled={!enabled || isRestoring || isUploading}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-50"
              >
                <option value="manual" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">Somente Manual</option>
                <option value="hours" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">A cada X horas</option>
                <option value="days" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">A cada X dias</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Valor do Intervalo
              </label>
              <input
                id="input-interval-value"
                type="number"
                min={1}
                max={9999}
                value={intervalValue}
                onChange={e => setIntervalValue(e.target.value)}
                disabled={!enabled || intervalType === 'manual' || isRestoring || isUploading}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-50"
              />
              {intervalType !== 'manual' && (
                <p className="text-xs text-gray-500 mt-1">
                  Backup a cada <strong>{intervalValue}</strong> {intervalType === 'hours' ? 'hora(s)' : 'dia(s)'}
                </p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Retenção — Máximo de Backups no S3
            </label>
            <div className="flex items-center gap-4">
              <input
                id="input-retention-count"
                type="number"
                min={1}
                max={365}
                value={retentionCount}
                onChange={e => setRetentionCount(e.target.value)}
                disabled={isRestoring || isUploading}
                className="w-32 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm font-bold focus:ring-2 focus:ring-violet-500 outline-none"
              />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                backups — os mais antigos serão excluídos automaticamente.
              </p>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              id="btn-save-backup-config"
              type="submit"
              disabled={isSaving || isRestoring || isUploading}
              className="flex items-center gap-2 px-6 py-3 bg-violet-600 hover:bg-violet-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow transition-all active:scale-95"
            >
              {isSaving ? (
                <>
                  <FiRefreshCw size={16} className="animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <FiSettings size={16} />
                  Salvar Configuração
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* ── Lista de Backups ── */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            {backups.length > 0 && backups.some(b => !b.is_pinned) && (
              <input
                type="checkbox"
                checked={backups.filter(b => !b.is_pinned).every(b => selectedBackupFilenames.includes(b.filename))}
                onChange={toggleSelectAllBackups}
                className="w-4 h-4 text-blue-600 rounded border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-750 cursor-pointer"
                title="Selecionar todos os backups (menos fixados)"
              />
            )}
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
              <FiDatabase size={20} className="text-emerald-500" />
              Backups no S3 ({backups.length})
            </h2>
            {selectedBackupFilenames.length > 0 && (
              <div className="flex items-center gap-2 ml-4 animate-in fade-in slide-in-from-left-4 duration-200">
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                  {selectedBackupFilenames.length} selecionado(s)
                </span>
                <button
                  onClick={() => setConfirmBulkDelete({ open: true })}
                  className="px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs font-bold rounded-lg hover:bg-red-200 transition-all"
                >
                  Excluir Selecionados
                </button>
              </div>
            )}
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Exibir:</span>
              <select
                id="select-items-per-page"
                value={itemsPerPage}
                onChange={e => setItemsPerPage(Number(e.target.value))}
                className="px-2 py-1 text-xs font-semibold rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-100 outline-none"
              >
                <option value={5} className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">5</option>
                <option value={10} className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">10</option>
                <option value={20} className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">20</option>
                <option value={50} className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">50</option>
              </select>
            </div>
            <button
              id="btn-refresh-backups"
              onClick={fetchBackups}
              disabled={isLoadingBackups || isRestoring || isUploading}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-all"
              title="Atualizar lista"
            >
              <FiRefreshCw size={16} className={isLoadingBackups ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {isLoadingBackups ? (
          <div className="p-8 text-center text-gray-400">
            <FiRefreshCw size={24} className="animate-spin mx-auto mb-2" />
            <p className="text-sm">Carregando backups...</p>
          </div>
        ) : backups.length === 0 ? (
          <div className="p-10 text-center text-gray-400">
            <FiDatabase size={36} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">Nenhum backup encontrado no S3.</p>
            <p className="text-xs mt-1">Faça o primeiro backup usando o botão acima.</p>
          </div>
        ) : (
          <>
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {paginatedBackups.map((backup, idx) => (
                <div
                  key={backup.filename}
                  className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-900/30 transition-colors group"
                >
                  <div className="flex items-center gap-4 min-w-0 flex-1">
                    <input
                      type="checkbox"
                      checked={selectedBackupFilenames.includes(backup.filename)}
                      onChange={() => toggleBackupSelection(backup.filename)}
                      disabled={backup.is_pinned}
                      className="w-4 h-4 text-blue-600 rounded border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                      title={backup.is_pinned ? "Backups fixados (pinados) não podem ser excluídos" : "Selecionar backup"}
                    />

                    <button
                      onClick={() => handleTogglePin(backup)}
                      className={`p-1.5 rounded-lg transition-all ${
                        backup.is_pinned
                          ? 'text-orange-500 bg-orange-500/10 hover:bg-orange-500/20'
                          : 'text-gray-400 opacity-0 group-hover:opacity-100 hover:text-orange-500 hover:bg-orange-500/5'
                      }`}
                      title={backup.is_pinned ? "Desafixar do topo" : "Fixar no topo (máx 3)"}
                    >
                      <PinIcon className="h-4 w-4" filled={backup.is_pinned} />
                    </button>

                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${idx === 0 && currentPage === 1 ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'}`} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate font-mono">
                          {backup.filename}
                        </p>
                        {backup.tag ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400">
                            <FiTag className="w-3 h-3" />
                            {backup.tag}
                          </span>
                        ) : null}
                        <button
                          onClick={() => setEditTagModal({ open: true, filename: backup.filename, tag: backup.tag || '' })}
                          className="text-gray-400 hover:text-violet-500 opacity-0 group-hover:opacity-100 transition-all p-1"
                          title="Editar etiqueta"
                        >
                          <FiEdit2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {formatDate(backup.created_at)} · {formatBytes(backup.size_bytes)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0">
                    <button
                      onClick={() => handleDownloadBackup(backup.filename)}
                      className="p-2 rounded-lg text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 disabled:opacity-50"
                      title="Baixar backup"
                      id={`btn-download-backup-${idx}`}
                      disabled={isRestoring || isUploading || isRunning}
                    >
                      <FiDownload size={16} />
                    </button>
                    <button
                      onClick={() => setConfirmRestore({ open: true, filename: backup.filename })}
                      className="p-2 rounded-lg text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 disabled:opacity-50"
                      title="Restaurar backup"
                      id={`btn-restore-backup-${idx}`}
                      disabled={isRestoring || isUploading || isRunning}
                    >
                      <FiRefreshCw size={16} />
                    </button>
                    <button
                      onClick={() => setConfirmDelete({ open: true, filename: backup.filename })}
                      className="p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-30 disabled:cursor-not-allowed"
                      title={backup.is_pinned ? "Backups fixados (pinados) não podem ser excluídos" : "Excluir backup"}
                      id={`btn-delete-backup-${idx}`}
                      disabled={isRestoring || isUploading || isRunning || backup.is_pinned}
                    >
                      <FiTrash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {backups.length > itemsPerPage && (
              <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900/10 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between flex-wrap gap-4">
                <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                  Mostrando {startIndex + 1} a {Math.min(startIndex + itemsPerPage, backups.length)} de {backups.length} backups
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 text-xs font-bold rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed dark:text-gray-200 transition-all"
                  >
                    Anterior
                  </button>
                  <span className="text-xs text-gray-700 dark:text-gray-300 font-bold">
                    Página {currentPage} de {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1.5 text-xs font-bold rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed dark:text-gray-200 transition-all"
                  >
                    Próxima
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Modais de Confirmação e Carregamento ── */}
      <BackupModals
        isManualBackupUpdating={isManualBackupUpdating}
        isLoadingInfo={isLoadingConfig || isLoadingBackups}
        confirmDelete={confirmDelete}
        setConfirmDelete={setConfirmDelete}
        handleDeleteBackup={handleDeleteBackup}
        confirmBulkDelete={confirmBulkDelete}
        setConfirmBulkDelete={setConfirmBulkDelete}
        isBulkDeleting={isBulkDeleting}
        handleBulkDeleteBackups={handleBulkDeleteBackups}
        selectedBackupCount={selectedBackupFilenames.length}
        confirmRestore={confirmRestore}
        setConfirmRestore={setConfirmRestore}
        isRestoring={isRestoring}
        handleRestoreBackup={handleRestoreBackup}
        editTagModal={editTagModal}
        setEditTagModal={setEditTagModal}
        handleSaveTag={handleSaveTag}
      />
    </div>
  );
}
