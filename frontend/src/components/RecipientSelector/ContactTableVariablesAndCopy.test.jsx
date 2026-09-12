import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ContactTable from './components/ContactList/ContactTable';
import { isVariableEmpty, isVariableNumeric } from './components/ContactList/VariableActionModal';

// Mock do fetchWithAuth e API_URL
vi.mock('../../AuthContext', () => ({
  fetchWithAuth: vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({})
  })
}));

vi.mock('../../contexts/ClientContext', () => ({
  useClient: () => ({
    activeClient: { id: 1, name: 'Cliente Teste' }
  })
}));

describe('ContactTable - Cópia de Telefone e Gerenciamento de Variáveis', () => {
  const mockContacts = [
    {
      phone: '5511999999991',
      vars: { '1': 'Carlos Silva' },
      status: 'verified',
      window_open: true
    },
    {
      phone: '5511999999992',
      vars: { '1': '5511988887777' }, // Apenas números
      status: 'verified',
      window_open: false
    },
    {
      phone: '5511999999993',
      vars: { '1': '' }, // Vazio
      status: 'pending',
      window_open: false
    },
    {
      phone: '5511999999994',
      vars: {}, // Vazio / undefined
      status: 'pending',
      window_open: false
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Funções Utilitárias: isVariableNumeric e isVariableEmpty', () => {
    it('deve identificar strings vazias ou nulas corretamente', () => {
      expect(isVariableEmpty('')).toBe(true);
      expect(isVariableEmpty('   ')).toBe(true);
      expect(isVariableEmpty(null)).toBe(true);
      expect(isVariableEmpty(undefined)).toBe(true);
      expect(isVariableEmpty('Maria')).toBe(false);
      expect(isVariableEmpty('12345')).toBe(false);
    });

    it('deve identificar variáveis que contêm apenas números/telefones', () => {
      expect(isVariableNumeric('5511999999992')).toBe(true);
      expect(isVariableNumeric('+55 (11) 98888-7777')).toBe(true);
      expect(isVariableNumeric('12345')).toBe(true);
      expect(isVariableNumeric('Carlos')).toBe(false);
      expect(isVariableNumeric('Carlos 123')).toBe(false);
      expect(isVariableNumeric('')).toBe(false);
      expect(isVariableNumeric(null)).toBe(false);
    });
  });

  describe('Cópia de Número ao Clicar', () => {
    it('deve chamar navigator.clipboard.writeText com o número ao clicar na célula', () => {
      const writeTextMock = vi.fn().mockResolvedValue();
      Object.assign(navigator, {
        clipboard: {
          writeText: writeTextMock
        }
      });

      render(
        <ContactTable
          displayedContacts={mockContacts}
          filteredContacts={mockContacts}
          filteredContactsCount={4}
          activeVarColumns={[{ key: '1', label: 'Nome' }]}
        />
      );

      const phoneButton = screen.getByRole('button', { name: /5511999999991/i });
      expect(phoneButton).toBeInTheDocument();

      fireEvent.click(phoneButton);

      expect(writeTextMock).toHaveBeenCalledWith('5511999999991');
    });
  });

  describe('Modal de Ações e Filtro de Variáveis', () => {
    it('deve abrir o modal de ações da variável ao clicar no botão Ações do cabeçalho', () => {
      render(
        <ContactTable
          displayedContacts={mockContacts}
          filteredContacts={mockContacts}
          filteredContactsCount={4}
          activeVarColumns={[{ key: '1', label: 'Nome' }]}
        />
      );

      const actionsBtn = screen.getByRole('button', { name: /Ações/i });
      expect(actionsBtn).toBeInTheDocument();

      fireEvent.click(actionsBtn);

      expect(screen.getByText(/Gerenciar Variável Nome/i)).toBeInTheDocument();
      expect(screen.getByText(/1\. Filtrar Visualização na Tabela/i)).toBeInTheDocument();
      expect(screen.getByText(/2\. Preencher Nome em Lote/i)).toBeInTheDocument();

      expect(screen.getByText(/Com Nome/i)).toBeInTheDocument();
      expect(screen.getAllByText(/Só Números/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Vazios/i).length).toBeGreaterThan(0);
    });

    it('deve filtrar a tabela para exibir apenas contatos com números na variável', () => {
      render(
        <ContactTable
          displayedContacts={mockContacts}
          filteredContacts={mockContacts}
          filteredContactsCount={4}
          activeVarColumns={[{ key: '1', label: 'Nome' }]}
        />
      );

      // Abre o modal
      fireEvent.click(screen.getByRole('button', { name: /Ações/i }));

      // Clica no botão "Só Números" do modal
      const filterNumericBtn = screen.getByRole('button', { name: /Só Números \(1\)/i });
      fireEvent.click(filterNumericBtn);

      // Agora a tabela deve filtrar e mostrar apenas o contato com número (5511999999992)
      expect(screen.getByText('5511999999992')).toBeInTheDocument();
      expect(screen.queryByText('5511999999991')).not.toBeInTheDocument();
      expect(screen.queryByText('5511999999993')).not.toBeInTheDocument();

      // Deve exibir a badge 'Só Núm. ×' no cabeçalho
      expect(screen.getByText(/Só Núm\./i)).toBeInTheDocument();
    });

    it('deve permitir aplicar nome padrão (ex: "Amigo") em lote para contatos com números ou vazios', () => {
      const setContactsMock = vi.fn();

      render(
        <ContactTable
          displayedContacts={mockContacts}
          filteredContacts={mockContacts}
          filteredContactsCount={4}
          activeVarColumns={[{ key: '1', label: 'Nome' }]}
          setContacts={setContactsMock}
        />
      );

      // Abre o modal
      fireEvent.click(screen.getByRole('button', { name: /Ações/i }));

      // Clica no botão de substituir quem tem apenas números por "Amigo"
      const applyNumericBtn = screen.getByRole('button', { name: /Substituir 1 que têm Apenas Números por "Amigo"/i });
      fireEvent.click(applyNumericBtn);

      // Deve ter chamado setContacts
      expect(setContactsMock).toHaveBeenCalled();

      // Executa a função do updater passada para setContactsMock
      const updater = setContactsMock.mock.calls[0][0];
      const updatedList = updater(mockContacts);

      // O contato 5511999999992 deve agora ter 'Amigo'
      const contactWithNum = updatedList.find(c => c.phone === '5511999999992');
      expect(contactWithNum.vars['1']).toBe('Amigo');

      // O contato com nome original Carlos Silva NÃO deve ser alterado
      const contactWithName = updatedList.find(c => c.phone === '5511999999991');
      expect(contactWithName.vars['1']).toBe('Carlos Silva');
    });

    it('deve permitir limpar em lote valores numéricos', () => {
      const setContactsMock = vi.fn();

      render(
        <ContactTable
          displayedContacts={mockContacts}
          filteredContacts={mockContacts}
          filteredContactsCount={4}
          activeVarColumns={[{ key: '1', label: 'Nome' }]}
          setContacts={setContactsMock}
        />
      );

      // Abre o modal
      fireEvent.click(screen.getByRole('button', { name: /Ações/i }));

      // Clica em Limpar 1 com apenas números
      const clearNumericBtn = screen.getByRole('button', { name: /Limpar 1 com apenas números/i });
      fireEvent.click(clearNumericBtn);

      expect(setContactsMock).toHaveBeenCalled();
      const updater = setContactsMock.mock.calls[0][0];
      const updatedList = updater(mockContacts);

      const contactWithNum = updatedList.find(c => c.phone === '5511999999992');
      expect(contactWithNum.vars['1']).toBeUndefined();
    });
  });
});
