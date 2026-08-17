import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import QuickMessagesTab from './QuickMessagesTab';

const mockMessages = [
    {
        id: 1,
        shortcut: 'pix',
        title: 'Chave PIX e Instruções',
        content: 'Olá {{nome}}, segue nossa chave PIX: contato@zapvoice.com'
    },
    {
        id: 2,
        shortcut: 'ola',
        title: 'Boas-vindas',
        content: 'Olá {{primeiro_nome}}, seja muito bem-vindo ao suporte!'
    }
];

describe('QuickMessagesTab', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        global.fetch = vi.fn();
    });

    it('renderiza a lista de mensagens rápidas carregadas do servidor', async () => {
        global.fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => mockMessages
        });

        render(<QuickMessagesTab user={{ id: 1 }} activeClient={{ id: 10 }} />);

        expect(screen.getByText(/Carregando mensagens rápidas/i)).toBeInTheDocument();

        await waitFor(() => {
            expect(screen.getByText('/pix')).toBeInTheDocument();
            expect(screen.getByText('Chave PIX e Instruções')).toBeInTheDocument();
            expect(screen.getByText('/ola')).toBeInTheDocument();
            expect(screen.getByText('Boas-vindas')).toBeInTheDocument();
        });
    });

    it('filtra a lista conforme a busca digitada', async () => {
        global.fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => mockMessages
        });

        render(<QuickMessagesTab user={{ id: 1 }} activeClient={{ id: 10 }} />);

        await waitFor(() => {
            expect(screen.getByText('/pix')).toBeInTheDocument();
        });

        const searchInput = screen.getByPlaceholderText(/Pesquisar por atalho, título ou conteúdo/i);
        fireEvent.change(searchInput, { target: { value: 'pix' } });

        expect(screen.getByText('/pix')).toBeInTheDocument();
        expect(screen.queryByText('/ola')).not.toBeInTheDocument();
    });

    it('abre modal para criar nova mensagem rápida e envia POST', async () => {
        global.fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => []
        });

        render(<QuickMessagesTab user={{ id: 1 }} activeClient={{ id: 10 }} />);

        await waitFor(() => {
            expect(screen.getByText(/Nenhuma mensagem rápida encontrada/i)).toBeInTheDocument();
        });

        const newBtn = screen.getByRole('button', { name: /Nova Mensagem/i });
        fireEvent.click(newBtn);

        expect(screen.getByText('Nova Mensagem Rápida')).toBeInTheDocument();

        const shortcutInput = screen.getByPlaceholderText(/ex: pix, ola, horario, suporte/i);
        const titleInput = screen.getByPlaceholderText(/ex: Chave PIX e Instruções/i);
        const contentInput = screen.getByPlaceholderText(/Digite o texto da mensagem/i);

        fireEvent.change(shortcutInput, { target: { value: 'horario' } });
        fireEvent.change(titleInput, { target: { value: 'Horário de Atendimento' } });
        fireEvent.change(contentInput, { target: { value: 'Atendemos de seg a sex das 9h às 18h.' } });

        global.fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ id: 3, shortcut: 'horario', title: 'Horário de Atendimento', content: '...' })
        });
        global.fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => [...mockMessages, { id: 3, shortcut: 'horario', title: 'Horário de Atendimento', content: '...' }]
        });

        const saveBtn = screen.getByRole('button', { name: /Salvar Mensagem/i });
        fireEvent.click(saveBtn);

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('/quick-messages'),
                expect.objectContaining({
                    method: 'POST',
                    body: JSON.stringify({
                        shortcut: 'horario',
                        title: 'Horário de Atendimento',
                        content: 'Atendemos de seg a sex das 9h às 18h.'
                    })
                })
            );
        });
    });

    it('abre modal de confirmação de exclusão ao clicar em excluir e executa DELETE ao confirmar', async () => {
        global.fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => mockMessages
        });

        render(<QuickMessagesTab user={{ id: 1 }} activeClient={{ id: 10 }} />);

        await waitFor(() => {
            expect(screen.getByText('/pix')).toBeInTheDocument();
        });

        const deleteButtons = screen.getAllByTitle('Excluir mensagem');
        fireEvent.click(deleteButtons[0]);

        expect(screen.getByText('Excluir Mensagem Rápida')).toBeInTheDocument();
        expect(screen.getAllByText('/pix').length).toBeGreaterThanOrEqual(1);

        global.fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ success: true })
        });
        global.fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => [mockMessages[1]]
        });

        const confirmBtn = screen.getByRole('button', { name: /Sim, Excluir/i });
        fireEvent.click(confirmBtn);

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('/quick-messages/1'),
                expect.objectContaining({
                    method: 'DELETE'
                })
            );
        });
    });
});
