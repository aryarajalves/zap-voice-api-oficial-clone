/**
 * Testes unitários — Página BackupDatabase
 *
 * Cobre:
 * - Renderização básica dos elementos
 * - Botão de backup manual: estado de loading
 * - Formulário de configuração: toggle, campos, submissão
 * - Tabela de backups: estado vazio e com dados
 * - Modal de confirmação de deleção
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import BackupDatabase from './BackupDatabase';

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('../AuthContext', () => ({
  useAuth: () => ({ token: 'mock-token-super-admin' }),
  fetchWithAuth: (url, options) => global.fetch(url, options),
}));

vi.mock('../config', () => ({
  API_URL: 'http://localhost:8000/api',
  resolveUrl: (p) => `http://localhost:8000${p}`,
}));

vi.mock('react-hot-toast', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const mockConfig = {
  enabled: false,
  interval_type: 'manual',
  interval_value: 24,
  retention_count: 30,
  last_backup_at: null,
  next_backup_at: null,
  last_backup_filename: null,
  last_backup_status: null,
  last_backup_error: null,
  updated_at: null,
};

const mockBackups = [
  {
    filename: 'backup_20260530_120000.dump.gz',
    s3_key: 'backups/backup_20260530_120000.dump.gz',
    size_bytes: 512000,
    created_at: '2026-05-30T12:00:00+00:00',
  },
  {
    filename: 'backup_20260529_120000.dump.gz',
    s3_key: 'backups/backup_20260529_120000.dump.gz',
    size_bytes: 480000,
    created_at: '2026-05-29T12:00:00+00:00',
  },
];

function mockFetch(configOverride = {}, backupsOverride = null) {
  const config = { ...mockConfig, ...configOverride };
  const backups = backupsOverride !== null ? backupsOverride : mockBackups;

  global.fetch = vi.fn((url) => {
    if (url.includes('/api/backup/config') && !url.includes('PUT')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(config),
      });
    }
    if (url.includes('/api/backup/list')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ backups, total: backups.length }),
      });
    }
    if (url.includes('/api/backup/manual')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          message: 'Backup iniciado em background.',
          started_by: 'admin@test.com',
          started_at: new Date().toISOString(),
        }),
      });
    }
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({}),
    });
  });
}

// ── Testes ───────────────────────────────────────────────────────────────────

describe('BackupDatabase', () => {
  beforeEach(() => {
    mockFetch();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ─── Renderização ──────────────────────────────────────────────────────────

  it('deve renderizar o título e os cards de status', async () => {
    await act(async () => {
      render(<BackupDatabase />);
    });

    await waitFor(() => {
      expect(screen.getByText('Último Backup')).toBeInTheDocument();
      expect(screen.getByText('Próximo Backup')).toBeInTheDocument();
      expect(screen.getByText('Retenção')).toBeInTheDocument();
    });
  });

  it('deve renderizar o botão "Fazer Backup Agora"', async () => {
    await act(async () => {
      render(<BackupDatabase />);
    });

    await waitFor(() => {
      expect(screen.getByText('Fazer Backup Agora')).toBeInTheDocument();
    });

    const btn = screen.getById
      ? screen.queryByText('Fazer Backup Agora')
      : screen.getByText('Fazer Backup Agora');
    expect(btn).toBeInTheDocument();
  });

  it('deve mostrar a seção de Agendamento Automático', async () => {
    await act(async () => {
      render(<BackupDatabase />);
    });

    await waitFor(() => {
      expect(screen.getByText('Agendamento Automático')).toBeInTheDocument();
    });
  });

  it('deve mostrar "Nenhum backup encontrado" quando a lista está vazia', async () => {
    mockFetch({}, []);

    await act(async () => {
      render(<BackupDatabase />);
    });

    await waitFor(() => {
      expect(screen.getByText('Nenhum backup encontrado no S3.')).toBeInTheDocument();
    });
  });

  it('deve listar os backups quando o S3 retorna arquivos', async () => {
    await act(async () => {
      render(<BackupDatabase />);
    });

    await waitFor(() => {
      expect(screen.getByText('backup_20260530_120000.dump.gz')).toBeInTheDocument();
      expect(screen.getByText('backup_20260529_120000.dump.gz')).toBeInTheDocument();
    });
  });

  // ─── Backup Manual ─────────────────────────────────────────────────────────

  it('deve mudar o estado do botão para "Executando..." ao clicar', async () => {
    // Simula uma resposta lenta para capturar o estado de loading
    global.fetch = vi.fn((url) => {
      if (url.includes('/api/backup/config')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockConfig) });
      }
      if (url.includes('/api/backup/list')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ backups: [], total: 0 }) });
      }
      if (url.includes('/api/backup/manual')) {
        return new Promise(() => {}); // nunca resolve (simula loading)
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    await act(async () => {
      render(<BackupDatabase />);
    });

    await waitFor(() => {
      expect(screen.getByText('Fazer Backup Agora')).toBeInTheDocument();
    });

    const btn = screen.getByText('Fazer Backup Agora');
    fireEvent.click(btn);

    await waitFor(() => {
      expect(screen.getByText('Executando...')).toBeInTheDocument();
    });
  });

  it('deve mostrar o popup central "Atualizando Banco" ao iniciar o backup manual', async () => {
    global.fetch = vi.fn((url) => {
      if (url.includes('/api/backup/config')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockConfig) });
      }
      if (url.includes('/api/backup/list')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ backups: [], total: 0 }) });
      }
      if (url.includes('/api/backup/manual')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ message: 'Backup iniciado' })
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    await act(async () => {
      render(<BackupDatabase />);
    });

    await waitFor(() => {
      expect(screen.getByText('Fazer Backup Agora')).toBeInTheDocument();
    });

    const btn = screen.getByText('Fazer Backup Agora');
    fireEvent.click(btn);

    await waitFor(() => {
      expect(screen.getByText('Atualizando Banco')).toBeInTheDocument();
      expect(screen.getByText(/Estamos criando um novo backup de segurança/)).toBeInTheDocument();
    });
  });

  // ─── Formulário de Configuração ────────────────────────────────────────────

  it('deve mostrar o valor padrão de retenção (30)', async () => {
    await act(async () => {
      render(<BackupDatabase />);
    });

    await waitFor(() => {
      const input = document.getElementById('input-retention-count');
      expect(input).toBeTruthy();
      expect(input.value).toBe('30');
    });
  });

  it('deve habilitar/desabilitar agendamento via toggle', async () => {
    await act(async () => {
      render(<BackupDatabase />);
    });

    await waitFor(() => {
      expect(screen.getAllByText('Agendamento Desativado')[0]).toBeInTheDocument();
    });

    const toggle = document.getElementById('toggle-backup-enabled');
    fireEvent.click(toggle);

    await waitFor(() => {
      expect(screen.getByText('Agendamento Ativado')).toBeInTheDocument();
    });
  });

  it('deve desabilitar o campo de valor quando tipo é "manual"', async () => {
    await act(async () => {
      render(<BackupDatabase />);
    });

    // Habilita o agendamento primeiro
    const toggle = document.getElementById('toggle-backup-enabled');
    fireEvent.click(toggle);

    await waitFor(() => {
      const input = document.getElementById('input-interval-value');
      expect(input.disabled).toBe(true); // manual ainda → desabilitado
    });
  });

  // ─── Configuração de Agendamento ───────────────────────────────────────────

  it('deve submeter a configuração ao clicar em Salvar', async () => {
    // Mock do PUT
    global.fetch = vi.fn((url, options) => {
      if (url.includes('/api/backup/config') && options?.method === 'PUT') {
        const body = JSON.parse(options.body);
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ ...mockConfig, ...body }) });
      }
      if (url.includes('/api/backup/config')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockConfig) });
      }
      if (url.includes('/api/backup/list')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ backups: [], total: 0 }) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    await act(async () => {
      render(<BackupDatabase />);
    });

    await waitFor(() => {
      expect(screen.getByText('Salvar Configuração')).toBeInTheDocument();
    });

    const saveBtn = screen.getByText('Salvar Configuração');
    fireEvent.click(saveBtn);

    await waitFor(() => {
      // Deve ter chamado PUT /api/backup/config
      const calls = global.fetch.mock.calls;
      const putCall = calls.find(([url, opts]) =>
        url.includes('/api/backup/config') && opts?.method === 'PUT'
      );
      expect(putCall).toBeDefined();
    });
  });

  // ─── Modal de Confirmação ──────────────────────────────────────────────────

  it('deve abrir o modal de confirmação ao clicar em deletar backup', async () => {
    await act(async () => {
      render(<BackupDatabase />);
    });

    await waitFor(() => {
      expect(screen.getByText('backup_20260530_120000.dump.gz')).toBeInTheDocument();
    });

    // Hover para mostrar o botão de delete
    const deleteBtn = document.getElementById('btn-delete-backup-0');
    expect(deleteBtn).toBeTruthy();
    fireEvent.click(deleteBtn);

    await waitFor(() => {
      expect(screen.getByText('Excluir Backup')).toBeInTheDocument();
    });
  });

  // ─── Atualização de Status ─────────────────────────────────────────────────

  it('deve mostrar status de erro do último backup quando aplicável', async () => {
    mockFetch({
      last_backup_status: 'error',
      last_backup_error: 'Conexão recusada pelo S3.',
      last_backup_filename: 'backup_20260530_000000.dump.gz',
      last_backup_at: '2026-05-30T00:00:00+00:00',
    });

    await act(async () => {
      render(<BackupDatabase />);
    });

    await waitFor(() => {
      expect(screen.getByText(/Conexão recusada pelo S3/)).toBeInTheDocument();
    });
  });

  it('deve mostrar próximo backup quando agendamento ativado', async () => {
    mockFetch({
      enabled: true,
      interval_type: 'hours',
      interval_value: 12,
      next_backup_at: '2026-05-30T23:00:00+00:00',
    });

    await act(async () => {
      render(<BackupDatabase />);
    });

    await waitFor(() => {
      expect(screen.getByText('A cada 12 hora(s)')).toBeInTheDocument();
    });
  });

  // ─── Importação e Restauração ──────────────────────────────────────────────

  it('deve renderizar a seção de Importar Backup Externo', async () => {
    await act(async () => {
      render(<BackupDatabase />);
    });

    await waitFor(() => {
      expect(screen.getByText('Importar Backup Externo')).toBeInTheDocument();
      expect(screen.getByText('Fazer Upload de Backup')).toBeInTheDocument();
    });
  });

  it('deve abrir o modal de confirmação ao clicar em restaurar backup', async () => {
    await act(async () => {
      render(<BackupDatabase />);
    });

    await waitFor(() => {
      expect(screen.getByText('backup_20260530_120000.dump.gz')).toBeInTheDocument();
    });

    const restoreBtn = document.getElementById('btn-restore-backup-0');
    expect(restoreBtn).toBeTruthy();
    fireEvent.click(restoreBtn);

    await waitFor(() => {
      expect(screen.getByText('Restaurar Banco de Dados')).toBeInTheDocument();
      expect(screen.getByText(/sobrescrever e apagar todos os dados atuais/)).toBeInTheDocument();
    });
  });

  it('deve chamar o download do backup ao clicar no botão de download', async () => {
    global.fetch = vi.fn((url) => {
      if (url.includes('/api/backup/config')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockConfig) });
      }
      if (url.includes('/api/backup/list')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ backups: mockBackups, total: mockBackups.length }) });
      }
      if (url.includes('/api/backup/download')) {
        return Promise.resolve({
          ok: true,
          blob: () => Promise.resolve(new Blob(['dummy content'], { type: 'application/gzip' })),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    const mockCreateObjectURL = vi.fn(() => 'blob:http://localhost:5173/dummy-uuid');
    const mockRevokeObjectURL = vi.fn();
    window.URL.createObjectURL = mockCreateObjectURL;
    window.URL.revokeObjectURL = mockRevokeObjectURL;

    await act(async () => {
      render(<BackupDatabase />);
    });

    await waitFor(() => {
      expect(screen.getByText('backup_20260530_120000.dump.gz')).toBeInTheDocument();
    });

    const downloadBtn = document.getElementById('btn-download-backup-0');
    expect(downloadBtn).toBeTruthy();
    fireEvent.click(downloadBtn);

    await waitFor(() => {
      const downloadCall = global.fetch.mock.calls.find(([url]) =>
        url.includes('/api/backup/download/backup_20260530_120000.dump.gz')
      );
      expect(downloadCall).toBeDefined();
    });
  });

  it('deve alternar a seleção de backups e disparar exclusão em lote', async () => {
    global.fetch = vi.fn((url, options) => {
      if (url.includes('/api/backup/config')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockConfig) });
      }
      if (url.includes('/api/backup/list')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ backups: mockBackups, total: mockBackups.length }) });
      }
      if (url.includes('/api/backup/bulk-delete') && options?.method === 'POST') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ message: 'Processamento concluído', deleted: ['backup_20260530_120000.dump.gz'] }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    await act(async () => {
      render(<BackupDatabase />);
    });

    await waitFor(() => {
      expect(screen.getByText('backup_20260530_120000.dump.gz')).toBeInTheDocument();
    });

    // Localizar o checkbox do primeiro backup (não pinado)
    const checkboxes = screen.getAllByRole('checkbox');
    // header checkbox + item checkboxes
    expect(checkboxes.length).toBeGreaterThan(1);
    
    // Clicar no checkbox de selecionar todos (header checkbox)
    fireEvent.click(checkboxes[0]);

    await waitFor(() => {
      expect(screen.getByText('Excluir Selecionados')).toBeInTheDocument();
    });

    // Clicar no botão de excluir selecionados
    fireEvent.click(screen.getByText('Excluir Selecionados'));

    await waitFor(() => {
      expect(screen.getByText('Excluir Vários Backups')).toBeInTheDocument();
    });
  });
});


