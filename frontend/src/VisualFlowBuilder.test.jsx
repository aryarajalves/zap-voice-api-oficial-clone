import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import VariableSelector from './components/VisualFlowBuilder/components/VariableSelector';
import NodeHeader from './components/VisualFlowBuilder/components/NodeHeader';
import { GlobalVarsContext } from './components/VisualFlowBuilder/index';
import { FiMessageSquare } from 'react-icons/fi';

vi.mock('./contexts/ClientContext', () => ({
    useClient: () => ({
        activeClient: { id: 1 }
    })
}));

vi.mock('./AuthContext', () => ({
    fetchWithAuth: vi.fn(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve(['teste_var_custom'])
    }))
}));

vi.mock('./config', () => ({
    API_URL: '/api'
}));

describe('VariableSelector', () => {
    const mockOnSelect = vi.fn();
    const mockVars = [
        { id: 'v1', name: 'var1', label: 'Variable 1', value: 'val1' }
    ];

    test('renders correctly and opens dropdown on click', async () => {
        render(
            <GlobalVarsContext.Provider value={mockVars}>
                <VariableSelector onSelect={mockOnSelect} />
            </GlobalVarsContext.Provider>
        );

        const button = screen.getByTitle('Inserir Variável');
        fireEvent.click(button);

        expect(screen.getByPlaceholderText('Procurar variável...')).toBeInTheDocument();
        expect(screen.getByText('{{nome}}')).toBeInTheDocument(); // Contact var
        expect(screen.getByText('{{email}}')).toBeInTheDocument(); // Nova contact var fixa
        expect(screen.getByText('{{plataforma}}')).toBeInTheDocument(); // Nova contact var fixa
        expect(screen.getByText('{{var1}}')).toBeInTheDocument(); // Global var
        
        // Espera a variável customizada ser carregada da API e renderizada
        const customVar = await screen.findByText('{{teste_var_custom}}');
        expect(customVar).toBeInTheDocument();
    });

    test('calls onSelect with correct value when variable is clicked', async () => {
        render(
            <GlobalVarsContext.Provider value={mockVars}>
                <VariableSelector onSelect={mockOnSelect} />
            </GlobalVarsContext.Provider>
        );

        fireEvent.click(screen.getByTitle('Inserir Variável'));
        const targetVar = await screen.findByText('{{var1}}');
        fireEvent.click(targetVar);

        expect(mockOnSelect).toHaveBeenCalledWith('{{var1}}');
    });
});

describe('NodeHeader', () => {
    const mockOnDelete = vi.fn();
    const mockOnSetStart = vi.fn();

    test('renders label and icon correctly', () => {
        render(
            <NodeHeader 
                label="Test Node" 
                icon={FiMessageSquare} 
                colorClass="bg-blue-100" 
            />
        );

        expect(screen.getByText('Test Node')).toBeInTheDocument();
    });

    test('shows start badge when isStart is true', () => {
        render(
            <NodeHeader 
                label="Test Node" 
                icon={FiMessageSquare} 
                isStart={true} 
            />
        );

        expect(screen.getByText('Início')).toBeInTheDocument();
        expect(screen.queryByTitle('Excluir nó')).not.toBeInTheDocument();
    });

    test('calls onDelete when delete button is clicked', () => {
        render(
            <NodeHeader 
                label="Test Node" 
                icon={FiMessageSquare} 
                onDelete={mockOnDelete} 
            />
        );

        const deleteButton = screen.getByTitle('Excluir nó');
        fireEvent.click(deleteButton);

        expect(mockOnDelete).toHaveBeenCalled();
    });

    test('calls onDuplicate when duplicate button is clicked', () => {
        const mockOnDuplicate = vi.fn();
        render(
            <NodeHeader 
                label="Test Node" 
                icon={FiMessageSquare} 
                onDuplicate={mockOnDuplicate} 
            />
        );

        const duplicateButton = screen.getByTitle('Duplicar nó');
        fireEvent.click(duplicateButton);

        expect(mockOnDuplicate).toHaveBeenCalled();
    });
});
