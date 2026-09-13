import { useState, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { API_URL } from '../../../../config';
import { fetchWithAuth } from '../../../../AuthContext';

export function useBackupList(onBackupDeleted) {
  const [backups, setBackups] = useState([]);
  const [isLoadingBackups, setIsLoadingBackups] = useState(true);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Modais de confirmação
  const [confirmDelete, setConfirmDelete] = useState({ open: false, filename: null });
  const [confirmRestore, setConfirmRestore] = useState({ open: false, filename: null });
  const [editTagModal, setEditTagModal] = useState({ open: false, filename: null, tag: '' });

  const fetchBackups = useCallback(async () => {
    try {
      setIsLoadingBackups(true);
      const res = await fetchWithAuth(`${API_URL}/backup/list`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Falha ao listar backups.');
      }
      const data = await res.json();
      setBackups(data.backups || []);
    } catch (e) {
      toast.error(e.message || 'Erro ao listar backups no S3.');
    } finally {
      setIsLoadingBackups(false);
    }
  }, []);

  const handleTogglePin = async (backup) => {
    // Validar limite de 3 pinados localmente
    if (!backup.is_pinned) {
      const pinnedCount = backups.filter((b) => b.is_pinned).length;
      if (pinnedCount >= 3) {
        toast.error('Limite máximo de 3 backups fixados (pinados) atingido. Remova um para poder fixar este.');
        return;
      }
    }

    try {
      const res = await fetchWithAuth(`${API_URL}/backup/metadata/${encodeURIComponent(backup.filename)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          is_pinned: !backup.is_pinned,
          tag: backup.tag
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Erro ao alterar fixação do backup.');
      }
      toast.success(backup.is_pinned ? '📌 Backup desafixado!' : '📌 Backup fixado no topo!');
      fetchBackups();
    } catch (e) {
      toast.error(e.message || 'Erro ao alterar fixação.');
    }
  };

  const handleSaveTag = async (e) => {
    if (e?.preventDefault) e.preventDefault();
    try {
      const backup = backups.find((b) => b.filename === editTagModal.filename);
      const res = await fetchWithAuth(`${API_URL}/backup/metadata/${encodeURIComponent(editTagModal.filename)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          is_pinned: backup ? backup.is_pinned : false,
          tag: editTagModal.tag
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Erro ao salvar etiqueta.');
      }
      toast.success('🏷️ Etiqueta salva com sucesso!');
      setEditTagModal({ open: false, filename: null, tag: '' });
      fetchBackups();
    } catch (e) {
      toast.error(e.message || 'Erro ao salvar etiqueta.');
    }
  };

  const handleDeleteBackup = async (filename) => {
    try {
      const res = await fetchWithAuth(`${API_URL}/backup/file/${encodeURIComponent(filename)}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Falha ao deletar backup.');
      }
      toast.success(`🗑️ Backup "${filename}" removido com sucesso.`);
      setBackups((prev) => prev.filter((b) => b.filename !== filename));
      if (onBackupDeleted) {
        onBackupDeleted(filename);
      }
    } catch (e) {
      toast.error(e.message || 'Erro ao deletar backup.');
    } finally {
      setConfirmDelete({ open: false, filename: null });
    }
  };

  const handleRestoreBackup = async (filename) => {
    setIsRestoring(true);
    try {
      const res = await fetchWithAuth(`${API_URL}/backup/restore/${encodeURIComponent(filename)}`, {
        method: 'POST',
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Falha ao restaurar banco.');
      }
      toast.success(`✅ Banco restaurado com sucesso a partir de "${filename}"! Recarregando sistema...`, {
        duration: 4000
      });
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (e) {
      toast.error(e.message || 'Erro ao restaurar banco de dados.');
    } finally {
      setIsRestoring(false);
      setConfirmRestore({ open: false, filename: null });
    }
  };

  const handleUploadBackup = async (e) => {
    const file = e.target?.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.dump') && !file.name.endsWith('.dump.gz')) {
      toast.error('Formato inválido. Selecione um arquivo .dump ou .dump.gz.');
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetchWithAuth(`${API_URL}/backup/upload`, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Falha ao enviar backup.');
      }
      toast.success('✅ Backup externo enviado com sucesso! Atualizando lista...');
      fetchBackups();
    } catch (e) {
      toast.error(e.message || 'Erro ao enviar backup.');
    } finally {
      setIsUploading(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleDownloadBackup = async (filename) => {
    try {
      const res = await fetchWithAuth(`${API_URL}/backup/download/${encodeURIComponent(filename)}`, {
        method: 'GET',
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Falha ao baixar backup.');
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      toast.success(`📥 Download do backup "${filename}" concluído.`);
    } catch (e) {
      toast.error(e.message || 'Erro ao realizar download do backup.');
    }
  };

  return {
    backups,
    setBackups,
    isLoadingBackups,
    isRestoring,
    isUploading,
    confirmDelete,
    setConfirmDelete,
    confirmRestore,
    setConfirmRestore,
    editTagModal,
    setEditTagModal,
    fetchBackups,
    handleTogglePin,
    handleSaveTag,
    handleDeleteBackup,
    handleRestoreBackup,
    handleUploadBackup,
    handleDownloadBackup
  };
}

export default useBackupList;
