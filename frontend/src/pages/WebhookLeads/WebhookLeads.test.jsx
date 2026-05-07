import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
import React from 'react';
import WebhookLeads from './index';
import { ClientContext } from '../../contexts/ClientContext';

// Mock do hook customizado
vi.mock('./hooks/useWebhookLeads', () => ({
  useWebhookLeads: () => ({
    leads: [],
    total: 0,
    loading: false,
    page: 0,
    limit: 20,
    search: '',
    setSearch: vi.fn(),
    selectedTag: '',
    setSelectedTag: vi.fn(),
    availableFilters: { tags: [] },
    selectedLeads: [],
    setIsDeleteModalOpen: vi.fn(),
    setLeadToDelete: vi.fn(),
    setIsCleanConfirmOpen: vi.fn(),
    setIsCreateModalOpen: vi.fn(),
    setIsImportModalOpen: vi.fn(),
    handleExport: vi.fn(),
    fetchLeads: vi.fn(),
    fetchFilters: vi.fn(),
    handleSelectAll: vi.fn(),
    handleSelectLead: vi.fn(),
    setIsEditModalOpen: vi.fn(),
    setLeadToEdit: vi.fn()
  })
}));

// Mock do ClientContext
vi.mock('../../contexts/ClientContext', () => ({
  useClient: () => ({
    activeClient: { id: 1, name: 'Client Test' }
  })
}));

describe('WebhookLeads Component', () => {
  it('renderiza o título e os componentes principais', () => {
    render(<WebhookLeads />);

    expect(screen.getByText('Contatos')).toBeDefined();
    expect(screen.getByPlaceholderText('Buscar por nome ou telefone...')).toBeDefined();
    expect(screen.getByText('Anterior')).toBeDefined();
    expect(screen.getByText('Próxima')).toBeDefined();
  });
});
