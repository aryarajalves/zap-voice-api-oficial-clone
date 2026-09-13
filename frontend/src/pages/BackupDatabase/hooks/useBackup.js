import { useEffect } from 'react';
import {
  useBackupConfig,
  useBackupList,
  useBackupBulkSelection
} from './useBackup/index.js';

export function useBackup() {
  const list = useBackupList((filename) => {
    bulk.removeDeletedFilename(filename);
  });

  const config = useBackupConfig(() => {
    list.fetchBackups();
  });

  const bulk = useBackupBulkSelection(list.backups, () => {
    list.fetchBackups();
  });

  useEffect(() => {
    config.fetchConfig();
    list.fetchBackups();
  }, [config.fetchConfig, list.fetchBackups]);

  return {
    // Config & status
    config: config.config,
    isLoadingConfig: config.isLoadingConfig,
    isRunning: config.isRunning,
    isSaving: config.isSaving,
    isManualBackupUpdating: config.isManualBackupUpdating,
    enabled: config.enabled,
    setEnabled: config.setEnabled,
    intervalType: config.intervalType,
    setIntervalType: config.setIntervalType,
    intervalValue: config.intervalValue,
    setIntervalValue: config.setIntervalValue,
    retentionCount: config.retentionCount,
    setRetentionCount: config.setRetentionCount,
    s3Folder: config.s3Folder,
    setS3Folder: config.setS3Folder,
    fetchConfig: config.fetchConfig,
    handleSaveConfig: config.handleSaveConfig,
    handleRunNow: config.handleRunNow,

    // List & files
    backups: list.backups,
    isLoadingBackups: list.isLoadingBackups,
    isRestoring: list.isRestoring,
    isUploading: list.isUploading,
    confirmDelete: list.confirmDelete,
    setConfirmDelete: list.setConfirmDelete,
    confirmRestore: list.confirmRestore,
    setConfirmRestore: list.setConfirmRestore,
    editTagModal: list.editTagModal,
    setEditTagModal: list.setEditTagModal,
    fetchBackups: list.fetchBackups,
    handleTogglePin: list.handleTogglePin,
    handleSaveTag: list.handleSaveTag,
    handleDeleteBackup: list.handleDeleteBackup,
    handleRestoreBackup: list.handleRestoreBackup,
    handleUploadBackup: list.handleUploadBackup,
    handleDownloadBackup: list.handleDownloadBackup,

    // Bulk selection
    selectedBackupFilenames: bulk.selectedBackupFilenames,
    setSelectedBackupFilenames: bulk.setSelectedBackupFilenames,
    confirmBulkDelete: bulk.confirmBulkDelete,
    setConfirmBulkDelete: bulk.setConfirmBulkDelete,
    isBulkDeleting: bulk.isBulkDeleting,
    toggleBackupSelection: bulk.toggleBackupSelection,
    toggleSelectAllBackups: bulk.toggleSelectAllBackups,
    handleBulkDeleteBackups: bulk.handleBulkDeleteBackups
  };
}

export default useBackup;
