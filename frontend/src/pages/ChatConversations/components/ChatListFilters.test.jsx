import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ChatListFilters from './ChatListFilters';

describe('ChatListFilters - Ordenação de Conversas', () => {
    const defaultProps = {
        activeTab: 'todos',
        setActiveTab: vi.fn(),
        statusFilter: 'open',
        setStatusFilter: vi.fn(),
        searchQuery: '',
        setSearchQuery: vi.fn(),
        selectedLabelFilter: null,
        setSelectedLabelFilter: vi.fn(),
        availableLabels: [],
        activeFilterTab: null,
        setActiveFilterTab: vi.fn(),
        filterWindowOpen: false,
        setFilterWindowOpen: vi.fn(),
        filterTemplate24h: false,
        setFilterTemplate24h: vi.fn(),
        filterUnread: false,
        setFilterUnread: vi.fn(),
        filterHasNote: false,
        setFilterHasNote: vi.fn(),
        filterUrgent: false,
        setFilterUrgent: vi.fn(),
        filterHasReplied: false,
        setFilterHasReplied: vi.fn(),
        filterHasActiveFunnel: false,
        setFilterHasActiveFunnel: vi.fn(),
        filterBlockStatus: null,
        setFilterBlockStatus: vi.fn(),
        filterStartDate: '',
        setFilterStartDate: vi.fn(),
        filterEndDate: '',
        setFilterEndDate: vi.fn(),
        orderBy: 'recent',
        setOrderBy: vi.fn(),
        visibleCount: 15
    };

    it('renderiza o botão "Ordem" na barra de filtros', () => {
        render(<ChatListFilters {...defaultProps} />);
        expect(screen.getByText('Ordem')).toBeInTheDocument();
    });

    it('abre o painel de ordenação quando activeFilterTab é "ordem"', () => {
        render(<ChatListFilters {...defaultProps} activeFilterTab="ordem" />);

        expect(screen.getByText('Mais recentes')).toBeInTheDocument();
        expect(screen.getByText('Mais antigas')).toBeInTheDocument();
        expect(screen.getByText('Nome (A → Z)')).toBeInTheDocument();
        expect(screen.getByText('Nome (Z → A)')).toBeInTheDocument();
        expect(screen.getByText('Mais mensagens')).toBeInTheDocument();
        expect(screen.getByText('Menos mensagens')).toBeInTheDocument();
        expect(screen.getByText('Mais não lidas')).toBeInTheDocument();
    });

    it('chama setOrderBy com a opção selecionada ao clicar no botão de ordenação', () => {
        const setOrderByMock = vi.fn();
        render(<ChatListFilters {...defaultProps} activeFilterTab="ordem" setOrderBy={setOrderByMock} />);

        const btnAlphaAsc = screen.getByText('Nome (A → Z)');
        fireEvent.click(btnAlphaAsc);
        expect(setOrderByMock).toHaveBeenCalledWith('name_asc');

        const btnAlphaDesc = screen.getByText('Nome (Z → A)');
        fireEvent.click(btnAlphaDesc);
        expect(setOrderByMock).toHaveBeenCalledWith('name_desc');

        const btnMsgsDesc = screen.getByText('Mais mensagens');
        fireEvent.click(btnMsgsDesc);
        expect(setOrderByMock).toHaveBeenCalledWith('messages_desc');
    });

    it('renderiza todos os botões de filtros com seus respectivos ícones e rótulos completos', () => {
        render(<ChatListFilters {...defaultProps} />);
        expect(screen.getByText('Marcador')).toBeInTheDocument();
        expect(screen.getByText('Status')).toBeInTheDocument();
        expect(screen.getByText('Bloqueio')).toBeInTheDocument();
        expect(screen.getByText('Data')).toBeInTheDocument();
        expect(screen.getByText('Ordem')).toBeInTheDocument();
        expect(screen.getByText('15')).toBeInTheDocument();
    });

    it('permite alternar abas de filtro clicando nos botões de filtro', () => {
        const setActiveFilterTabMock = vi.fn();
        render(<ChatListFilters {...defaultProps} setActiveFilterTab={setActiveFilterTabMock} />);

        const btnMarcador = screen.getByText('Marcador');
        fireEvent.click(btnMarcador);
        expect(setActiveFilterTabMock).toHaveBeenCalled();
    });

    it('renderiza o seletor pesquisável de marcadores quando activeFilterTab é "marcador"', () => {
        const setSelectedLabelFilterMock = vi.fn();
        render(
            <ChatListFilters
                {...defaultProps}
                activeFilterTab="marcador"
                availableLabels={['suporte', 'compra-aprovada', 'vip']}
                setSelectedLabelFilter={setSelectedLabelFilterMock}
            />
        );

        const trigger = screen.getByText('Todos os marcadores');
        expect(trigger).toBeInTheDocument();

        fireEvent.click(trigger);
        const searchInput = screen.getByPlaceholderText('Pesquisar etiqueta...');
        expect(searchInput).toBeInTheDocument();

        fireEvent.change(searchInput, { target: { value: 'compra' } });
        expect(screen.getByText('compra-aprovada')).toBeInTheDocument();
        expect(screen.queryByText('suporte')).not.toBeInTheDocument();

        fireEvent.click(screen.getByText('compra-aprovada'));
        expect(setSelectedLabelFilterMock).toHaveBeenCalledWith('compra-aprovada');
    });
});

