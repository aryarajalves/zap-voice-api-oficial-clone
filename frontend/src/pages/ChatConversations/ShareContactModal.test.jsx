import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ShareContactModal from './components/ShareContactModal';
import * as authContext from '../../AuthContext';
import { toast } from 'react-hot-toast';

vi.mock('../../AuthContext', () => ({
    fetchWithAuth: vi.fn(),
    useAuth: vi.fn(() => ({ activeClient: { id: 1 } }))
}));

vi.mock('react-hot-toast', () => ({
    toast: {
        loading: vi.fn(() => 'loading-id'),
        success: vi.fn(),
        error: vi.fn(),
    }
}));

describe('ShareContactModal', () => {
    const mockContactToShare = {
        id: 10,
        contact_name: 'Luana Ribeiro',
        phone: '554431421236'
    };

    const mockConversations = [
        { id: 10, contact_name: 'Luana Ribeiro', phone: '554431421236' }, // próprio contato
        { id: 20, contact_name: 'Aryaraj Fernandes', phone: '5585996123586' },
        { id: 30, contact_name: 'Astrowake Astrologia', phone: '5511999998888' },
        { id: 40, contact_name: 'Caio Mkt', phone: '554792761017' }
    ];

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('não renderiza nada se isOpen for false', () => {
        const { container } = render(
            <ShareContactModal
                isOpen={false}
                onClose={vi.fn()}
                contactToShare={mockContactToShare}
                conversations={mockConversations}
                activeClientId={1}
            />
        );
        expect(container.firstChild).toBeNull();
    });

    it('renderiza o modal, título e o contato a ser compartilhado', () => {
        render(
            <ShareContactModal
                isOpen={true}
                onClose={vi.fn()}
                contactToShare={mockContactToShare}
                conversations={mockConversations}
                activeClientId={1}
            />
        );

        expect(screen.getByText('Enviar contatos')).toBeInTheDocument();
        expect(screen.getByText('Luana Ribeiro')).toBeInTheDocument();
        expect(screen.getByText('554431421236')).toBeInTheDocument();
        // Não deve listar o próprio contato nos destinatários
        expect(screen.queryByText('Aryaraj Fernandes')).toBeInTheDocument();
        expect(screen.queryByText('Astrowake Astrologia')).toBeInTheDocument();
        expect(screen.queryByText('Caio Mkt')).toBeInTheDocument();
    });

    it('filtra contatos com base na busca digitada', () => {
        render(
            <ShareContactModal
                isOpen={true}
                onClose={vi.fn()}
                contactToShare={mockContactToShare}
                conversations={mockConversations}
                activeClientId={1}
            />
        );

        const searchInput = screen.getByPlaceholderText('Pesquisar nome, número ou @nomedeusuário');
        fireEvent.change(searchInput, { target: { value: 'Astrowake' } });

        expect(screen.getByText(/Astrowake/)).toBeInTheDocument();
        expect(screen.queryByText(/Aryaraj Fernandes/)).not.toBeInTheDocument();
        expect(screen.queryByText(/Caio Mkt/)).not.toBeInTheDocument();
    });

    it('seleciona e desseleciona contatos e atualiza o contador do botão', () => {
        render(
            <ShareContactModal
                isOpen={true}
                onClose={vi.fn()}
                contactToShare={mockContactToShare}
                conversations={mockConversations}
                activeClientId={1}
            />
        );

        const sendBtn = screen.getByRole('button', { name: /enviar contato/i });
        expect(sendBtn).toBeDisabled();

        // Clica no contato Aryaraj Fernandes
        const aryarajCard = screen.getByText('Aryaraj Fernandes').closest('div[class*="cursor-pointer"]');
        fireEvent.click(aryarajCard);

        expect(screen.getByText('1 destinatário(s) selecionado(s)')).toBeInTheDocument();
        expect(sendBtn).not.toBeDisabled();

        // Clica em Caio Mkt
        const caioCard = screen.getByText('Caio Mkt').closest('div[class*="cursor-pointer"]');
        fireEvent.click(caioCard);

        expect(screen.getByText('2 destinatário(s) selecionado(s)')).toBeInTheDocument();

        // Desseleciona Aryaraj
        fireEvent.click(aryarajCard);
        expect(screen.getByText('1 destinatário(s) selecionado(s)')).toBeInTheDocument();
    });

    it('dispara a requisição de compartilhamento com sucesso', async () => {
        authContext.fetchWithAuth.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ success: true, sent_count: 1, messages: [{ id: 101 }] })
        });

        const onClose = vi.fn();
        const onSuccess = vi.fn();

        render(
            <ShareContactModal
                isOpen={true}
                onClose={onClose}
                contactToShare={mockContactToShare}
                conversations={mockConversations}
                activeClientId={1}
                onSuccess={onSuccess}
            />
        );

        const aryarajCard = screen.getByText('Aryaraj Fernandes').closest('div[class*="cursor-pointer"]');
        fireEvent.click(aryarajCard);

        const sendBtn = screen.getByRole('button', { name: /enviar contato/i });
        fireEvent.click(sendBtn);

        await waitFor(() => {
            expect(authContext.fetchWithAuth).toHaveBeenCalledWith(
                expect.stringContaining('/chat/conversations/share-contact'),
                expect.objectContaining({
                    method: 'POST',
                    body: JSON.stringify({
                        target_conversation_ids: [20],
                        target_contacts: [],
                        contact_name: 'Luana Ribeiro',
                        contact_phone: '554431421236',
                        contact_id: 10
                    })
                }),
                1
            );
            expect(toast.success).toHaveBeenCalledWith(expect.stringContaining('sucesso para 1 conversa'), expect.anything());
            expect(onSuccess).toHaveBeenCalled();
            expect(onClose).toHaveBeenCalled();
        });
    });
});
