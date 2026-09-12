import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ChatLabelFilterDropdown from './ChatLabelFilterDropdown';

describe('ChatLabelFilterDropdown', () => {
    const mockLabels = ['compra-aprovada', 'amanheceu-ontem-de', 'suporte', 'vip', 'cliente-antigo'];
    const mockDetails = [
        { name: 'compra-aprovada', color: '#10b981' },
        { name: 'vip', color: '#f59e0b' },
        { name: 'suporte', color: '#ef4444' }
    ];
    const mockGetColor = vi.fn((name) => {
        const found = mockDetails.find(d => d.name === name);
        return found ? found.color : '#3b82f6';
    });

    it('renderiza o gatilho com "Todos os marcadores" quando nenhum filtro está ativo', () => {
        render(
            <ChatLabelFilterDropdown
                selectedLabelFilter={null}
                setSelectedLabelFilter={vi.fn()}
                availableLabels={mockLabels}
            />
        );

        expect(screen.getByText('Todos os marcadores')).toBeInTheDocument();
    });

    it('abre o dropdown ao clicar no gatilho e exibe o campo de pesquisa e as etiquetas', () => {
        render(
            <ChatLabelFilterDropdown
                selectedLabelFilter={null}
                setSelectedLabelFilter={vi.fn()}
                availableLabels={mockLabels}
            />
        );

        const trigger = screen.getByText('Todos os marcadores');
        fireEvent.click(trigger);

        expect(screen.getByPlaceholderText('Pesquisar etiqueta...')).toBeInTheDocument();
        expect(screen.getByText('compra-aprovada')).toBeInTheDocument();
        expect(screen.getByText('amanheceu-ontem-de')).toBeInTheDocument();
        expect(screen.getByText('suporte')).toBeInTheDocument();
    });

    it('filtra as etiquetas em tempo real ao digitar no campo de pesquisa', () => {
        render(
            <ChatLabelFilterDropdown
                selectedLabelFilter={null}
                setSelectedLabelFilter={vi.fn()}
                availableLabels={mockLabels}
            />
        );

        fireEvent.click(screen.getByText('Todos os marcadores'));

        const input = screen.getByPlaceholderText('Pesquisar etiqueta...');
        fireEvent.change(input, { target: { value: 'compra' } });

        expect(screen.getByText('compra-aprovada')).toBeInTheDocument();
        expect(screen.queryByText('suporte')).not.toBeInTheDocument();
        expect(screen.queryByText('amanheceu-ontem-de')).not.toBeInTheDocument();
    });

    it('chama setSelectedLabelFilter com a etiqueta clicada e fecha o dropdown', () => {
        const setSelectedLabelFilterMock = vi.fn();
        render(
            <ChatLabelFilterDropdown
                selectedLabelFilter={null}
                setSelectedLabelFilter={setSelectedLabelFilterMock}
                availableLabels={mockLabels}
            />
        );

        fireEvent.click(screen.getByText('Todos os marcadores'));
        fireEvent.click(screen.getByText('vip'));

        expect(setSelectedLabelFilterMock).toHaveBeenCalledWith('vip');
        expect(screen.queryByPlaceholderText('Pesquisar etiqueta...')).not.toBeInTheDocument();
    });

    it('exibe a etiqueta selecionada no gatilho e permite limpar o filtro clicando no botão X', () => {
        const setSelectedLabelFilterMock = vi.fn();
        render(
            <ChatLabelFilterDropdown
                selectedLabelFilter="vip"
                setSelectedLabelFilter={setSelectedLabelFilterMock}
                availableLabels={mockLabels}
                getLabelColor={mockGetColor}
            />
        );

        expect(screen.getByText('vip')).toBeInTheDocument();

        const clearBtn = screen.getByTitle('Limpar filtro de marcador');
        fireEvent.click(clearBtn);

        expect(setSelectedLabelFilterMock).toHaveBeenCalledWith(null);
    });

    it('exibe mensagem quando nenhuma etiqueta corresponde à busca', () => {
        render(
            <ChatLabelFilterDropdown
                selectedLabelFilter={null}
                setSelectedLabelFilter={vi.fn()}
                availableLabels={mockLabels}
            />
        );

        fireEvent.click(screen.getByText('Todos os marcadores'));

        const input = screen.getByPlaceholderText('Pesquisar etiqueta...');
        fireEvent.change(input, { target: { value: 'inexistente123' } });

        expect(screen.getByText(/Nenhum marcador encontrado/i)).toBeInTheDocument();
    });

    it('seleciona a primeira etiqueta correspondente ao pressionar Enter na busca', () => {
        const setSelectedLabelFilterMock = vi.fn();
        render(
            <ChatLabelFilterDropdown
                selectedLabelFilter={null}
                setSelectedLabelFilter={setSelectedLabelFilterMock}
                availableLabels={mockLabels}
            />
        );

        fireEvent.click(screen.getByText('Todos os marcadores'));

        const input = screen.getByPlaceholderText('Pesquisar etiqueta...');
        fireEvent.change(input, { target: { value: 'sup' } });
        fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

        expect(setSelectedLabelFilterMock).toHaveBeenCalledWith('suporte');
    });

    it('fecha o dropdown ao pressionar a tecla Escape', () => {
        render(
            <ChatLabelFilterDropdown
                selectedLabelFilter={null}
                setSelectedLabelFilter={vi.fn()}
                availableLabels={mockLabels}
            />
        );

        fireEvent.click(screen.getByText('Todos os marcadores'));
        const input = screen.getByPlaceholderText('Pesquisar etiqueta...');

        fireEvent.keyDown(input, { key: 'Escape', code: 'Escape' });
        expect(screen.queryByPlaceholderText('Pesquisar etiqueta...')).not.toBeInTheDocument();
    });
});
