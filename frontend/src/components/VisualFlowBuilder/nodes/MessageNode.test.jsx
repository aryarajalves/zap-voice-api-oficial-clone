import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ReactFlowProvider } from 'reactflow';
import { vi } from 'vitest';
import MessageNode from './MessageNode';

// Criar o mock para o ExpandTextModal
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
                        onChange={(e) => {}}
                    />
                    <button onClick={onClose}>Descartar</button>
                    <button onClick={() => { onSave(fieldKey, 'Novo texto editado no modal'); onClose(); }}>
                        SALVAR ALTERAÇÕES
                    </button>
                </div>
            );
        }
    };
});

describe('MessageNode', () => {
    const mockOnChange = vi.fn();
    const mockData = {
        content: 'Texto original principal',
        onChange: mockOnChange,
        isStart: false,
        variations: ['Variação 1 original'],
        onDelete: vi.fn(),
        onSetStart: vi.fn()
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    test('renderiza os campos de texto principal e variações', () => {
        render(
            <ReactFlowProvider>
                <MessageNode id="node-1" data={mockData} />
            </ReactFlowProvider>
        );

        expect(screen.getByText('Versão 1 (Principal)')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Texto original principal')).toBeInTheDocument();
        expect(screen.getByText('Versão 2')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Variação 1 original')).toBeInTheDocument();
    });

    test('abre o modal de maximizar para o texto principal e atualiza o valor ao salvar', () => {
        render(
            <ReactFlowProvider>
                <MessageNode id="node-1" data={mockData} />
            </ReactFlowProvider>
        );

        // Deve ter o botão de maximizar para a versão principal
        const maximizeButtons = screen.getAllByTitle('Maximizar Texto');
        expect(maximizeButtons.length).toBe(2); // 1 principal + 1 variação

        // Clica no botão de maximizar do principal
        fireEvent.click(maximizeButtons[0]);

        // Verifica se o modal abriu
        expect(screen.getByTestId('expand-text-modal')).toBeInTheDocument();
        expect(screen.getByText('Mensagem Principal (Versão 1)')).toBeInTheDocument();

        // Clica em salvar
        fireEvent.click(screen.getByText('SALVAR ALTERAÇÕES'));

        // Verifica se onChange foi chamado com o valor atualizado do modal mockado
        expect(mockOnChange).toHaveBeenCalledWith('node-1', { content: 'Novo texto editado no modal' });
    });

    test('abre o modal de maximizar para a variação e atualiza o valor ao salvar', () => {
        render(
            <ReactFlowProvider>
                <MessageNode id="node-1" data={mockData} />
            </ReactFlowProvider>
        );

        const maximizeButtons = screen.getAllByTitle('Maximizar Texto');
        
        // Clica no botão de maximizar da variação (segundo botão)
        fireEvent.click(maximizeButtons[1]);

        // Verifica se o modal abriu
        expect(screen.getByTestId('expand-text-modal')).toBeInTheDocument();
        expect(screen.getByText('Mensagem Variação (Versão 2)')).toBeInTheDocument();

        // Clica em salvar
        fireEvent.click(screen.getByText('SALVAR ALTERAÇÕES'));

        // Como variações são salvas através de data.onChange, vamos verificar se ela foi chamada
        expect(mockOnChange).toHaveBeenCalledWith('node-1', { variations: ['Novo texto editado no modal'] });
    });
});
