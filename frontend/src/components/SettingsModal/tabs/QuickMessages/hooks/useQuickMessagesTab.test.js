import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useQuickMessagesTab, ITEMS_PER_PAGE } from './useQuickMessagesTab';
import { toast } from 'react-hot-toast';

vi.mock('react-hot-toast', () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn()
    }
}));

const mockMessages = [
    { id: 1, shortcut: 'pix', title: 'Chave PIX', content: 'Envie para teste@pix.com' },
    { id: 2, shortcut: 'ola', title: 'Boas-vindas', content: 'Olá {{nome}}!' },
    { id: 3, shortcut: 'suporte', title: 'Suporte', content: 'Atendimento das 8h às 18h' },
    { id: 4, shortcut: 'info', title: 'Informações', content: 'Mais detalhes em nosso site' },
    { id: 5, shortcut: 'doc', title: 'Documentos', content: 'Envie seu documento em PDF' },
    { id: 6, shortcut: 'boleto', title: 'Boleto', content: 'Segue o código de barras' },
    { id: 7, shortcut: 'promo', title: 'Promoção', content: 'Desconto de 20% hoje' }
];

describe('useQuickMessagesTab hook', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        global.fetch = vi.fn();
    });

    it('busca mensagens ao montar e calcula paginação corretamente', async () => {
        global.fetch.mockResolvedValue({
            ok: true,
            json: async () => mockMessages
        });

        const { result } = renderHook(() =>
            useQuickMessagesTab({ user: { id: 1, client_id: 10 }, activeClient: null })
        );

        await act(async () => {
            await result.current.fetchMessages();
        });

        expect(result.current.loadingList).toBe(false);
        expect(result.current.messages).toHaveLength(7);
        expect(result.current.paginatedMessages).toHaveLength(ITEMS_PER_PAGE);
        expect(result.current.totalPages).toBe(2);
    });

    it('filtra mensagens pelo campo search e reseta a página', async () => {
        global.fetch.mockResolvedValue({
            ok: true,
            json: async () => mockMessages
        });

        const { result } = renderHook(() =>
            useQuickMessagesTab({ user: { id: 1, client_id: 10 }, activeClient: null })
        );

        await act(async () => {
            await result.current.fetchMessages();
        });

        act(() => {
            result.current.setPage(2);
        });
        expect(result.current.page).toBe(2);

        act(() => {
            result.current.setSearch('pix');
        });

        expect(result.current.page).toBe(1);
        expect(result.current.filteredMessages).toHaveLength(1);
        expect(result.current.filteredMessages[0].shortcut).toBe('pix');
    });

    it('abre modal para criação e limpa os campos', () => {
        global.fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => []
        });

        const { result } = renderHook(() =>
            useQuickMessagesTab({ user: { id: 1 }, activeClient: { id: 20 } })
        );

        act(() => {
            result.current.handleOpenCreate();
        });

        expect(result.current.isFormModalOpen).toBe(true);
        expect(result.current.editingItem).toBeNull();
        expect(result.current.formShortcut).toBe('');
        expect(result.current.formTitle).toBe('');
        expect(result.current.formContent).toBe('');
    });

    it('abre modal para edição preenchendo os campos do item', () => {
        global.fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => []
        });

        const { result } = renderHook(() =>
            useQuickMessagesTab({ user: { id: 1 }, activeClient: { id: 20 } })
        );

        const item = { id: 5, shortcut: 'teste', title: 'Item Teste', content: 'Conteúdo Teste' };

        act(() => {
            result.current.handleOpenEdit(item);
        });

        expect(result.current.isFormModalOpen).toBe(true);
        expect(result.current.editingItem).toEqual(item);
        expect(result.current.formShortcut).toBe('teste');
        expect(result.current.formTitle).toBe('Item Teste');
        expect(result.current.formContent).toBe('Conteúdo Teste');
    });

    it('insere variáveis no conteúdo da mensagem', () => {
        global.fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => []
        });

        const { result } = renderHook(() =>
            useQuickMessagesTab({ user: { id: 1 }, activeClient: { id: 20 } })
        );

        act(() => {
            result.current.handleOpenCreate();
            result.current.handleInsertVariable('nome');
        });

        expect(result.current.formContent).toContain('{{nome}}');
    });

    it('valida campos obrigatórios no handleSave', async () => {
        global.fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => []
        });

        const { result } = renderHook(() =>
            useQuickMessagesTab({ user: { id: 1 }, activeClient: { id: 20 } })
        );

        // Sem atalho
        await act(async () => {
            await result.current.handleSave({ preventDefault: vi.fn() });
        });
        expect(toast.error).toHaveBeenCalledWith('O atalho é obrigatório.');

        // Com atalho, sem título
        act(() => {
            result.current.setFormShortcut('atalho');
        });
        await act(async () => {
            await result.current.handleSave({ preventDefault: vi.fn() });
        });
        expect(toast.error).toHaveBeenCalledWith('O título é obrigatório.');

        // Com atalho e título, sem conteúdo
        act(() => {
            result.current.setFormTitle('Título');
        });
        await act(async () => {
            await result.current.handleSave({ preventDefault: vi.fn() });
        });
        expect(toast.error).toHaveBeenCalledWith('O conteúdo da mensagem é obrigatório.');
    });

    it('cria mensagem com sucesso via POST', async () => {
        global.fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => []
        });

        const { result } = renderHook(() =>
            useQuickMessagesTab({ user: { id: 1, client_id: 10 }, activeClient: null })
        );

        act(() => {
            result.current.handleOpenCreate();
            result.current.setFormShortcut('/novo');
            result.current.setFormTitle('Novo Título');
            result.current.setFormContent('Mensagem nova');
        });

        global.fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ id: 10, shortcut: 'novo', title: 'Novo Título', content: 'Mensagem nova' })
        });
        global.fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => [{ id: 10, shortcut: 'novo', title: 'Novo Título', content: 'Mensagem nova' }]
        });

        await act(async () => {
            await result.current.handleSave({ preventDefault: vi.fn() });
        });

        expect(toast.success).toHaveBeenCalledWith('Mensagem rápida criada!');
        expect(result.current.isFormModalOpen).toBe(false);
    });

    it('exclui mensagem com sucesso via DELETE', async () => {
        global.fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => mockMessages
        });

        const { result } = renderHook(() =>
            useQuickMessagesTab({ user: { id: 1, client_id: 10 }, activeClient: null })
        );

        const item = mockMessages[0];
        act(() => {
            result.current.setItemToDelete(item);
        });

        global.fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ success: true })
        });
        global.fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => mockMessages.slice(1)
        });

        await act(async () => {
            await result.current.handleDelete();
        });

        expect(toast.success).toHaveBeenCalledWith('Mensagem rápida excluída com sucesso!');
        expect(result.current.itemToDelete).toBeNull();
    });
});
