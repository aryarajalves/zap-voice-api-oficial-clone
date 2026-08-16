import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ReactFlowProvider } from 'reactflow';
import { vi } from 'vitest';
import ControlsPanel from './ControlsPanel';

describe('ControlsPanel', () => {
    const mockOnBack = vi.fn();
    const mockHandleSave = vi.fn();
    const mockOnDelete = vi.fn();
    const mockToggleFullScreen = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    test('renderiza os botões padrões de Voltar, Salvar, Excluir e Tela Cheia', () => {
        render(
            <ReactFlowProvider>
                <ControlsPanel
                    onBack={mockOnBack}
                    handleSave={mockHandleSave}
                    onDelete={mockOnDelete}
                    toggleFullScreen={mockToggleFullScreen}
                    isFullScreen={false}
                    saving={false}
                />
            </ReactFlowProvider>
        );

        expect(screen.getByText('Voltar para Lista')).toBeInTheDocument();
        expect(screen.getByText('Salvar Fluxo')).toBeInTheDocument();
        expect(screen.getByText('Excluir Funil')).toBeInTheDocument();
        expect(screen.getByTitle('Tela Cheia')).toBeInTheDocument();
    });

    test('chama onBack ao clicar em Voltar para Lista', () => {
        render(
            <ReactFlowProvider>
                <ControlsPanel
                    onBack={mockOnBack}
                    handleSave={mockHandleSave}
                    onDelete={mockOnDelete}
                    toggleFullScreen={mockToggleFullScreen}
                    isFullScreen={false}
                    saving={false}
                />
            </ReactFlowProvider>
        );

        fireEvent.click(screen.getByText('Voltar para Lista'));
        expect(mockOnBack).toHaveBeenCalledTimes(1);
    });

    test('chama handleSave ao clicar em Salvar Fluxo', () => {
        render(
            <ReactFlowProvider>
                <ControlsPanel
                    onBack={mockOnBack}
                    handleSave={mockHandleSave}
                    onDelete={mockOnDelete}
                    toggleFullScreen={mockToggleFullScreen}
                    isFullScreen={false}
                    saving={false}
                />
            </ReactFlowProvider>
        );

        fireEvent.click(screen.getByText('Salvar Fluxo'));
        expect(mockHandleSave).toHaveBeenCalledTimes(1);
    });

    test('chama onDelete ao clicar em Excluir Funil', () => {
        render(
            <ReactFlowProvider>
                <ControlsPanel
                    onBack={mockOnBack}
                    handleSave={mockHandleSave}
                    onDelete={mockOnDelete}
                    toggleFullScreen={mockToggleFullScreen}
                    isFullScreen={false}
                    saving={false}
                />
            </ReactFlowProvider>
        );

        fireEvent.click(screen.getByText('Excluir Funil'));
        expect(mockOnDelete).toHaveBeenCalledTimes(1);
    });

    test('exibe texto "Salvando..." e desativa botão durante o salvamento', () => {
        render(
            <ReactFlowProvider>
                <ControlsPanel
                    onBack={mockOnBack}
                    handleSave={mockHandleSave}
                    onDelete={mockOnDelete}
                    toggleFullScreen={mockToggleFullScreen}
                    isFullScreen={false}
                    saving={true}
                />
            </ReactFlowProvider>
        );

        const saveButton = screen.getByText('Salvando...');
        expect(saveButton).toBeInTheDocument();
        expect(saveButton.closest('button')).toBeDisabled();
    });

    test('oculta botão Voltar quando está em tela cheia', () => {
        render(
            <ReactFlowProvider>
                <ControlsPanel
                    onBack={mockOnBack}
                    handleSave={mockHandleSave}
                    onDelete={mockOnDelete}
                    toggleFullScreen={mockToggleFullScreen}
                    isFullScreen={true}
                    saving={false}
                />
            </ReactFlowProvider>
        );

        expect(screen.queryByText('Voltar para Lista')).not.toBeInTheDocument();
        expect(screen.getByTitle('Sair da Tela Cheia')).toBeInTheDocument();
    });
});
