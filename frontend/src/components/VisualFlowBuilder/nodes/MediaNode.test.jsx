import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ReactFlowProvider } from 'reactflow';
import { vi } from 'vitest';
import MediaNode from './MediaNode';

// Mock useClient context
vi.mock('../../../contexts/ClientContext', () => ({
    useClient: () => ({
        activeClient: { id: 1, chatwoot_url: 'http://test.com' }
    })
}));

// Mock ExpandTextModal
vi.mock('../../BulkSender/common/ExpandTextModal', () => {
    return {
        default: ({ isOpen, onClose, title, value, onSave, fieldKey }) => {
            if (!isOpen) return null;
            return (
                <div data-testid="expand-text-modal">
                    <h3>{title}</h3>
                    <textarea 
                        data-testid="modal-textarea" 
                        defaultValue={value} 
                        onChange={() => {}}
                    />
                    <button onClick={onClose}>Cancelar</button>
                    <button onClick={() => { onSave(fieldKey, 'Legenda atualizada pelo modal'); onClose(); }}>
                        SALVAR ALTERAÇÕES
                    </button>
                </div>
            );
        }
    };
});

describe('MediaNode', () => {
    const mockOnChange = vi.fn();
    const mockData = {
        mediaUrl: 'http://test.com/image.jpg',
        mediaType: 'image',
        fileName: 'image.jpg',
        caption: 'Legenda original',
        onChange: mockOnChange,
        isStart: false,
        onDelete: vi.fn(),
        onSetStart: vi.fn()
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    test('renderiza a legenda e botão de maximizar', () => {
        render(
            <ReactFlowProvider>
                <MediaNode id="node-media-1" data={mockData} />
            </ReactFlowProvider>
        );

        expect(screen.getByText('Legenda (Opcional)')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Legenda original')).toBeInTheDocument();
        expect(screen.getByTitle('Maximizar Legenda')).toBeInTheDocument();
    });

    test('abre o modal ao clicar no botão de maximizar e atualiza o valor', () => {
        render(
            <ReactFlowProvider>
                <MediaNode id="node-media-1" data={mockData} />
            </ReactFlowProvider>
        );

        const maximizeBtn = screen.getByTitle('Maximizar Legenda');
        fireEvent.click(maximizeBtn);

        expect(screen.getByTestId('expand-text-modal')).toBeInTheDocument();
        expect(screen.getByText('Legenda da Mídia')).toBeInTheDocument();

        fireEvent.click(screen.getByText('SALVAR ALTERAÇÕES'));

        expect(mockOnChange).toHaveBeenCalledWith('node-media-1', { caption: 'Legenda atualizada pelo modal' });
    });
});
