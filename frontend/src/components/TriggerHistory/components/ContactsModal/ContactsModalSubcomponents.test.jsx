import React from 'react';
import { render, screen, fireEvent, renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { toast } from 'react-hot-toast';
import { useCopyContacts, copyTextToClipboard } from './hooks/useCopyContacts';
import ContactsModalTabs from './components/ContactsModalTabs';
import ContactsModalFooter from './components/ContactsModalFooter';
import ContactsModalList from './components/ContactsModalList';

vi.mock('react-hot-toast', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(),
    dismiss: vi.fn()
  }
}));

describe('ContactsModal Subcomponentes e Hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useCopyContacts & copyTextToClipboard', () => {
    it('deve copiar usando navigator.clipboard se disponível', async () => {
      const originalClipboard = navigator.clipboard;
      const mockWriteText = vi.fn().mockResolvedValue(undefined);
      Object.assign(navigator, {
        clipboard: { writeText: mockWriteText }
      });

      const res = await copyTextToClipboard('5511999999999');
      expect(res).toBe(true);
      expect(mockWriteText).toHaveBeenCalledWith('5511999999999');

      Object.assign(navigator, { clipboard: originalClipboard });
    });

    it('deve emitir toast.error quando não houver telefones para copiar', async () => {
      const { result } = renderHook(() =>
        useCopyContacts({
          selectedPhones: [],
          safeModalContacts: [],
          totalCount: 0,
          getAllTargetContacts: vi.fn().mockResolvedValue([])
        })
      );

      await act(async () => {
        await result.current.handleCopyContacts();
      });

      expect(toast.error).toHaveBeenCalledWith('Nenhum contato disponível para copiar.');
    });

    it('deve copiar selecionados com sucesso', async () => {
      const mockWriteText = vi.fn().mockResolvedValue(undefined);
      Object.assign(navigator, {
        clipboard: { writeText: mockWriteText }
      });

      const { result } = renderHook(() =>
        useCopyContacts({
          selectedPhones: ['5511999999999', '5511888888888'],
          safeModalContacts: [],
          totalCount: 2
        })
      );

      await act(async () => {
        await result.current.handleCopyContacts();
      });

      expect(mockWriteText).toHaveBeenCalledWith('5511999999999\n5511888888888');
      expect(toast.success).toHaveBeenCalledWith('2 contatos copiados para a área de transferência!');
    });
  });

  describe('ContactsModalTabs', () => {
    it('renderiza as abas e dispara setContactsFilter ao clicar', () => {
      const setContactsFilter = vi.fn();
      const setPage = vi.fn();
      const contactsModal = {
        showTabs: true,
        isTemplate: true,
        counts: { total: 5, sent: 3, failed: 2 }
      };

      render(
        <ContactsModalTabs
          contactsModal={contactsModal}
          contactsFilter="total"
          setContactsFilter={setContactsFilter}
          setPage={setPage}
        />
      );

      expect(screen.getByText('Total')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByText('Enviados')).toBeInTheDocument();

      const failedTab = screen.getByText('Falharam');
      fireEvent.click(failedTab);

      expect(setContactsFilter).toHaveBeenCalledWith('failed');
      expect(setPage).toHaveBeenCalledWith(1);
    });

    it('retorna null quando showTabs ou isTemplate for falso', () => {
      const { container } = render(
        <ContactsModalTabs
          contactsModal={{ showTabs: false, isTemplate: true }}
          contactsFilter="all"
          setContactsFilter={vi.fn()}
          setPage={vi.fn()}
        />
      );

      expect(container.firstChild).toBeNull();
    });
  });

  describe('ContactsModalFooter', () => {
    it('renderiza botões e aciona callbacks corretamente', () => {
      const handleCopyContacts = vi.fn();
      const onClose = vi.fn();

      render(
        <ContactsModalFooter
          handleCopyContacts={handleCopyContacts}
          selectedPhonesCount={3}
          totalCount={10}
          onClose={onClose}
        />
      );

      const copyBtn = screen.getByText('Copiar Selecionados (3)');
      fireEvent.click(copyBtn);
      expect(handleCopyContacts).toHaveBeenCalled();

      const closeBtn = screen.getByText('Fechar');
      fireEvent.click(closeBtn);
      expect(onClose).toHaveBeenCalled();
    });

    it('exibe Copiar Lista quando nenhum contato está selecionado', () => {
      render(
        <ContactsModalFooter
          handleCopyContacts={vi.fn()}
          selectedPhonesCount={0}
          totalCount={8}
          onClose={vi.fn()}
        />
      );

      expect(screen.getByText('Copiar Lista (8)')).toBeInTheDocument();
    });
  });

  describe('ContactsModalList', () => {
    it('renderiza empty state quando lista for vazia', () => {
      render(
        <ContactsModalList
          contactsModal={{ contacts: [] }}
          displayContacts={[]}
          selectedPhones={[]}
          totalCount={0}
          isSelected={() => false}
        />
      );

      expect(screen.getByText('Nenhum contato encontrado neste filtro.')).toBeInTheDocument();
    });
  });
});
