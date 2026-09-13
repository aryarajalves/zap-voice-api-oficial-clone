import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ReactFlowProvider } from 'reactflow';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import CrmActionsNode from './CrmActionsNode';
import { useClient } from '../../../contexts/ClientContext';
import { fetchWithAuth } from '../../../AuthContext';

vi.mock('../../../contexts/ClientContext');
vi.mock('../../../AuthContext');

const mockClient = { id: 'client-123', name: 'Test Client' };
const mockLabels = [
    { id: 1, title: 'Atendido' },
    { id: 2, title: 'Suporte' },
    { id: 3, title: 'VIP' }
];

describe('CrmActionsNode Component', () => {
    const mockOnChange = vi.fn();
    const mockOnDelete = vi.fn();
    const mockOnDuplicate = vi.fn();
    const mockOnSetStart = vi.fn();

    const baseData = {
        platform: 'chatwoot',
        action: 'chatwoot_label',
        value: '',
        label: 'Atendido',
        remove_label: 'Suporte',
        onChange: mockOnChange,
        onDelete: mockOnDelete,
        onDuplicate: mockOnDuplicate,
        onSetStart: mockOnSetStart,
        isStart: false
    };

    beforeEach(() => {
        vi.clearAllMocks();
        useClient.mockReturnValue({ activeClient: mockClient });
        fetchWithAuth.mockImplementation((url) => {
            if (url.includes('/chat/labels')) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve(mockLabels)
                });
            }
            if (url.includes('/leads/filters')) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({ tags: ['Cliente', 'Interessado', 'Promocional'] })
                });
            }
            return Promise.resolve({
                ok: true,
                json: () => Promise.resolve([])
            });
        });
    });

    it('renders the node header and handles platform and action change', async () => {
        render(
            <ReactFlowProvider>
                <CrmActionsNode id="node-crm-1" data={baseData} />
            </ReactFlowProvider>
        );

        expect(screen.getByText('Ações de CRM')).toBeInTheDocument();
        expect(screen.getByText('Plataforma')).toBeInTheDocument();
        expect(screen.getByText('Ação')).toBeInTheDocument();

        // Change platform to local
        const platformSelect = screen.getByDisplayValue('💬 Atendimento (Chat Local)');
        fireEvent.change(platformSelect, { target: { value: 'local' } });

        expect(mockOnChange).toHaveBeenCalledWith('node-crm-1', expect.objectContaining({
            platform: 'local',
            action: 'add_tag'
        }));
    });

    it('renders chatwoot labels and allows adding and removing labels', async () => {
        render(
            <ReactFlowProvider>
                <CrmActionsNode id="node-crm-1" data={baseData} />
            </ReactFlowProvider>
        );

        // Verify chips for selected labels
        expect(screen.getByText('Atendido')).toBeInTheDocument();
        expect(screen.getByText('Suporte')).toBeInTheDocument();

        // Click to remove selected add label
        const removeAddChipBtn = screen.getByText('Atendido').querySelector('button');
        if (removeAddChipBtn) {
            fireEvent.click(removeAddChipBtn);
            expect(mockOnChange).toHaveBeenCalledWith('node-crm-1', { label: '' });
        }

        // Wait for labels to finish loading
        await waitFor(() => {
            expect(screen.queryByText('Carregando...')).not.toBeInTheDocument();
        });

        // Open add dropdown
        const selectDropdowns = screen.getAllByText('Selecione...');
        fireEvent.click(selectDropdowns[0]);

        await waitFor(() => {
            expect(screen.getByPlaceholderText('Buscar...')).toBeInTheDocument();
        });

        // Search for a label
        const searchInput = screen.getByPlaceholderText('Buscar...');
        fireEvent.change(searchInput, { target: { value: 'VIP' } });

        expect(screen.getByText('VIP')).toBeInTheDocument();
        fireEvent.click(screen.getByText('VIP'));

        expect(mockOnChange).toHaveBeenCalledWith('node-crm-1', { label: 'Atendido,VIP' });
    });

    it('renders contact update options when action is update_contact', () => {
        const updateData = {
            ...baseData,
            platform: 'chatwoot',
            action: 'update_contact',
            nameType: 'fixed',
            newName: 'Carlos Silva'
        };

        render(
            <ReactFlowProvider>
                <CrmActionsNode id="node-crm-2" data={updateData} />
            </ReactFlowProvider>
        );

        expect(screen.getByText('Origem do Nome')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Carlos Silva')).toBeInTheDocument();

        // Type new name
        const nameInput = screen.getByDisplayValue('Carlos Silva');
        fireEvent.change(nameInput, { target: { value: 'Maria Oliveira' } });
        expect(mockOnChange).toHaveBeenCalledWith('node-crm-2', { newName: 'Maria Oliveira' });
    });

    it('renders official API push name note when nameType is official', () => {
        const updateData = {
            ...baseData,
            platform: 'chatwoot',
            action: 'update_contact',
            nameType: 'official'
        };

        render(
            <ReactFlowProvider>
                <CrmActionsNode id="node-crm-2" data={updateData} />
            </ReactFlowProvider>
        );

        expect(screen.getByText(/O sistema usará o nome identificado pelo WhatsApp/i)).toBeInTheDocument();
    });

    it('renders local segment tag suggestions and blacklist warnings', async () => {
        const localTagData = {
            ...baseData,
            platform: 'local',
            action: 'add_tag',
            value: 'Cli'
        };

        const { rerender } = render(
            <ReactFlowProvider>
                <CrmActionsNode id="node-crm-3" data={localTagData} />
            </ReactFlowProvider>
        );

        expect(screen.getByText('Nome da Tag Local')).toBeInTheDocument();
        const tagInput = screen.getByPlaceholderText('Buscar ou criar tag...');
        expect(tagInput).toHaveValue('Cli');

        fireEvent.focus(tagInput);

        await waitFor(() => {
            expect(screen.getByText(/Cliente/i)).toBeInTheDocument();
        });

        // Test Blacklist action warning
        rerender(
            <ReactFlowProvider>
                <CrmActionsNode id="node-crm-3" data={{ ...localTagData, action: 'block' }} />
            </ReactFlowProvider>
        );

        expect(screen.getByText(/O número do contato será inserido na Blacklist local do ZapVoice/i)).toBeInTheDocument();
    });

    it('renders default action input for other platforms like ManyChat', () => {
        const manyChatData = {
            ...baseData,
            platform: 'manychat',
            action: 'set_custom_field',
            value: 'origem:google'
        };

        render(
            <ReactFlowProvider>
                <CrmActionsNode id="node-crm-4" data={manyChatData} />
            </ReactFlowProvider>
        );

        expect(screen.getByText('Campo & Valor (campo:valor)')).toBeInTheDocument();
        expect(screen.getByDisplayValue('origem:google')).toBeInTheDocument();

        const input = screen.getByDisplayValue('origem:google');
        fireEvent.change(input, { target: { value: 'origem:facebook' } });
        expect(mockOnChange).toHaveBeenCalledWith('node-crm-4', { value: 'origem:facebook' });
    });
});
