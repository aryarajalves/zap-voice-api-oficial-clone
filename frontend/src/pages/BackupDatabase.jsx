import React, { useState } from 'react';
import {
  FiDatabase, FiCalendar, FiUploadCloud, FiShield
} from 'react-icons/fi';
import { useBackup } from './BackupDatabase/hooks/useBackup';
import { BackupModals } from './BackupDatabase/components/BackupModals';
import { BackupListTab } from './BackupDatabase/components/tabs/BackupListTab';
import { BackupScheduleTab } from './BackupDatabase/components/tabs/BackupScheduleTab';
import { BackupImportTab } from './BackupDatabase/components/tabs/BackupImportTab';

export default function BackupDatabase() {
  const [activeTab, setActiveTab] = useState('list');

  const {
    config, backups, isLoadingConfig, isLoadingBackups, isRunning, isSaving, isRestoring, isUploading, isManualBackupUpdating,
    enabled, setEnabled, intervalType, setIntervalType, intervalValue, setIntervalValue, retentionCount, setRetentionCount,
    s3Folder, setS3Folder,
    confirmDelete, setConfirmDelete, confirmRestore, setConfirmRestore, editTagModal, setEditTagModal,
    handleTogglePin, handleSaveTag, fetchBackups, handleRunNow, handleSaveConfig,
    handleDeleteBackup, handleRestoreBackup, handleUploadBackup, handleDownloadBackup,
    selectedBackupFilenames, setSelectedBackupFilenames, confirmBulkDelete, setConfirmBulkDelete, isBulkDeleting,
    toggleBackupSelection, toggleSelectAllBackups, handleBulkDeleteBackups
  } = useBackup();

  const tabs = [
    {
      id: 'list',
      label: 'Backups no S3',
      icon: FiDatabase,
      badge: backups.length,
      badgeColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-400'
    },
    {
      id: 'schedule',
      label: 'Agendamento Automático',
      icon: FiCalendar,
      badge: enabled ? 'Ativo' : 'Desativado',
      badgeColor: enabled
        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-400'
        : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
    },
    {
      id: 'import',
      label: 'Importar Backup Externo',
      icon: FiUploadCloud
    }
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-16">
      {/* ── Header Principal ── */}
      <div className="bg-white dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-500 border border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.15)]">
            <FiShield size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
              Backup do Banco PostgreSQL
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 font-medium">
              Gerencie snapshots do banco, agendamentos automáticos e restauração de dados no Backblaze S3.
            </p>
          </div>
        </div>

        {/* Status rápido do serviço */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Postgres Online
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400 border border-blue-200 dark:border-blue-800/40">
            Backblaze S3
          </span>
        </div>
      </div>

      {/* ── Navegação por Abas ── */}
      <div className="flex items-center gap-2 border-b border-gray-200 dark:border-gray-700/80 pb-3 overflow-x-auto no-scrollbar">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap select-none ${
                isActive
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20 active:scale-95'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/60 border border-gray-200 dark:border-gray-700'
              }`}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                    isActive ? 'bg-white/20 text-white' : tab.badgeColor
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Conteúdo da Aba Ativa ── */}
      {activeTab === 'list' && (
        <BackupListTab
          config={config}
          backups={backups}
          isLoadingConfig={isLoadingConfig}
          isLoadingBackups={isLoadingBackups}
          isRunning={isRunning}
          isRestoring={isRestoring}
          isUploading={isUploading}
          handleRunNow={handleRunNow}
          fetchBackups={fetchBackups}
          handleTogglePin={handleTogglePin}
          setEditTagModal={setEditTagModal}
          handleDownloadBackup={handleDownloadBackup}
          setConfirmRestore={setConfirmRestore}
          setConfirmDelete={setConfirmDelete}
          selectedBackupFilenames={selectedBackupFilenames}
          toggleBackupSelection={toggleBackupSelection}
          toggleSelectAllBackups={toggleSelectAllBackups}
          setConfirmBulkDelete={setConfirmBulkDelete}
        />
      )}

      {activeTab === 'schedule' && (
        <BackupScheduleTab
          enabled={enabled}
          setEnabled={setEnabled}
          intervalType={intervalType}
          setIntervalType={setIntervalType}
          intervalValue={intervalValue}
          setIntervalValue={setIntervalValue}
          s3Folder={s3Folder}
          setS3Folder={setS3Folder}
          retentionCount={retentionCount}
          setRetentionCount={setRetentionCount}
          handleSaveConfig={handleSaveConfig}
          isSaving={isSaving}
          isRestoring={isRestoring}
          isUploading={isUploading}
        />
      )}

      {activeTab === 'import' && (
        <BackupImportTab
          handleUploadBackup={handleUploadBackup}
          isUploading={isUploading}
          isRestoring={isRestoring}
          isRunning={isRunning}
        />
      )}

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
