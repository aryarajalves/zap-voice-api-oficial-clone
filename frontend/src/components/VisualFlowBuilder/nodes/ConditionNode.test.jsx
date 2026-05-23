import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ReactFlowProvider } from 'reactflow';
import { vi } from 'vitest';
import ConditionNode from './ConditionNode';

describe('ConditionNode', () => {
    const mockOnChange = vi.fn();
    const mockOnDelete = vi.fn();
    const mockData = {
        conditionType: 'text',
        condition: '',
        tag: '',
        aiQuestion: '',
        aiLimit: 15,
        aiInstructions: '',
        onChange: mockOnChange,
        onDelete: mockOnDelete,
        isStart: false
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    test('renderiza as opções de validação padrão', () => {
        render(
            <ReactFlowProvider>
                <ConditionNode id="node-cond" data={mockData} />
            </ReactFlowProvider>
        );

        expect(screen.getByText('Tipo de Validação')).toBeInTheDocument();
        expect(screen.getByText('Busca por Texto (Simples)')).toBeInTheDocument();
        expect(screen.getByPlaceholderText("Ex: Clicou 'Promo'?")).toBeInTheDocument();
    });

    test('quando o tipo é tag, renderiza o input de tag', () => {
        const tagData = { ...mockData, conditionType: 'tag' };
        render(
            <ReactFlowProvider>
                <ConditionNode id="node-cond" data={tagData} />
            </ReactFlowProvider>
        );

        expect(screen.getByPlaceholderText('ex: interessado')).toBeInTheDocument();
    });

    test('quando o tipo é ai_question, renderiza as abas Parâmetros e Critérios de Sucesso', () => {
        const aiData = { ...mockData, conditionType: 'ai_question', aiQuestion: 'Você quer agendar?' };
        render(
            <ReactFlowProvider>
                <ConditionNode id="node-cond" data={aiData} />
            </ReactFlowProvider>
        );

        // Deve renderizar os botões de abas
        expect(screen.getByText('Parâmetros')).toBeInTheDocument();
        expect(screen.getByText('Critérios de Sucesso')).toBeInTheDocument();

        // Como a aba padrão é 'config', o input de pergunta deve estar visível
        expect(screen.getByPlaceholderText('ex: O cliente aceitou agendar?')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Você quer agendar?')).toBeInTheDocument();
    });

    test('alterna para a aba Critérios de Sucesso e exibe o textarea de instruções', () => {
        const aiData = { 
            ...mockData, 
            conditionType: 'ai_question', 
            aiQuestion: 'Quer agendar?', 
            aiInstructions: 'Considere sim se aceitar' 
        };
        render(
            <ReactFlowProvider>
                <ConditionNode id="node-cond" data={aiData} />
            </ReactFlowProvider>
        );

        // Inicialmente mostra a pergunta
        expect(screen.getByPlaceholderText('ex: O cliente aceitou agendar?')).toBeInTheDocument();

        // Clica na aba Critérios de Sucesso
        fireEvent.click(screen.getByText('Critérios de Sucesso'));

        // O input de pergunta deve desaparecer (não estar na aba ativa)
        expect(screen.queryByPlaceholderText('ex: O cliente aceitou agendar?')).not.toBeInTheDocument();

        // O textarea de instruções deve estar visível
        expect(screen.getByPlaceholderText(/Descreva quais respostas são válidas/)).toBeInTheDocument();
        expect(screen.getByDisplayValue('Considere sim se aceitar')).toBeInTheDocument();
    });

    test('chama onChange ao alterar a pergunta específica e instruções de sucesso', () => {
        const aiData = { 
            ...mockData, 
            conditionType: 'ai_question', 
            aiQuestion: '', 
            aiInstructions: '' 
        };
        render(
            <ReactFlowProvider>
                <ConditionNode id="node-cond" data={aiData} />
            </ReactFlowProvider>
        );

        // Digita na pergunta específica
        const questionInput = screen.getByPlaceholderText('ex: O cliente aceitou agendar?');
        fireEvent.change(questionInput, { target: { value: 'Deseja comprar?' } });
        expect(mockOnChange).toHaveBeenCalledWith('node-cond', { aiQuestion: 'Deseja comprar?' });

        // Alterna para aba de instruções
        fireEvent.click(screen.getByText('Critérios de Sucesso'));

        // Digita nas instruções de sucesso
        const instructionsTextarea = screen.getByPlaceholderText(/Descreva quais respostas são válidas/);
        fireEvent.change(instructionsTextarea, { target: { value: 'Comprar produto' } });
        expect(mockOnChange).toHaveBeenCalledWith('node-cond', { aiInstructions: 'Comprar produto' });
    });
});
