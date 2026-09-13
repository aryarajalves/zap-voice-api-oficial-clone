import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { getWaitingTime } from './utils';
import HumanAgentsHeader from './components/HumanAgentsHeader';
import HumanAgentsSearch from './components/HumanAgentsSearch';
import HumanAgentsPagination from './components/HumanAgentsPagination';
import HumanAgentsEmptyState from './components/HumanAgentsEmptyState';

describe('HumanAgents Modular Components & Utils', () => {
    describe('getWaitingTime', () => {
        it('retorna "Sem tempo registrado" para valor nulo ou vazio', () => {
            expect(getWaitingTime(null)).toBe('Sem tempo registrado');
            expect(getWaitingTime('')).toBe('Sem tempo registrado');
        });

        it('retorna "Iniciou agora" para horários recentes (menos de 1 minuto)', () => {
            const now = new Date().toISOString();
            expect(getWaitingTime(now)).toBe('Iniciou agora');
        });

        it('retorna minutos decorridos', () => {
            const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
            expect(getWaitingTime(tenMinutesAgo)).toBe('Há 10 minutos');
        });

        it('retorna horas decorridas no singular e plural', () => {
            const oneHourAgo = new Date(Date.now() - 65 * 60 * 1000).toISOString();
            expect(getWaitingTime(oneHourAgo)).toBe('Há 1 hora');

            const twoHoursAgo = new Date(Date.now() - 130 * 60 * 1000).toISOString();
            expect(getWaitingTime(twoHoursAgo)).toBe('Há 2 horas');
        });

        it('retorna dias decorridos no singular e plural', () => {
            const oneDayAgo = new Date(Date.now() - 25 * 3600 * 1000).toISOString();
            expect(getWaitingTime(oneDayAgo)).toBe('Há 1 dia');

            const threeDaysAgo = new Date(Date.now() - 75 * 3600 * 1000).toISOString();
            expect(getWaitingTime(threeDaysAgo)).toBe('Há 3 dias');
        });
    });

    describe('HumanAgentsHeader', () => {
        it('renderiza título, permite alterar limite de página e aciona onRefresh', () => {
            const setLimitMock = vi.fn();
            const setPageMock = vi.fn();
            const onRefreshMock = vi.fn();

            render(
                <HumanAgentsHeader
                    limit={20}
                    setLimit={setLimitMock}
                    setPage={setPageMock}
                    loading={false}
                    onRefresh={onRefreshMock}
                />
            );

            expect(screen.getByText('Fila de Atendimento Humano')).toBeInTheDocument();
            
            const select = screen.getByRole('combobox');
            fireEvent.change(select, { target: { value: '50' } });
            expect(setLimitMock).toHaveBeenCalledWith(50);
            expect(setPageMock).toHaveBeenCalledWith(1);

            const refreshBtn = screen.getByTitle('Atualizar fila');
            fireEvent.click(refreshBtn);
            expect(onRefreshMock).toHaveBeenCalledTimes(1);
        });
    });

    describe('HumanAgentsSearch', () => {
        it('renderiza campo de busca e aciona setSearchQuery ao digitar', () => {
            const setSearchQueryMock = vi.fn();
            render(
                <HumanAgentsSearch
                    searchQuery="Carlos"
                    setSearchQuery={setSearchQueryMock}
                />
            );

            const input = screen.getByPlaceholderText(/Buscar por nome ou número do contato na página/i);
            expect(input.value).toBe('Carlos');

            fireEvent.change(input, { target: { value: 'Ana' } });
            expect(setSearchQueryMock).toHaveBeenCalledWith('Ana');
        });
    });

    describe('HumanAgentsPagination', () => {
        it('renderiza informações de paginação e permite navegar para Anterior e Próxima', () => {
            const setPageMock = vi.fn();

            render(
                <HumanAgentsPagination
                    page={2}
                    setPage={setPageMock}
                    totalPages={5}
                    filteredCount={20}
                    total={100}
                    loading={false}
                />
            );

            expect(screen.getByText('Mostrando 20 de 100 contatos')).toBeInTheDocument();
            expect(screen.getByText('Página 2 de 5')).toBeInTheDocument();

            const prevBtn = screen.getByRole('button', { name: /Anterior/i });
            const nextBtn = screen.getByRole('button', { name: /Próxima/i });

            fireEvent.click(prevBtn);
            expect(setPageMock).toHaveBeenCalled();

            fireEvent.click(nextBtn);
            expect(setPageMock).toHaveBeenCalled();
        });
    });

    describe('HumanAgentsEmptyState', () => {
        it('renderiza indicador de carregamento quando loading=true e sem conversas', () => {
            render(<HumanAgentsEmptyState loading={true} hasConversations={false} />);
            expect(screen.getByText('Carregando contatos na fila...')).toBeInTheDocument();
        });

        it('renderiza mensagem de fila limpa quando não há atendimentos pendentes', () => {
            render(<HumanAgentsEmptyState loading={false} hasConversations={false} />);
            expect(screen.getByText('Nenhum atendimento pendente')).toBeInTheDocument();
            expect(screen.getByText(/Todos os contatos estão sob controle do robô de IA/i)).toBeInTheDocument();
        });
    });
});
