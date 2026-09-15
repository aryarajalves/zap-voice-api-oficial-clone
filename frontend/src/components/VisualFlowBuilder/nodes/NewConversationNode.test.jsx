import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import NewConversationNode from './NewConversationNode';

// Mock do React Flow components
vi.mock('reactflow', () => ({
    Handle: ({ id, type, position }) => (
        <div data-testid={`handle-${type}-${id || position}`} />
    ),
    Position: {
        Left: 'left',
        Right: 'right',
        Top: 'top',
        Bottom: 'bottom'
    }
}));

// Mock do NodeHeader
vi.mock('../components/NodeHeader', () => ({
    default: ({ label, onDelete, onDuplicate, isStart, onSetStart }) => (
        <div data-testid="node-header">
            <span>{label}</span>
            <button onClick={onDelete}>delete</button>
            <button onClick={onDuplicate}>duplicate</button>
            {onSetStart && <button onClick={onSetStart}>setStart</button>}
        </div>
    )
}));

describe('NewConversationNode Component', () => {
    it('renderiza o nó com rotas padrão e rota fallback', () => {
        const mockOnChange = vi.fn();
        const data = {
            onChange: mockOnChange,
            isStart: true
        };

        render(<NewConversationNode id="test_node_1" data={data} />);

        expect(screen.getByText('Gatilho: Nova Conversa')).toBeInTheDocument();
        expect(screen.getByText('Outras Mensagens (Padrão)')).toBeInTheDocument();
        expect(screen.getByTestId('handle-source-default')).toBeInTheDocument();
        expect(screen.getByText('Adicionar Rota (Case)')).toBeInTheDocument();
    });

    it('permite adicionar uma nova rota ao clicar no botão', () => {
        const mockOnChange = vi.fn();
        const data = {
            routes: [
                { id: 'route_1', label: 'Suporte', phrases: 'ajuda', matchType: 'contains' }
            ],
            onChange: mockOnChange,
            isStart: true
        };

        render(<NewConversationNode id="test_node_1" data={data} />);

        const addBtn = screen.getByText('Adicionar Rota (Case)');
        fireEvent.click(addBtn);

        expect(mockOnChange).toHaveBeenCalledTimes(1);
        const calledRoutes = mockOnChange.mock.calls[0][1].routes;
        expect(calledRoutes.length).toBe(2);
        expect(calledRoutes[1].label).toBe('Rota 2');
    });

    it('permite alterar frases e label de uma rota', () => {
        const mockOnChange = vi.fn();
        const data = {
            routes: [
                { id: 'route_1', label: 'Financeiro', phrases: 'boleto, fatura', matchType: 'contains' }
            ],
            onChange: mockOnChange,
            isStart: true
        };

        render(<NewConversationNode id="test_node_1" data={data} />);

        const phraseInput = screen.getByDisplayValue('boleto, fatura');
        fireEvent.change(phraseInput, { target: { value: 'boleto, fatura, pix' } });

        expect(mockOnChange).toHaveBeenCalledWith('test_node_1', {
            routes: [
                { id: 'route_1', label: 'Financeiro', phrases: 'boleto, fatura, pix', matchType: 'contains' }
            ]
        });
    });

    it('permite remover uma rota se houver mais de uma', () => {
        const mockOnChange = vi.fn();
        const data = {
            routes: [
                { id: 'route_1', label: 'Rota 1', phrases: 'a', matchType: 'contains' },
                { id: 'route_2', label: 'Rota 2', phrases: 'b', matchType: 'contains' }
            ],
            onChange: mockOnChange,
            isStart: true
        };

        render(<NewConversationNode id="test_node_1" data={data} />);

        const removeButtons = screen.getAllByTitle('Remover rota');
        expect(removeButtons.length).toBe(2);
        fireEvent.click(removeButtons[0]);

        expect(mockOnChange).toHaveBeenCalledWith('test_node_1', {
            routes: [
                { id: 'route_2', label: 'Rota 2', phrases: 'b', matchType: 'contains' }
            ]
        });
    });
});
