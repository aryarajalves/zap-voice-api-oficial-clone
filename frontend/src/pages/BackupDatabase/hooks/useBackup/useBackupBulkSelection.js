import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { API_URL } from '../../../../config';
import { fetchWithAuth } from '../../../../AuthContext';

export function useBackupBulkSelection(backups, onBackupsDeleted) {
  const [selectedBackupFilenames, setSelectedBackupFilenames] = useState([]);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState({ open: false });
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  const toggleBackupSelection = (filename) => {
    setSelectedBackupFilenames((prev) => {
      if (prev.includes(filename)) {
        return prev.filter((f) => f !== filename);
      } else {
        const b = backups.find((bk) => bk.filename === filename);
        if (b && b.is_pinned) return prev;
        return [...prev, filename];
      }
    });
  };

  const toggleSelectAllBackups = () => {
    const unpinnedBackups = backups.filter((b) => !b.is_pinned).map((b) => b.filename);
    setSelectedBackupFilenames((prev) => {
      const allSelected = unpinnedBackups.length > 0 && unpinnedBackups.every((f) => prev.includes(f));
      if (allSelected) {
        return [];
      } else {
        return unpinnedBackups;
      }
    });
  };

  const handleBulkDeleteBackups = async () => {
    if (selectedBackupFilenames.length === 0) return;
    setIsBulkDeleting(true);
    try {
      const res = await fetchWithAuth(`${API_URL}/backup/bulk-delete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ filenames: selectedBackupFilenames }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Erro ao deletar backups em lote.');
      }
      const data = await res.json();
      toast.success(`🗑️ ${data.deleted?.length || 0} backup(s) excluído(s) com sucesso.`);
      setSelectedBackupFilenames([]);
      if (onBackupsDeleted) {
        onBackupsDeleted();
      }
    } catch (e) {
      toast.error(e.message || 'Erro ao deletar backups em lote.');
    } finally {
      setIsBulkDeleting(false);
      setConfirmBulkDelete({ open: false });
    }
  };

  const removeDeletedFilename = (filename) => {
    setSelectedBackupFilenames((prev) => prev.filter((f) => f !== filename));
  };

  return {
    selectedBackupFilenames,
    setSelectedBackupFilenames,
    confirmBulkDelete,
    setConfirmBulkDelete,
    isBulkDeleting,
    toggleBackupSelection,
    toggleSelectAllBackups,
    handleBulkDeleteBackups,
    removeDeletedFilename
  };
}

export default useBackupBulkSelection;
