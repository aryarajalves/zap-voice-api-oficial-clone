import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import TriggerBulkMetrics from './components/TriggerBulkMetrics';

describe('TriggerBulkMetrics - Botão Restam', () => {
    it('renderiza o botão "Restam 11" e dispara handleViewContacts com "remaining" ao clicar', () => {
        const handleViewContacts = vi.fn();
        const trigger = {
            id: 101,
            is_bulk: true,
            total_contacts: 20,
            total_sent: 9,
            total_failed: 0,
            total_delivered: 5,
            total_read: 2,
            total_interactions: 1,
            total_blocked: 0,
            total_skipped: 0
        };

        render(
            <TriggerBulkMetrics
                trigger={trigger}
                triggerWithActions={trigger}
                handleViewContacts={handleViewContacts}
            />
        );

        // Deve encontrar o botão com "Restam 11"
        const remainingBtn = screen.getByRole('button', { name: /restam 11/i });
        expect(remainingBtn).toBeInTheDocument();
        expect(remainingBtn).toHaveAttribute('title', 'Ver Contatos Restantes');

        // Clicar no botão
        fireEvent.click(remainingBtn);

        // Deve ter chamado handleViewContacts com o trigger e o filtro 'remaining'
        expect(handleViewContacts).toHaveBeenCalledTimes(1);
        expect(handleViewContacts).toHaveBeenCalledWith(trigger, 'remaining');
    });

    it('renderiza o botão "Restam 0" quando todos contatos foram processados e permite clique', () => {
        const handleViewContacts = vi.fn();
        const trigger = {
            id: 102,
            is_bulk: true,
            total_contacts: 10,
            total_sent: 10,
            total_failed: 0,
            total_delivered: 10,
            total_read: 10,
            total_interactions: 0,
            total_blocked: 0,
            total_skipped: 0
        };

        render(
            <TriggerBulkMetrics
                trigger={trigger}
                triggerWithActions={trigger}
                handleViewContacts={handleViewContacts}
            />
        );

        const remainingBtn = screen.getByRole('button', { name: /restam 0/i });
        expect(remainingBtn).toBeInTheDocument();

        fireEvent.click(remainingBtn);
        expect(handleViewContacts).toHaveBeenCalledWith(trigger, 'remaining');
    });
});
