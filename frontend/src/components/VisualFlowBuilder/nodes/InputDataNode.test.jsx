import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ReactFlowProvider } from 'reactflow';
import { vi } from 'vitest';
import InputDataNode from './InputDataNode';

// Mock ClientContext
vi.mock('../../../contexts/ClientContext', () => ({
    useClient: () => ({
        activeClient: { id: 1, name: 'Client Test' }
    })
}));

describe('InputDataNode', () => {
    const mockOnChange = vi.fn();
    const mockData = {
        collectionType: 'traditional',
        varName: 'email_cliente',
        validationRule: 'email',
        timeoutValue: 2,
        timeoutUnit: 'hours',
        errorMessage: 'Erro!',
        question: 'Qual o seu email?',
        onChange: mockOnChange,
        onDelete: vi.fn(),
        onDuplicate: vi.fn(),
        onSetStart: vi.fn()
    };

    test('renderiza os campos corretamente no modo tradicional com a pergunta', () => {
        render(
            <ReactFlowProvider>
                <InputDataNode id="node-input-1" data={mockData} />
            </ReactFlowProvider>
        );

        expect(screen.getByText('Entrada de Dados')).toBeInTheDocument();
        expect(screen.getByDisplayValue('email_cliente')).toBeInTheDocument();
        expect(screen.getByText('E-mail')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Erro!')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Qual o seu email?')).toBeInTheDocument();
    });

    test('permite alterar o tipo de coleta para inteligente/IA', () => {
        render(
            <ReactFlowProvider>
                <InputDataNode id="node-input-1" data={mockData} />
            </ReactFlowProvider>
        );

        const selectType = screen.getByLabelText('Tipo de Coleta');
        fireEvent.change(selectType, { target: { value: 'ai' } });
        expect(mockOnChange).toHaveBeenCalledWith('node-input-1', { collectionType: 'ai' });
    });

    test('abre o modal de maximizar ao clicar no botão correspondente', () => {
        render(
            <ReactFlowProvider>
                <InputDataNode id="node-input-1" data={mockData} />
            </ReactFlowProvider>
        );

        expect(screen.queryByText('Confirmar')).not.toBeInTheDocument();

        const maximizeButtons = screen.getAllByTitle('Maximizar');
        fireEvent.click(maximizeButtons[0]);

        expect(screen.getByText('Confirmar')).toBeInTheDocument();

        fireEvent.click(screen.getByText('Confirmar'));

        expect(screen.queryByText('Confirmar')).not.toBeInTheDocument();
    });

    test('renderiza as 3 saídas (Sucesso, Falha, Timeout) no lado direito', () => {
        render(
            <ReactFlowProvider>
                <InputDataNode id="node-input-1" data={mockData} />
            </ReactFlowProvider>
        );

        expect(screen.getByText('Sucesso')).toBeInTheDocument();
        expect(screen.getByText('Falha')).toBeInTheDocument();
        expect(screen.getByText('Timeout')).toBeInTheDocument();
    });
});

