import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
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

    it('abre o dropdown ao clicar no gatilho e exibe seletores de modo, operador, busca e etiquetas', () => {
        render(
            <ChatLabelFilterDropdown
                selectedLabelFilter={null}
                setSelectedLabelFilter={vi.fn()}
                availableLabels={mockLabels}
            />
        );

        const trigger = screen.getByText('Todos os marcadores');
        fireEvent.click(trigger);

        expect(screen.getByText('Possui')).toBeInTheDocument();
        expect(screen.getByText('Não possui')).toBeInTheDocument();
        expect(screen.getByText('OU')).toBeInTheDocument();
        expect(screen.getByText('E')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Pesquisar etiqueta...')).toBeInTheDocument();
        expect(screen.getByText('compra-aprovada')).toBeInTheDocument();
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

    it('chama setSelectedLabelFilter com objeto estruturado ao selecionar uma etiqueta', () => {
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

        expect(setSelectedLabelFilterMock).toHaveBeenCalledWith(expect.objectContaining({
            labels: ['vip'],
            mode: 'has',
            op: 'or',
            include_labels: ['vip'],
            exclude_labels: [],
            items: [{ name: 'vip', mode: 'has' }]
        }));
    });

    it('permite alternar para o modo "Não possui"', () => {
        const setSelectedLabelFilterMock = vi.fn();
        render(
            <ChatLabelFilterDropdown
                selectedLabelFilter={{ labels: ['vip'], mode: 'has', op: 'or' }}
                setSelectedLabelFilter={setSelectedLabelFilterMock}
                availableLabels={mockLabels}
            />
        );

        fireEvent.click(screen.getByText('vip'));
        const hasNotBtn = screen.getByRole('button', { name: /Não possui/i });
        fireEvent.click(hasNotBtn);

        expect(setSelectedLabelFilterMock).toHaveBeenCalledWith(expect.objectContaining({
            labels: ['vip'],
            mode: 'has_not',
            op: 'or',
            include_labels: [],
            exclude_labels: ['vip'],
            items: [{ name: 'vip', mode: 'has_not' }]
        }));
    });

    it('permite alternar para o operador "E"', () => {
        const setSelectedLabelFilterMock = vi.fn();
        render(
            <ChatLabelFilterDropdown
                selectedLabelFilter={{ labels: ['vip', 'suporte'], mode: 'has', op: 'or' }}
                setSelectedLabelFilter={setSelectedLabelFilterMock}
                availableLabels={mockLabels}
            />
        );

        fireEvent.click(screen.getByText(/2 etiquetas/i));
        const andBtn = screen.getByRole('button', { name: 'E' });
        fireEvent.click(andBtn);

        expect(setSelectedLabelFilterMock).toHaveBeenCalledWith(expect.objectContaining({
            labels: ['vip', 'suporte'],
            mode: 'has',
            op: 'and',
            include_labels: ['vip', 'suporte'],
            exclude_labels: []
        }));
    });

    it('permite desmarcar etiqueta já selecionada', () => {
        const setSelectedLabelFilterMock = vi.fn();
        render(
            <ChatLabelFilterDropdown
                selectedLabelFilter={{ labels: ['vip', 'suporte'], mode: 'has', op: 'or' }}
                setSelectedLabelFilter={setSelectedLabelFilterMock}
                availableLabels={mockLabels}
            />
        );

        fireEvent.click(screen.getByText(/2 etiquetas/i));
        // Clica na opção 'vip' na lista para desmarcar
        const vipOption = screen.getAllByText('vip').find(el => el.closest('[role="button"]')?.textContent?.includes('vip'));
        fireEvent.click(vipOption.closest('[role="button"]'));

        expect(setSelectedLabelFilterMock).toHaveBeenCalledWith(expect.objectContaining({
            labels: ['suporte'],
            mode: 'has',
            op: 'or',
            include_labels: ['suporte'],
            exclude_labels: []
        }));
    });

    it('permite alternar o modo individual de uma etiqueta clicando no botão do chip', () => {
        const setSelectedLabelFilterMock = vi.fn();
        render(
            <ChatLabelFilterDropdown
                selectedLabelFilter={{
                    labels: ['vip', 'suporte'],
                    mode: 'has',
                    op: 'or',
                    items: [
                        { name: 'vip', mode: 'has' },
                        { name: 'suporte', mode: 'has' }
                    ],
                    include_labels: ['vip', 'suporte'],
                    exclude_labels: []
                }}
                setSelectedLabelFilter={setSelectedLabelFilterMock}
                availableLabels={mockLabels}
            />
        );

        // Abre o dropdown para renderizar os chips e a lista
        fireEvent.click(screen.getByText(/2 etiquetas/i));

        // O chip do 'vip' possui o botão de modo 'TEM'
        const vipModeBtn = screen.getByRole('button', { name: /Alternar modo da etiqueta vip/i });
        fireEvent.click(vipModeBtn);

        expect(setSelectedLabelFilterMock).toHaveBeenCalledWith(expect.objectContaining({
            labels: ['vip', 'suporte'],
            items: [
                { name: 'vip', mode: 'has_not' },
                { name: 'suporte', mode: 'has' }
            ],
            include_labels: ['suporte'],
            exclude_labels: ['vip'],
            mode: 'mixed'
        }));
    });

    it('permite alternar o modo individual de uma etiqueta através da lista do dropdown', () => {
        const setSelectedLabelFilterMock = vi.fn();
        render(
            <ChatLabelFilterDropdown
                selectedLabelFilter={{
                    labels: ['vip'],
                    mode: 'has',
                    op: 'or',
                    items: [{ name: 'vip', mode: 'has' }],
                    include_labels: ['vip'],
                    exclude_labels: []
                }}
                setSelectedLabelFilter={setSelectedLabelFilterMock}
                availableLabels={mockLabels}
            />
        );

        fireEvent.click(screen.getByText('vip'));
        // Botão "Possui" dentro da linha da etiqueta vip selecionada
        const itemModeBtn = screen.getByTitle(/Esta etiqueta está configurada como "POSSUI"/i);
        fireEvent.click(itemModeBtn);

        expect(setSelectedLabelFilterMock).toHaveBeenCalledWith(expect.objectContaining({
            labels: ['vip'],
            items: [{ name: 'vip', mode: 'has_not' }],
            include_labels: [],
            exclude_labels: ['vip'],
            mode: 'has_not'
        }));
    });

    it('limpa o filtro ao clicar no botão X do gatilho', () => {
        const setSelectedLabelFilterMock = vi.fn();
        render(
            <ChatLabelFilterDropdown
                selectedLabelFilter={{ labels: ['vip'], mode: 'has', op: 'or' }}
                setSelectedLabelFilter={setSelectedLabelFilterMock}
                availableLabels={mockLabels}
                getLabelColor={mockGetColor}
            />
        );

        const clearBtn = screen.getByTitle('Limpar filtros de marcadores');
        fireEvent.click(clearBtn);

        expect(setSelectedLabelFilterMock).toHaveBeenCalledWith(null);
    });

    it('limpa o filtro ao clicar na opção "Todos os marcadores (sem filtro)"', () => {
        const setSelectedLabelFilterMock = vi.fn();
        render(
            <ChatLabelFilterDropdown
                selectedLabelFilter={{ labels: ['vip'], mode: 'has', op: 'or' }}
                setSelectedLabelFilter={setSelectedLabelFilterMock}
                availableLabels={mockLabels}
            />
        );

        fireEvent.click(screen.getByText('vip'));
        const clearOption = screen.getByText(/Todos os marcadores \(sem filtro\)/i);
        fireEvent.click(clearOption);

        expect(setSelectedLabelFilterMock).toHaveBeenCalledWith(null);
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

    it('notifica onOpenChange quando abre e fecha o dropdown', () => {
        const onOpenChangeMock = vi.fn();
        render(
            <ChatLabelFilterDropdown
                selectedLabelFilter={null}
                setSelectedLabelFilter={vi.fn()}
                availableLabels={mockLabels}
                onOpenChange={onOpenChangeMock}
            />
        );

        // Ao abrir
        fireEvent.click(screen.getByText('Todos os marcadores'));
        expect(onOpenChangeMock).toHaveBeenCalledWith(true);

        // Ao fechar pelo botão concluir
        const concludeBtn = screen.getByText('Concluir');
        fireEvent.click(concludeBtn);
        expect(onOpenChangeMock).toHaveBeenCalledWith(false);
    });
});
