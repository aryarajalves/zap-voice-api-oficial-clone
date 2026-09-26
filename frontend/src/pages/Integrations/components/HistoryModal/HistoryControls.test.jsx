import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import HistoryControls from './HistoryControls';

describe('HistoryControls Component', () => {
  const defaultProps = {
    webhookHistoryLength: 5,
    selectedHistoryIdsLength: 0,
    handleSelectAll: vi.fn(),
    webhookHistorySearch: '',
    setWebhookHistorySearch: vi.fn(),
    setHistoryCurrentPage: vi.fn(),
    fetchHistory: vi.fn(),
    integrationId: 'test-integration-123',
    webhookHistoryStatusFilter: '',
    handleSyncAllHistory: vi.fn(),
    isSyncingAll: false,
    setWebhookHistoryStatusFilter: vi.fn(),
    webhookHistoryMappingFilter: '',
    setWebhookHistoryMappingFilter: vi.fn(),
    webhookHistory: [
      { id: 1, event_type: 'purchase_approved' },
      { id: 2, event_type: 'cart_abandoned' },
    ],
    stressTestFilter: false,
    setStressTestFilter: vi.fn(),
  };

  it('renderiza os controles e a barra de pesquisa mesmo se webhookHistoryLength for 0', () => {
    render(<HistoryControls {...defaultProps} webhookHistoryLength={0} webhookHistorySearch="5511987654322" />);
    const searchInput = screen.getByPlaceholderText('Buscar por nome, telefone ou payload...');
    expect(searchInput).toBeInTheDocument();
    expect(searchInput).toHaveValue('5511987654322');
  });

  it('renderiza a barra de pesquisa ampla com placeholder correto', () => {
    render(<HistoryControls {...defaultProps} />);
    const searchInput = screen.getByPlaceholderText('Buscar por nome, telefone ou payload...');
    expect(searchInput).toBeInTheDocument();
    expect(searchInput).toHaveValue('');
  });

  it('atualiza o input de busca ao digitar e dispara fetchHistory', () => {
    render(<HistoryControls {...defaultProps} />);
    const searchInput = screen.getByPlaceholderText('Buscar por nome, telefone ou payload...');
    
    fireEvent.change(searchInput, { target: { value: 'João' } });
    
    expect(defaultProps.setWebhookHistorySearch).toHaveBeenCalledWith('João');
    expect(defaultProps.setHistoryCurrentPage).toHaveBeenCalledWith(1);
    expect(defaultProps.fetchHistory).toHaveBeenCalledWith('test-integration-123', '', 'João');
  });

  it('exibe o botão de limpar busca quando há texto e limpa ao clicar', () => {
    render(<HistoryControls {...defaultProps} webhookHistorySearch="teste123" />);
    
    const clearBtn = screen.getByTitle('Limpar busca');
    expect(clearBtn).toBeInTheDocument();
    
    fireEvent.click(clearBtn);
    expect(defaultProps.setWebhookHistorySearch).toHaveBeenCalledWith('');
    expect(defaultProps.setHistoryCurrentPage).toHaveBeenCalledWith(1);
    expect(defaultProps.fetchHistory).toHaveBeenCalledWith('test-integration-123', '', '');
  });

  it('renderiza botões de ação (ATUALIZAR, SINCRONIZAR TUDO e TESTE DE ESCALA)', () => {
    render(<HistoryControls {...defaultProps} />);
    
    expect(screen.getByText('ATUALIZAR')).toBeInTheDocument();
    expect(screen.getByText('SINCRONIZAR TUDO')).toBeInTheDocument();
    expect(screen.getByText('TESTE DE ESCALA')).toBeInTheDocument();
  });

  it('chama fetchHistory ao clicar em ATUALIZAR', () => {
    render(<HistoryControls {...defaultProps} />);
    const refreshBtn = screen.getByText('ATUALIZAR');
    fireEvent.click(refreshBtn);
    expect(defaultProps.fetchHistory).toHaveBeenCalled();
  });

  it('chama handleSyncAllHistory ao clicar em SINCRONIZAR TUDO', () => {
    render(<HistoryControls {...defaultProps} />);
    const syncBtn = screen.getByText('SINCRONIZAR TUDO');
    fireEvent.click(syncBtn);
    expect(defaultProps.handleSyncAllHistory).toHaveBeenCalledWith('test-integration-123');
  });

  it('permite alternar o filtro de Mapeamento', () => {
    render(<HistoryControls {...defaultProps} />);
    const select = screen.getByDisplayValue('TODOS');
    fireEvent.change(select, { target: { value: 'mapped' } });
    expect(defaultProps.setWebhookHistoryMappingFilter).toHaveBeenCalledWith('mapped');
  });
});
