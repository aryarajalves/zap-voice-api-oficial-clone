import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import IntegrationsModals from './components/IntegrationsModals';

describe('Dispatch Delete Actions in IntegrationsModals', () => {
  const defaultProps = {
    isModalOpen: false,
    setIsModalOpen: vi.fn(),
    isImportModalOpen: false,
    setIsImportModalOpen: vi.fn(),
    isHistoryModalOpen: false,
    setIsHistoryModalOpen: vi.fn(),
    isDispatchHistoryModalOpen: false,
    setIsDispatchHistoryModalOpen: vi.fn(),
    isPipelineModalOpen: false,
    setIsPipelineModalOpen: vi.fn(),
    activeClient: { id: 1 },
    editingIntegration: null,
    historyIntegration: null,
    dispatchIntegration: { id: 'test-integration-uuid-123', name: 'Hotmart VIP' },
    selectedDispatch: null,
    setSelectedDispatch: vi.fn(),
    formData: {},
    setFormData: vi.fn(),
    chatwootAccounts: [],
    inboxes: [],
    funnels: [],
    loadingFunnels: false,
    loadingWebhooks: false,
    toast: { success: vi.fn(), error: vi.fn() },
    handleCreateOrUpdateIntegration: vi.fn(),
    handleCloseModal: vi.fn(),
    handleDeleteDispatch: vi.fn().mockResolvedValue({}),
    confirmDeleteIntegration: { isOpen: false, id: null },
    setConfirmDeleteIntegration: vi.fn(),
    confirmDeleteHistory: { isOpen: false, id: null },
    setConfirmDeleteHistory: vi.fn(),
    confirmResendHistory: { isOpen: false, ids: [] },
    setConfirmResendHistory: vi.fn(),
    confirmDeleteDispatch: { isOpen: true, type: 'single', id: 42, ids: [] },
    setConfirmDeleteDispatch: vi.fn(),
    childrenModal: { isOpen: false },
    contactsModal: { isOpen: false },
    editJsonModal: { isOpen: false },
    isTestModalOpen: false,
    maximizedJson: null,
  };

  it('exibe modal com título e mensagem corretos para exclusão única e executa handleDeleteDispatch com single', () => {
    const mockDelete = vi.fn().mockResolvedValue({});
    render(
      <IntegrationsModals
        {...defaultProps}
        handleDeleteDispatch={mockDelete}
        confirmDeleteDispatch={{ isOpen: true, type: 'single', id: 42, ids: [] }}
      />
    );

    expect(screen.getByText('Excluir Disparo')).toBeInTheDocument();
    expect(screen.getByText('Deseja realmente excluir este disparo?')).toBeInTheDocument();

    const confirmButton = screen.getByRole('button', { name: /confirmar/i });
    fireEvent.click(confirmButton);

    expect(mockDelete).toHaveBeenCalledWith('test-integration-uuid-123', 'single', 42, []);
  });

  it('exibe modal com título e mensagem corretos para exclusão em lote e executa handleDeleteDispatch com bulk', () => {
    const mockDelete = vi.fn().mockResolvedValue({});
    render(
      <IntegrationsModals
        {...defaultProps}
        handleDeleteDispatch={mockDelete}
        confirmDeleteDispatch={{ isOpen: true, type: 'bulk', id: null, ids: [101, 102] }}
      />
    );

    expect(screen.getByText('Excluir Disparos')).toBeInTheDocument();
    expect(screen.getByText('Deseja realmente excluir os disparos selecionados?')).toBeInTheDocument();

    const confirmButton = screen.getByRole('button', { name: /confirmar/i });
    fireEvent.click(confirmButton);

    expect(mockDelete).toHaveBeenCalledWith('test-integration-uuid-123', 'bulk', null, [101, 102]);
  });
});
