import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ReactFlowProvider } from 'reactflow';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import ChatwootLabelNode from './ChatwootLabelNode';
import { useClient } from '../../../contexts/ClientContext';
import { fetchWithAuth } from '../../../AuthContext';

// Mock dependencies
vi.mock('../../../contexts/ClientContext');
vi.mock('../../../AuthContext');

const mockClient = { id: 'client-123', name: 'Test Client' };
const mockLabels = [
    { id: 1, title: 'LabelOne' },
    { id: 2, title: 'LabelTwo' },
    { id: 3, title: 'Urgent' }
];

describe('ChatwootLabelNode Component', () => {
    const mockOnChange = vi.fn();
    const mockData = {
        label: 'LabelOne',
        remove_label: 'LabelTwo',
        onChange: mockOnChange,
        onDelete: vi.fn(),
        isStart: false
    };

    beforeEach(() => {
        vi.clearAllMocks();
        useClient.mockReturnValue({ activeClient: mockClient });
        fetchWithAuth.mockImplementation((url) => {
            if (url.includes('/chatwoot/labels')) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve(mockLabels)
                });
            }
            return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
        });
    });

    it('renders node headers and labels list properly', async () => {
        render(
            <ReactFlowProvider>
                <ChatwootLabelNode id="node-1" data={mockData} />
            </ReactFlowProvider>
        );

        // Wait for labels to load and loading state to end to avoid act() warning
        await waitFor(() => {
            expect(screen.queryByText('🔄 Carregando...')).not.toBeInTheDocument();
        });

        // Header label
        expect(screen.getByText('Etiquetar Chatwoot')).toBeInTheDocument();
        
        // Selected label tag (Add section)
        expect(screen.getByText('LabelOne')).toBeInTheDocument();
        
        // Selected label tag (Remove section)
        expect(screen.getByText('LabelTwo')).toBeInTheDocument();
        
        // Dropdown triggers are visible
        expect(screen.getByTestId('chatwoot-label-dropdown-trigger')).toBeInTheDocument();
        expect(screen.getByTestId('chatwoot-remove-label-dropdown-trigger')).toBeInTheDocument();
    });

    it('opens dropdown, filters labels on search input, and selects a label to add', async () => {
        render(
            <ReactFlowProvider>
                <ChatwootLabelNode id="node-1" data={mockData} />
            </ReactFlowProvider>
        );

        await waitFor(() => {
            expect(screen.queryByText('🔄 Carregando...')).not.toBeInTheDocument();
        });

        // Click add dropdown trigger to open it
        const dropdownTrigger = screen.getByTestId('chatwoot-label-dropdown-trigger');
        fireEvent.click(dropdownTrigger);

        // Search input should be present
        const searchInput = screen.getByTestId('chatwoot-label-search-input');
        expect(searchInput).toBeInTheDocument();

        // Check dropdown lists remaining non-selected options: LabelTwo and Urgent
        // (Note: LabelTwo is already in remove_label, but not in label, so it's selectable for Add)
        expect(screen.getByTestId('label-option-LabelTwo')).toBeInTheDocument();
        expect(screen.getByTestId('label-option-Urgent')).toBeInTheDocument();

        // Type search query to filter
        fireEvent.change(searchInput, { target: { value: 'urg' } });

        // LabelTwo should be filtered out, Urgent should remain
        expect(screen.queryByTestId('label-option-LabelTwo')).not.toBeInTheDocument();
        expect(screen.getByTestId('label-option-Urgent')).toBeInTheDocument();

        // Click the filtered option
        fireEvent.click(screen.getByTestId('label-option-Urgent'));

        // onChange should be called to add label (it appends)
        expect(mockOnChange).toHaveBeenCalledWith('node-1', {
            ...mockData,
            label: 'LabelOne,Urgent'
        });
    });

    it('opens remove dropdown and selects a label to remove', async () => {
        render(
            <ReactFlowProvider>
                <ChatwootLabelNode id="node-1" data={mockData} />
            </ReactFlowProvider>
        );

        await waitFor(() => {
            expect(screen.queryByText('🔄 Carregando...')).not.toBeInTheDocument();
        });

        // Click remove dropdown trigger
        const dropdownTrigger = screen.getByTestId('chatwoot-remove-label-dropdown-trigger');
        fireEvent.click(dropdownTrigger);

        // Search input should be present
        const searchInput = screen.getByTestId('chatwoot-remove-label-search-input');
        expect(searchInput).toBeInTheDocument();

        // Check options: LabelOne and Urgent are selectable to remove (LabelTwo is already selected)
        expect(screen.getByTestId('remove-label-option-LabelOne')).toBeInTheDocument();
        expect(screen.getByTestId('remove-label-option-Urgent')).toBeInTheDocument();

        // Click Urgent
        fireEvent.click(screen.getByTestId('remove-label-option-Urgent'));

        expect(mockOnChange).toHaveBeenCalledWith('node-1', {
            ...mockData,
            remove_label: 'LabelTwo,Urgent'
        });
    });
});
