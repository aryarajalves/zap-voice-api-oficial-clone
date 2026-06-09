import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { API_URL } from '../../../config';
import { fetchWithAuth } from '../../../AuthContext';

export function useBackup() {
  const [config, setConfig] = useState(null);
  const [backups, setBackups] = useState([]);
  const [isLoadingConfig, setIsLoadingConfig] = useState(true);
  const [isLoadingBackups, setIsLoadingBackups] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isManualBackupUpdating, setIsManualBackupUpdating] = useState(false);

  // Formulário de configuração
  const [enabled, setEnabled] = useState(false);
  const [intervalType, setIntervalType] = useState('manual');
  const [intervalValue, setIntervalValue] = useState(24);
  const [retentionCount, setRetentionCount] = useState(30);

  // Modais de confirmação
  const [confirmDelete, setConfirmDelete] = useState({ open: false, filename: null });
  const [confirmRestore, setConfirmRestore] = useState({ open: false, filename: null });
  const [editTagModal, setEditTagModal] = useState({ open: false, filename: null, tag: '' });

  // Seleção múltipla para exclusão
  const [selectedBackupFilenames, setSelectedBackupFilenames] = useState([]);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState({ open: false });
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);


  const handleTogglePin = async (backup) => {
    // Validar limite de 3 pinados localmente
    if (!backup.is_pinned) {
      const pinnedCount = backups.filter(b => b.is_pinned).length;
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
    e.preventDefault();
    try {
      const backup = backups.find(b => b.filename === editTagModal.filename);
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

  const fetchConfig = useCallback(async () => {
    try {
      setIsLoadingConfig(true);
      const res = await fetchWithAuth(`${API_URL}/backup/config`);
      if (!res.ok) throw new Error('Falha ao carregar configuração.');
      const data = await res.json();
      setConfig(data);
      setEnabled(data.enabled);
      setIntervalType(data.interval_type || 'manual');
      setIntervalValue(data.interval_value || 24);
      setRetentionCount(data.retention_count || 30);
    } catch (e) {
      toast.error(e.message || 'Erro ao carregar configuração de backup.');
    } finally {
      setIsLoadingConfig(false);
    }
  }, []);

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

  useEffect(() => {
    fetchConfig();
    fetchBackups();
  }, [fetchConfig, fetchBackups]);

  const handleRunNow = async () => {
    const previousBackupAt = config?.last_backup_at;
    setIsRunning(true);
    setIsManualBackupUpdating(true);
    try {
      const res = await fetchWithAuth(`${API_URL}/backup/manual`, {
        method: 'POST',
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Falha ao iniciar backup.');
      }
      
      let attempts = 0;
      const maxAttempts = 40; // max ~60 segundos
      
      const poll = setInterval(async () => {
        attempts++;
        try {
          const configRes = await fetchWithAuth(`${API_URL}/backup/config`);
          if (configRes.ok) {
            const configData = await configRes.json();
            setConfig(configData);
            setEnabled(configData.enabled);
            setIntervalType(configData.interval_type || 'manual');
            setIntervalValue(configData.interval_value || 24);
            setRetentionCount(configData.retention_count || 30);
            
            const isFinished = configData.last_backup_status === 'error' || 
                               (configData.last_backup_status === 'success' && configData.last_backup_at !== previousBackupAt) ||
                               (configData.last_backup_status !== 'running' && attempts > 1) ||
                               attempts >= maxAttempts;
            
            if (isFinished) {
              clearInterval(poll);
              setIsManualBackupUpdating(false);
              setIsRunning(false);
              
              if (configData.last_backup_status === 'success') {
                toast.success('✅ Backup e informações atualizados com sucesso!');
              } else if (configData.last_backup_status === 'error') {
                toast.error(configData.last_backup_error || 'Erro ao processar backup.');
              }
              
              fetchBackups();
            }
          }
        } catch (e) {
          console.error('Erro no polling do backup:', e);
        }
      }, 1500);

    } catch (e) {
      toast.error(e.message || 'Erro ao iniciar backup.');
      setIsManualBackupUpdating(false);
      setIsRunning(false);
    }
  };

  const handleSaveConfig = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await fetchWithAuth(`${API_URL}/backup/config`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          enabled,
          interval_type: intervalType,
          interval_value: Number(intervalValue),
          retention_count: Number(retentionCount),
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Falha ao salvar configuração.');
      }
      const saved = await res.json();
      setConfig(saved);
      toast.success('✅ Configuração salva com sucesso!');
    } catch (e) {
      toast.error(e.message || 'Erro ao salvar configuração.');
    } finally {
      setIsSaving(false);
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
      setBackups(prev => prev.filter(b => b.filename !== filename));
      setSelectedBackupFilenames(prev => prev.filter(f => f !== filename));
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
      toast.success(`✅ Banco restaurado com sucesso a partir de "${filename}"! Recarregando sistema...`, { duration: 4000 });
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
    const file = e.target.files[0];
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
      e.target.value = '';
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

  const toggleBackupSelection = (filename) => {
    setSelectedBackupFilenames(prev => {
      if (prev.includes(filename)) {
        return prev.filter(f => f !== filename);
      } else {
        const b = backups.find(bk => bk.filename === filename);
        if (b && b.is_pinned) return prev;
        return [...prev, filename];
      }
    });
  };

  const toggleSelectAllBackups = () => {
    const unpinnedBackups = backups.filter(b => !b.is_pinned).map(b => b.filename);
    setSelectedBackupFilenames(prev => {
      const allSelected = unpinnedBackups.every(f => prev.includes(f));
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
      fetchBackups();
    } catch (e) {
      toast.error(e.message || 'Erro ao deletar backups em lote.');
    } finally {
      setIsBulkDeleting(false);
      setConfirmBulkDelete({ open: false });
    }
  };

  return {
    config, backups, isLoadingConfig, isLoadingBackups, isRunning, isSaving, isRestoring, isUploading, isManualBackupUpdating,
    enabled, setEnabled, intervalType, setIntervalType, intervalValue, setIntervalValue, retentionCount, setRetentionCount,
    confirmDelete, setConfirmDelete, confirmRestore, setConfirmRestore, editTagModal, setEditTagModal,
    selectedBackupFilenames, setSelectedBackupFilenames, confirmBulkDelete, setConfirmBulkDelete, isBulkDeleting,
    handleTogglePin, handleSaveTag, fetchConfig, fetchBackups, handleRunNow, handleSaveConfig,
    handleDeleteBackup, handleRestoreBackup, handleUploadBackup, handleDownloadBackup,
    toggleBackupSelection, toggleSelectAllBackups, handleBulkDeleteBackups
  };
}

