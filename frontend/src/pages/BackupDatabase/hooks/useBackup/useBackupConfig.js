import { useState, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { API_URL } from '../../../../config';
import { fetchWithAuth } from '../../../../AuthContext';

export function useBackupConfig(onBackupFinished) {
  const [config, setConfig] = useState(null);
  const [isLoadingConfig, setIsLoadingConfig] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isManualBackupUpdating, setIsManualBackupUpdating] = useState(false);

  // Formulário de configuração
  const [enabled, setEnabled] = useState(false);
  const [intervalType, setIntervalType] = useState('manual');
  const [intervalValue, setIntervalValue] = useState(24);
  const [retentionCount, setRetentionCount] = useState(30);
  const [s3Folder, setS3Folder] = useState('backups/');

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
      setS3Folder(data.s3_folder || 'backups/');
    } catch (e) {
      toast.error(e.message || 'Erro ao carregar configuração de backup.');
    } finally {
      setIsLoadingConfig(false);
    }
  }, []);

  const handleSaveConfig = async (e) => {
    if (e?.preventDefault) e.preventDefault();
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
          s3_folder: s3Folder,
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
            setS3Folder(configData.s3_folder || 'backups/');

            const isFinished =
              configData.last_backup_status === 'error' ||
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

              if (onBackupFinished) {
                onBackupFinished();
              }
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

  return {
    config,
    setConfig,
    isLoadingConfig,
    isRunning,
    isSaving,
    isManualBackupUpdating,
    enabled,
    setEnabled,
    intervalType,
    setIntervalType,
    intervalValue,
    setIntervalValue,
    retentionCount,
    setRetentionCount,
    s3Folder,
    setS3Folder,
    fetchConfig,
    handleSaveConfig,
    handleRunNow
  };
}

export default useBackupConfig;
