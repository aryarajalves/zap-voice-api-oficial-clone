import React from 'react';
import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import TriggerTableRow from './TriggerTableRow';

// Mock do Contexto useClient
vi.mock('../../../context/ClientContext', () => ({
    useClient: () => ({
        activeClient: { id: 1, name: 'TestClient' }
    })
}));

describe('TriggerTableRow - Badge de Cartão WABA', () => {
    const defaultProps = {
        trigger: {
            id: 101,
            is_bulk: true,
            template_name: 'TemplateTest',
            status: 'completed',
            total_contacts: 10,
            total_sent: 10,
            total_delivered: 10,
            total_cost: 0,
            created_at: '2026-07-30T10:00:00Z',
            waba_card_last4: '4821'
        },
        selectedIds: [],
        setSelectedIds: vi.fn(),
        handleSelectRow: vi.fn(),
        togglePinTrigger: vi.fn(),
        folders: [],
        handleAssignFolder: vi.fn(),
        setEditParamsModal: vi.fn(),
        setModalConfig: vi.fn(),
        fetchErrors: vi.fn(),
        handleViewContacts: vi.fn(),
        handleStartNow: vi.fn(),
        handleRetry: vi.fn(),
        handleDeleteSingleTrigger: vi.fn(),
        activeClient: { id: 1, name: 'TestClient' },
        hasInteractionTracking: false,
        getFollowupConfig: () => ({ text: '', className: '', icon: '' }),
        fetchChildren: vi.fn(),
        handleSyncStats: vi.fn(),
        syncingId: null
    };

    it('renderiza a badge 💳 Final 4821 quando waba_card_last4 está preenchido', () => {
        render(<TriggerTableRow {...defaultProps} />);
        expect(screen.getByText('💳 Final 4821')).toBeInTheDocument();
    });

    it('NÃO renderiza a badge de cartão quando waba_card_last4 é nulo ou vazio', () => {
        const propsNoCard = {
            ...defaultProps,
            trigger: {
                ...defaultProps.trigger,
                waba_card_last4: null
            }
        };
        render(<TriggerTableRow {...propsNoCard} />);
        expect(screen.queryByText(/💳 Final/)).not.toBeInTheDocument();
    });
});
