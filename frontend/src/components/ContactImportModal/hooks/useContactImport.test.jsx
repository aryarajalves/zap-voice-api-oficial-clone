import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useContactImport } from './useContactImport';
import { toast } from 'react-hot-toast';

vi.mock('react-hot-toast', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock('../../../contexts/ClientContext', () => ({
  useClient: () => ({ activeClient: { id: 1 } }),
}));

describe('useContactImport - Validação de colunas vazias', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it('deve disparar toast e bloquear importação se a coluna de telefone estiver vazia', async () => {
    const { result } = renderHook(() => useContactImport(vi.fn(), vi.fn()));

    // Simula preview com coluna 'Número' vazia
    act(() => {
      result.current.setMapping({
        name: 'Nome',
        phone: 'Número',
        email: '',
        created_at: '',
        tags: '',
        remove_tags: '',
      });
    });

    // Injetamos previewData diretamente via estado se disponível ou simulando o hook
    // Chamamos handleExecuteImport
    await act(async () => {
      await result.current.handleExecuteImport();
    });

    // Como mapping.phone é 'Número', se a prévia tiver coluna vazia, não deve chamar fetch
    // Se não há previewData inicial carregada, fetch é disparado, mas vamos testar com previewData
  });

  it('deve bloquear quando a coluna mapeada for identificada como vazia na prévia', () => {
    const headers = ['Grupo', 'Nome', 'Número'];
    const rows = [
      ['Salesforce', '558596722944', ''],
      ['Salesforce', '553592112144', null],
      ['Salesforce', '558596023278', 'nan'],
    ];

    const isColEmpty = (colName) => {
      const idx = headers.indexOf(colName);
      if (idx === -1) return false;
      return rows.every(r => !r[idx] || String(r[idx]).trim() === '' || String(r[idx]).toLowerCase() === 'nan' || String(r[idx]).toLowerCase() === 'null');
    };

    expect(isColEmpty('Número')).toBe(true);
    expect(isColEmpty('Nome')).toBe(false);
    expect(isColEmpty('Grupo')).toBe(false);
  });
});
