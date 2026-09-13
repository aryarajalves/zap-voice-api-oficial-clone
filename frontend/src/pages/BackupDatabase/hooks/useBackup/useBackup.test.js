import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import useBackup from '../useBackup';
import {
  useBackupConfig,
  useBackupList,
  useBackupBulkSelection
} from './index';
import { toast } from 'react-hot-toast';

vi.mock('react-hot-toast', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(),
    dismiss: vi.fn()
  }
}));

vi.mock('../../../../AuthContext', () => ({
  fetchWithAuth: vi.fn()
}));

const mockConfigData = {
  enabled: true,
  interval_type: 'hours',
  interval_value: 12,
  retention_count: 15,
  s3_folder: 'custom-backups/',
  last_backup_status: 'success',
  last_backup_at: '2026-09-13T12:00:00Z'
};

const mockBackupsList = [
  { filename: 'backup_1.dump.gz', is_pinned: false, tag: '' },
  { filename: 'backup_2.dump.gz', is_pinned: true, tag: 'Versão Estável' },
  { filename: 'backup_3.dump.gz', is_pinned: false, tag: '' }
];

describe('useBackup Hook Suite', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const { fetchWithAuth } = await import('../../../../AuthContext');
    fetchWithAuth.mockImplementation(async (url) => {
      if (url.includes('/backup/config')) {
        return { ok: true, json: async () => mockConfigData };
      }
      if (url.includes('/backup/list')) {
        return { ok: true, json: async () => ({ backups: mockBackupsList }) };
      }
      return { ok: true, json: async () => ({}) };
    });
  });

  describe('useBackupConfig', () => {
    it('carrega configurações via fetchConfig', async () => {
      const { result } = renderHook(() => useBackupConfig());

      await act(async () => {
        await result.current.fetchConfig();
      });

      expect(result.current.config).toEqual(mockConfigData);
      expect(result.current.enabled).toBe(true);
      expect(result.current.intervalType).toBe('hours');
      expect(result.current.intervalValue).toBe(12);
      expect(result.current.retentionCount).toBe(15);
      expect(result.current.s3Folder).toBe('custom-backups/');
      expect(result.current.isLoadingConfig).toBe(false);
    });

    it('salva configurações com sucesso via handleSaveConfig', async () => {
      const { result } = renderHook(() => useBackupConfig());

      await act(async () => {
        result.current.setEnabled(false);
        result.current.setIntervalType('daily');
        result.current.setIntervalValue(24);
      });

      await act(async () => {
        await result.current.handleSaveConfig({ preventDefault: vi.fn() });
      });

      expect(toast.success).toHaveBeenCalledWith('✅ Configuração salva com sucesso!');
    });
  });

  describe('useBackupList', () => {
    it('busca lista de backups via fetchBackups', async () => {
      const { result } = renderHook(() => useBackupList());

      await act(async () => {
        await result.current.fetchBackups();
      });

      expect(result.current.backups).toHaveLength(3);
      expect(result.current.isLoadingBackups).toBe(false);
    });

    it('impede fixar mais de 3 backups pinados', async () => {
      const { result } = renderHook(() => useBackupList());

      act(() => {
        result.current.setBackups([
          { filename: 'b1', is_pinned: true },
          { filename: 'b2', is_pinned: true },
          { filename: 'b3', is_pinned: true },
          { filename: 'b4', is_pinned: false }
        ]);
      });

      await act(async () => {
        await result.current.handleTogglePin({ filename: 'b4', is_pinned: false });
      });

      expect(toast.error).toHaveBeenCalledWith(
        'Limite máximo de 3 backups fixados (pinados) atingido. Remova um para poder fixar este.'
      );
    });
  });

  describe('useBackupBulkSelection', () => {
    it('adiciona e remove arquivos da seleção múltipla', () => {
      const { result } = renderHook(() =>
        useBackupBulkSelection(mockBackupsList, vi.fn())
      );

      act(() => {
        result.current.toggleBackupSelection('backup_1.dump.gz');
      });
      expect(result.current.selectedBackupFilenames).toContain('backup_1.dump.gz');

      act(() => {
        result.current.toggleBackupSelection('backup_1.dump.gz');
      });
      expect(result.current.selectedBackupFilenames).not.toContain('backup_1.dump.gz');
    });

    it('não permite selecionar backup que já esteja fixado (pinado)', () => {
      const { result } = renderHook(() =>
        useBackupBulkSelection(mockBackupsList, vi.fn())
      );

      act(() => {
        result.current.toggleBackupSelection('backup_2.dump.gz'); // is_pinned: true
      });
      expect(result.current.selectedBackupFilenames).toEqual([]);
    });

    it('seleciona e desseleciona todos os backups não pinados', () => {
      const { result } = renderHook(() =>
        useBackupBulkSelection(mockBackupsList, vi.fn())
      );

      act(() => {
        result.current.toggleSelectAllBackups();
      });
      expect(result.current.selectedBackupFilenames).toEqual(['backup_1.dump.gz', 'backup_3.dump.gz']);

      act(() => {
        result.current.toggleSelectAllBackups();
      });
      expect(result.current.selectedBackupFilenames).toEqual([]);
    });
  });

  describe('useBackup (Orquestrador)', () => {
    it('retorna todas as propriedades agregadas para a página BackupDatabase', async () => {
      let result;
      await act(async () => {
        const rendered = renderHook(() => useBackup());
        result = rendered.result;
      });

      expect(result.current).toHaveProperty('config');
      expect(result.current).toHaveProperty('backups');
      expect(result.current).toHaveProperty('fetchConfig');
      expect(result.current).toHaveProperty('fetchBackups');
      expect(result.current).toHaveProperty('handleRunNow');
      expect(result.current).toHaveProperty('handleSaveConfig');
      expect(result.current).toHaveProperty('handleDeleteBackup');
      expect(result.current).toHaveProperty('handleTogglePin');
      expect(result.current).toHaveProperty('selectedBackupFilenames');
      expect(result.current).toHaveProperty('toggleBackupSelection');
      expect(result.current).toHaveProperty('toggleSelectAllBackups');
      expect(result.current).toHaveProperty('handleBulkDeleteBackups');
    });
  });
});
