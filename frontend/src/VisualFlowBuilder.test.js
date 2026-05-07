import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import VariableSelector from './frontend/src/components/VisualFlowBuilder/components/VariableSelector';
import NodeHeader from './frontend/src/components/VisualFlowBuilder/components/NodeHeader';
import { GlobalVarsContext } from './frontend/src/components/VisualFlowBuilder/index';
import { FiMessageSquare } from 'react-icons/fi';

describe('VariableSelector', () => {
    const mockOnSelect = jest.fn();
    const mockVars = [
        { id: 'v1', name: 'var1', label: 'Variable 1', value: 'val1' }
    ];

    test('renders correctly and opens dropdown on click', () => {
        render(
            <GlobalVarsContext.Provider value={mockVars}>
                <VariableSelector onSelect={mockOnSelect} />
            </GlobalVarsContext.Provider>
        );

        const button = screen.getByTitle('Inserir Variável');
        fireEvent.click(button);

        expect(screen.getByPlaceholderText('Procurar variável...')).toBeInTheDocument();
        expect(screen.getByText('{{nome}}')).toBeInTheDocument(); // Contact var
        expect(screen.getByText('{{var1}}')).toBeInTheDocument(); // Global var
    });

    test('calls onSelect with correct value when variable is clicked', () => {
        render(
            <GlobalVarsContext.Provider value={mockVars}>
                <VariableSelector onSelect={mockOnSelect} />
            </GlobalVarsContext.Provider>
        );

        fireEvent.click(screen.getByTitle('Inserir Variável'));
        fireEvent.click(screen.getByText('{{var1}}'));

        expect(mockOnSelect).toHaveBeenCalledWith('{{var1}}');
    });
});

describe('NodeHeader', () => {
    const mockOnDelete = jest.fn();
    const mockOnSetStart = jest.fn();

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
});
