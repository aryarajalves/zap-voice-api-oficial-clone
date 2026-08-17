import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import LogViewer from './index';
import { parseLine, getLineSignature, formatDateBR } from './utils/logHelpers';
import LoadingOverlay from './components/LoadingOverlay';
import LineDetailModal from './components/LineDetailModal';

// Mock AuthContext
vi.mock('../../AuthContext', () => ({
  fetchWithAuth: vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ dates: [] }) }))
}));

describe('LogViewer and Submodules Unit Tests', () => {
  it('parseLine identifica horário, nível e texto bruto corretamente', () => {
    const raw = '2026-08-16 14:30:15 [ERROR] [bulk] Falha ao enviar mensagem para 5511999999999';
    const parsed = parseLine(raw, 0);

    expect(parsed.idx).toBe(0);
    expect(parsed.time).toBe('14:30:15');
    expect(parsed.level).toBe('ERROR');
    expect(parsed.raw).toBe(raw);
    expect(parsed.rawLower).toContain('falha ao enviar');
  });

  it('getLineSignature normaliza timestamp e números para identificação única', () => {
    const raw1 = '2026-08-16 14:30:15 [ERROR] Lead 12345 timeout na requisição 500';
    const raw2 = '2026-08-16 14:31:20 [ERROR] Lead 98765 timeout na requisição 500';

    const sig1 = getLineSignature(raw1);
    const sig2 = getLineSignature(raw2);

    expect(sig1).toBe(sig2);
    expect(sig1).toContain('[ERROR] Lead # timeout na requisição #');
  });

  it('formatDateBR converte YYYY-MM-DD para DD/MM/YYYY', () => {
    expect(formatDateBR('2026-08-16')).toBe('16/08/2026');
    expect(formatDateBR('')).toBe('');
  });

  it('LoadingOverlay renderiza estado de busca e processamento de progresso', () => {
    const { rerender } = render(<LoadingOverlay stage="fetching" />);
    expect(screen.getByText('Buscando logs do servidor')).toBeDefined();

    rerender(
      <LoadingOverlay
        stage="parsing"
        progress={75}
        total={1000}
        current={750}
      />
    );
    expect(screen.getByText('Processando logs')).toBeDefined();
    expect(screen.getByText('75%')).toBeDefined();
  });

  it('LineDetailModal exibe o conteúdo completo e dispara ações', () => {
    const line = {
      idx: 4,
      raw: '2026-08-16 15:00:00 [CRITICAL] Falha geral no worker',
      level: 'CRITICAL',
      time: '15:00:00'
    };
    const onClose = vi.fn();
    const onCopy = vi.fn();
    const onDelete = vi.fn();

    render(
      <LineDetailModal
        line={line}
        onClose={onClose}
        onCopy={onCopy}
        onDelete={onDelete}
      />
    );

    expect(screen.getByText('Linha 5')).toBeDefined();
    expect(screen.getByText('CRITICAL')).toBeDefined();
    expect(screen.getByText(/Falha geral no worker/)).toBeDefined();

    fireEvent.click(screen.getByText('Copiar'));
    expect(onCopy).toHaveBeenCalledWith(line.raw);

    fireEvent.click(screen.getByText('Apagar este log'));
    expect(onDelete).toHaveBeenCalledWith(line);
  });

  it('LogViewer renderiza controles iniciais', () => {
    render(<LogViewer />);

    expect(screen.getByText('Selecionar dia')).toBeDefined();
    expect(screen.getByText('Carregar Logs')).toBeDefined();
    expect(screen.getByText('Colar manualmente')).toBeDefined();
    expect(screen.getByText('Apagar log no servidor')).toBeDefined();
  });
});
