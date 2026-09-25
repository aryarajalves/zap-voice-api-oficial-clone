import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ReactFlowProvider } from 'reactflow';
import { vi, describe, test, expect, beforeEach } from 'vitest';
import FolderNode from './FolderNode';

// Mock do @reactflow/node-resizer
vi.mock('@reactflow/node-resizer', () => ({
    NodeResizer: ({ isVisible, lineClassName, handleClassName }) => (
        isVisible ? (
            <div
                data-testid="mock-node-resizer"
                data-line-class={lineClassName}
                data-handle-class={handleClassName}
            >
                Resizer
            </div>
        ) : null
    )
}));

describe('FolderNode', () => {
    const mockOnChange = vi.fn();
    const mockOnDelete = vi.fn();

    const defaultProps = {
        id: 'folder_node_1',
        selected: false,
        data: {
            title: 'Etapa 1 - Boas Vindas',
            description: 'Envio de catálogo e qualificação inicial',
            color: 'purple',
            onChange: mockOnChange,
            onDelete: mockOnDelete
        }
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    test('renderiza o título e a descrição da pasta/seção', () => {
        render(
            <ReactFlowProvider>
                <FolderNode {...defaultProps} />
            </ReactFlowProvider>
        );

        expect(screen.getByTestId('folder-title-display')).toHaveTextContent('Etapa 1 - Boas Vindas');
        expect(screen.getByTestId('folder-desc-display')).toHaveTextContent('Envio de catálogo e qualificação inicial');
    });

    test('exibe título padrão caso não seja fornecido', () => {
        const propsWithoutTitle = {
            ...defaultProps,
            data: {
                ...defaultProps.data,
                title: '',
                description: ''
            }
        };

        render(
            <ReactFlowProvider>
                <FolderNode {...propsWithoutTitle} />
            </ReactFlowProvider>
        );

        expect(screen.getByTestId('folder-title-display')).toHaveTextContent('Nova Pasta / Seção');
        expect(screen.queryByTestId('folder-desc-display')).not.toBeInTheDocument();
    });

    test('permite entrar em modo de edição, alterar nome e descrição e salvar', () => {
        render(
            <ReactFlowProvider>
                <FolderNode {...defaultProps} />
            </ReactFlowProvider>
        );

        // Clica no botão de editar
        const editBtn = screen.getByTestId('folder-edit-btn');
        fireEvent.click(editBtn);

        // Inputs devem estar visíveis
        const titleInput = screen.getByTestId('folder-title-input');
        const descInput = screen.getByTestId('folder-desc-input');
        expect(titleInput).toHaveValue('Etapa 1 - Boas Vindas');
        expect(descInput).toHaveValue('Envio de catálogo e qualificação inicial');

        // Modifica os valores
        fireEvent.change(titleInput, { target: { value: 'Etapa 2 - Recuperação' } });
        fireEvent.change(descInput, { target: { value: 'Disparo de boletos vencidos' } });

        // Clica em salvar
        const saveBtn = screen.getByTestId('folder-save-btn');
        fireEvent.click(saveBtn);

        expect(mockOnChange).toHaveBeenCalledWith('folder_node_1', {
            title: 'Etapa 2 - Recuperação',
            description: 'Disparo de boletos vencidos',
            color: 'purple'
        });
    });

    test('permite alterar a cor do tema da pasta', () => {
        render(
            <ReactFlowProvider>
                <FolderNode {...defaultProps} />
            </ReactFlowProvider>
        );

        // Clica na cor 'emerald'
        const emeraldBtn = screen.getByTestId('folder-color-emerald');
        fireEvent.click(emeraldBtn);

        expect(mockOnChange).toHaveBeenCalledWith('folder_node_1', {
            title: 'Etapa 1 - Boas Vindas',
            description: 'Envio de catálogo e qualificação inicial',
            color: 'emerald'
        });
    });

    test('chama onDelete ao clicar no botão de excluir pasta', () => {
        render(
            <ReactFlowProvider>
                <FolderNode {...defaultProps} />
            </ReactFlowProvider>
        );

        const deleteBtn = screen.getByTestId('folder-delete-btn');
        fireEvent.click(deleteBtn);

        expect(mockOnDelete).toHaveBeenCalledWith('folder_node_1');
    });

    test('renderiza o NodeResizer permanentemente ativo com as classes de redimensionamento e hitbox', () => {
        render(
            <ReactFlowProvider>
                <FolderNode {...defaultProps} selected={false} />
            </ReactFlowProvider>
        );

        const resizer = screen.getByTestId('mock-node-resizer');
        expect(resizer).toBeInTheDocument();
        expect(resizer.getAttribute('data-line-class')).toContain('folder-resizer-line');
        expect(resizer.getAttribute('data-handle-class')).toContain('folder-resizer-handle');
        expect(resizer.getAttribute('data-line-class')).not.toContain('is-selected');
    });

    test('aplica a classe is-selected e realce de seleção quando o nó está selecionado', () => {
        const { rerender } = render(
            <ReactFlowProvider>
                <FolderNode {...defaultProps} selected={false} />
            </ReactFlowProvider>
        );

        expect(screen.getByTestId(`folder-node-${defaultProps.id}`)).not.toHaveClass('ring-2');

        rerender(
            <ReactFlowProvider>
                <FolderNode {...defaultProps} selected={true} />
            </ReactFlowProvider>
        );

        const resizer = screen.getByTestId('mock-node-resizer');
        expect(resizer.getAttribute('data-line-class')).toContain('is-selected');
        expect(resizer.getAttribute('data-handle-class')).toContain('is-selected');
        expect(screen.getByTestId(`folder-node-${defaultProps.id}`)).toHaveClass('ring-2');
    });
});
