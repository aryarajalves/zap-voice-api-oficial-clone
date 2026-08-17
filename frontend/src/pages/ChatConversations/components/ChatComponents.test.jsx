import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ChatListItem from './ChatListItem';
import ActiveChatBanner from './ActiveChatBanner';
import BulkTagModal from '../Modals/BulkTagModal';
import CancelFunnelModal from '../Modals/CancelFunnelModal';

describe('Modularized Chat Components Unit Tests', () => {
    it('ChatListItem renderiza contato, última mensagem e dispara onSelect', () => {
        const convo = {
            id: 101,
            contact_name: 'Carlos Silva',
            phone: '5511999998888',
            last_message_content: 'Olá, gostaria de informações.',
            last_message_at: new Date().toISOString(),
            unread_count: 2,
            labels: ['VIP']
        };

        const onSelect = vi.fn();
        const onToggleCheck = vi.fn();
        const onDelete = vi.fn();
        const getLabelColor = vi.fn(() => '#3b82f6');
        const formatTime = vi.fn(() => '10:30');

        render(
            <ChatListItem
                convo={convo}
                isSelected={false}
                isChecked={false}
                onSelect={onSelect}
                onToggleCheck={onToggleCheck}
                onDelete={onDelete}
                getLabelColor={getLabelColor}
                formatTime={formatTime}
            />
        );

        expect(screen.getByText('Carlos')).toBeDefined();
        expect(screen.getByText('Olá, gostaria de informações.')).toBeDefined();
        expect(screen.getByText('2')).toBeDefined();
        expect(screen.getByText(/VIP/)).toBeDefined();

        fireEvent.click(screen.getByText('Carlos'));
        expect(onSelect).toHaveBeenCalledTimes(1);
    });

    it('ActiveChatBanner exibe nome e status do funil ativo e dispara handlers', () => {
        const activeFunnel = {
            name: 'Funil Boas-Vindas',
            status: 'processing'
        };

        const onOpenPipeline = vi.fn();
        const onOpenCancelModal = vi.fn();

        render(
            <ActiveChatBanner
                activeFunnel={activeFunnel}
                onOpenPipeline={onOpenPipeline}
                isLoadingPipeline={false}
                onOpenCancelModal={onOpenCancelModal}
            />
        );

        expect(screen.getByText(/Funil Boas-Vindas/)).toBeDefined();
        expect(screen.getByText('Processando')).toBeDefined();

        fireEvent.click(screen.getByText('Ver Pipeline'));
        expect(onOpenPipeline).toHaveBeenCalledTimes(1);

        fireEvent.click(screen.getByText('Cancelar Funil'));
        expect(onOpenCancelModal).toHaveBeenCalledTimes(1);
    });

    it('BulkTagModal renderiza opções de etiqueta e dispara onApply', () => {
        const onApply = vi.fn();
        const onClose = vi.fn();

        render(
            <BulkTagModal
                isOpen={true}
                onClose={onClose}
                availableLabels={['Interessado', 'Cliente']}
                selectedBulkTag="Interessado"
                setSelectedBulkTag={vi.fn()}
                customBulkTag=""
                setCustomBulkTag={vi.fn()}
                onApply={onApply}
                isApplying={false}
                selectedCount={5}
            />
        );

        expect(screen.getByText(/Aplicando em/)).toBeDefined();
        expect(screen.getByText('5')).toBeDefined();

        fireEvent.click(screen.getByText('Aplicar Etiqueta'));
        expect(onApply).toHaveBeenCalledTimes(1);
    });

    it('CancelFunnelModal renderiza confirmação e dispara onConfirm', () => {
        const onConfirm = vi.fn();
        const onClose = vi.fn();

        render(
            <CancelFunnelModal
                isOpen={true}
                onClose={onClose}
                funnelName="Funil de Reengajamento"
                contactName="Maria Souza"
                onConfirm={onConfirm}
                isCanceling={false}
            />
        );

        expect(screen.getByText('Cancelar execução do funil?')).toBeDefined();
        expect(screen.getByText('Funil de Reengajamento')).toBeDefined();

        fireEvent.click(screen.getByText('Sim, Cancelar Funil'));
        expect(onConfirm).toHaveBeenCalledTimes(1);
    });
});
