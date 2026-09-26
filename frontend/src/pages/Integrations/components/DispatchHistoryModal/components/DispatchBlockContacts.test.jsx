import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import DispatchTableRow from './DispatchTableRow';
import BulkActionsBar from './BulkActionsBar';
import BlockContactConfirmModal from './BlockContactConfirmModal';

describe('Dispatch History Block & Unblock Contact Feature', () => {
  describe('DispatchTableRow', () => {
    it('exibe botão "Bloquear" quando o disparo falhou e o contato NÃO está bloqueado', () => {
      const handleBlockModalMock = vi.fn();
      const failedItem = {
        id: 101,
        contact_name: 'Carlos Falha',
        contact_phone: '5511999991111',
        status: 'failed',
        total_failed: 1,
        failure_reason: 'Erro Meta 131026: Message undeliverable',
        is_contact_blocked: false,
        created_at: new Date().toISOString(),
        scheduled_time: new Date().toISOString()
      };

      render(
        <table>
          <tbody>
            <DispatchTableRow
              item={failedItem}
              selectedDispatchIds={[]}
              handleToggleSelectDispatch={() => {}}
              setSelectedDispatch={() => {}}
              setIsPipelineModalOpen={() => {}}
              handlePlayDispatch={() => {}}
              setConfirmDeleteDispatch={() => {}}
              onOpenBlockModal={handleBlockModalMock}
              isBlocking={{}}
            />
          </tbody>
        </table>
      );

      const blockBtn = screen.getByRole('button', { name: /Bloquear/i });
      expect(blockBtn).toBeInTheDocument();
      fireEvent.click(blockBtn);
      expect(handleBlockModalMock).toHaveBeenCalledWith(failedItem);
    });

    it('exibe botão "Desbloquear" e badge "Bloqueado" quando o contato já está na Blacklist', () => {
      const handleUnblockModalMock = vi.fn();
      const blockedItem = {
        id: 102,
        contact_name: 'Maria Bloqueada',
        contact_phone: '5511988882222',
        status: 'failed',
        total_failed: 1,
        failure_reason: 'Erro Meta 131026',
        is_contact_blocked: true,
        created_at: new Date().toISOString(),
        scheduled_time: new Date().toISOString()
      };

      render(
        <table>
          <tbody>
            <DispatchTableRow
              item={blockedItem}
              selectedDispatchIds={[]}
              handleToggleSelectDispatch={() => {}}
              setSelectedDispatch={() => {}}
              setIsPipelineModalOpen={() => {}}
              handlePlayDispatch={() => {}}
              setConfirmDeleteDispatch={() => {}}
              onOpenUnblockModal={handleUnblockModalMock}
              isBlocking={{}}
            />
          </tbody>
        </table>
      );

      // Deve exibir badge/indicador de Bloqueado
      const blockedBadges = screen.getAllByText(/Bloqueado/i);
      expect(blockedBadges.length).toBeGreaterThanOrEqual(1);

      // Deve exibir botão "Desbloquear"
      const unblockBtn = screen.getByRole('button', { name: /Desbloquear/i });
      expect(unblockBtn).toBeInTheDocument();
      fireEvent.click(unblockBtn);
      expect(handleUnblockModalMock).toHaveBeenCalledWith(blockedItem);

      // Botão Disparar deve estar desabilitado
      const playBtn = screen.getByRole('button', { name: /Disparar/i });
      expect(playBtn).toBeDisabled();
    });

    it('não exibe botão de Bloquear nem Desbloquear quando o disparo foi concluído com sucesso e sem erro', () => {
      const successItem = {
        id: 103,
        contact_name: 'João Sucesso',
        contact_phone: '5511977773333',
        status: 'completed',
        total_failed: 0,
        failure_reason: null,
        is_contact_blocked: false,
        created_at: new Date().toISOString(),
        scheduled_time: new Date().toISOString()
      };

      render(
        <table>
          <tbody>
            <DispatchTableRow
              item={successItem}
              selectedDispatchIds={[]}
              handleToggleSelectDispatch={() => {}}
              setSelectedDispatch={() => {}}
              setIsPipelineModalOpen={() => {}}
              handlePlayDispatch={() => {}}
              setConfirmDeleteDispatch={() => {}}
              isBlocking={{}}
            />
          </tbody>
        </table>
      );

      expect(screen.queryByRole('button', { name: /Bloquear/i })).toBeNull();
      expect(screen.queryByRole('button', { name: /Desbloquear/i })).toBeNull();
      expect(screen.queryByText(/Bloqueado/i)).toBeNull();
    });
  });

  describe('BulkActionsBar', () => {
    it('renderiza o botão "Bloquear (N)" e aciona modal de confirmação em massa ao clicar', () => {
      const handleBulkBlockModalMock = vi.fn();

      render(
        <BulkActionsBar
          selectedDispatchIds={[101, 102]}
          handleBulkDispatchPlay={() => {}}
          isBulkPlayingDispatches={false}
          setConfirmDeleteDispatch={() => {}}
          setSelectedDispatchIds={() => {}}
          onOpenBulkBlockModal={handleBulkBlockModalMock}
          isBulkBlocking={false}
        />
      );

      const bulkBlockBtn = screen.getByRole('button', { name: /Bloquear \(2\)/i });
      expect(bulkBlockBtn).toBeInTheDocument();
      fireEvent.click(bulkBlockBtn);
      expect(handleBulkBlockModalMock).toHaveBeenCalledWith(2);
    });
  });

  describe('BlockContactConfirmModal', () => {
    it('renderiza corretamente no modo "block" (individual) e dispara onConfirm ao clicar em Sim, Bloquear', () => {
      const handleConfirm = vi.fn();
      const handleClose = vi.fn();
      const sampleItem = {
        contact_name: 'Ana Souza',
        contact_phone: '5511987654321',
        failure_reason: 'Meta 131026: Message undeliverable'
      };

      render(
        <BlockContactConfirmModal
          isOpen={true}
          onClose={handleClose}
          onConfirm={handleConfirm}
          mode="block"
          item={sampleItem}
          isLoading={false}
        />
      );

      expect(screen.getByText('Bloquear Contato na Blacklist?')).toBeInTheDocument();
      expect(screen.getByText('Ana Souza')).toBeInTheDocument();
      expect(screen.getByText('5511987654321')).toBeInTheDocument();
      expect(screen.getByText(/Meta 131026/i)).toBeInTheDocument();

      const cancelBtn = screen.getByRole('button', { name: /Cancelar/i });
      fireEvent.click(cancelBtn);
      expect(handleClose).toHaveBeenCalledTimes(1);

      const confirmBtn = screen.getByRole('button', { name: /Sim, Bloquear/i });
      fireEvent.click(confirmBtn);
      expect(handleConfirm).toHaveBeenCalledTimes(1);
    });

    it('renderiza corretamente no modo "unblock" (desbloquear) e dispara onConfirm', () => {
      const handleConfirm = vi.fn();
      const sampleItem = {
        contact_name: 'Ana Souza',
        contact_phone: '5511987654321'
      };

      render(
        <BlockContactConfirmModal
          isOpen={true}
          onClose={() => {}}
          onConfirm={handleConfirm}
          mode="unblock"
          item={sampleItem}
          isLoading={false}
        />
      );

      expect(screen.getByText('Desbloquear Contato?')).toBeInTheDocument();
      expect(screen.getByText(/O contato será removido da Blacklist/i)).toBeInTheDocument();

      const unblockConfirmBtn = screen.getByRole('button', { name: /Desbloquear/i });
      fireEvent.click(unblockConfirmBtn);
      expect(handleConfirm).toHaveBeenCalledTimes(1);
    });

    it('renderiza corretamente no modo "bulk_block" (em massa) exibindo a contagem', () => {
      const handleConfirm = vi.fn();

      render(
        <BlockContactConfirmModal
          isOpen={true}
          onClose={() => {}}
          onConfirm={handleConfirm}
          mode="bulk_block"
          count={5}
          isLoading={false}
        />
      );

      expect(screen.getByText('Bloquear 5 Contatos?')).toBeInTheDocument();
      expect(screen.getByText(/Os 5 contatos selecionados serão adicionados à Blacklist/i)).toBeInTheDocument();

      const bulkConfirmBtn = screen.getByRole('button', { name: /Bloquear Todos/i });
      fireEvent.click(bulkConfirmBtn);
      expect(handleConfirm).toHaveBeenCalledTimes(1);
    });

    it('não renderiza nada quando isOpen é false', () => {
      const { container } = render(
        <BlockContactConfirmModal
          isOpen={false}
          onClose={() => {}}
          onConfirm={() => {}}
          mode="block"
        />
      );

      expect(container.firstChild).toBeNull();
    });
  });
});
