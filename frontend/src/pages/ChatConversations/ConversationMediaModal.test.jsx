import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ConversationMediaModal from './components/ChatContactSidebar/ConversationMediaModal';
import ContactMediaSection from './components/ChatContactSidebar/ContactMediaSection';

describe('ContactMediaSection e ConversationMediaModal', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    const mockMediaData = {
        total_media: 2,
        total_docs: 1,
        total_links: 1,
        total_notes: 2,
        total_all: 6,
        media: [
            { id: 1, type: 'image', url: 'https://example.com/foto1.jpg', caption: 'Foto 1', timestamp: '2026-08-17T10:00:00Z' },
            { id: 2, type: 'video', url: 'https://example.com/video1.mp4', caption: 'Vídeo 1', timestamp: '2026-08-17T10:05:00Z' }
        ],
        docs: [
            { id: 3, type: 'document', url: 'https://example.com/contrato.pdf', filename: 'contrato.pdf', timestamp: '2026-08-17T10:10:00Z' }
        ],
        links: [
            { id: '4-0', url: 'https://zapvoice.com.br', preview_text: 'Site da ZapVoice', timestamp: '2026-08-17T10:15:00Z' }
        ],
        notes: [
            { id: 10, message_id: 10, content: 'Cliente solicitou proposta customizada para 10 usuários.', timestamp: '2026-08-17T10:20:00Z', sender_type: 'system' },
            { id: 11, message_id: 11, content: 'Retornar ligação na sexta-feira às 14h.', timestamp: '2026-08-17T10:25:00Z', sender_type: 'system' }
        ]
    };

    it('ContactMediaSection renderiza título e contagem total de itens incluindo notas', () => {
        const onOpen = vi.fn();
        render(
            <ContactMediaSection
                mediaData={mockMediaData}
                isLoadingMedia={false}
                onOpenMediaModal={onOpen}
                activeClientId={1}
            />
        );

        expect(screen.getByText('Mídia, links e docs')).toBeInTheDocument();
        expect(screen.getByText('6')).toBeInTheDocument();

        fireEvent.click(screen.getByText('Mídia, links e docs'));
        expect(onOpen).toHaveBeenCalledTimes(1);
    });

    it('ConversationMediaModal não renderiza se isOpen=false', () => {
        const { container } = render(
            <ConversationMediaModal
                isOpen={false}
                onClose={vi.fn()}
                contactName="Aryaraj"
                mediaData={mockMediaData}
                isLoading={false}
                activeClientId={1}
            />
        );
        expect(container.firstChild).toBeNull();
    });

    it('ConversationMediaModal renderiza abas e permite alternar entre Mídia, Documentos, Links e Anotações', () => {
        render(
            <ConversationMediaModal
                isOpen={true}
                onClose={vi.fn()}
                contactName="Aryaraj"
                mediaData={mockMediaData}
                isLoading={false}
                activeClientId={1}
            />
        );

        // Abas presentes
        expect(screen.getByText('Mídia')).toBeInTheDocument();
        expect(screen.getByText('Documentos')).toBeInTheDocument();
        expect(screen.getByText('Links')).toBeInTheDocument();
        expect(screen.getByText('Anotações')).toBeInTheDocument();

        // Mídia renderizada
        const img = screen.getByAltText('Foto 1');
        expect(img).toBeInTheDocument();

        // Clica na aba Documentos
        fireEvent.click(screen.getByRole('button', { name: /Documentos/i }));
        expect(screen.getByText('contrato.pdf')).toBeInTheDocument();

        // Clica na aba Links
        fireEvent.click(screen.getByRole('button', { name: /Links/i }));
        expect(screen.getByText('https://zapvoice.com.br')).toBeInTheDocument();
        expect(screen.getByText('Site da ZapVoice')).toBeInTheDocument();

        // Clica na aba Anotações
        fireEvent.click(screen.getByRole('button', { name: /Anotações/i }));
        expect(screen.getByText('Cliente solicitou proposta customizada para 10 usuários.')).toBeInTheDocument();
        expect(screen.getByText('Retornar ligação na sexta-feira às 14h.')).toBeInTheDocument();
        expect(screen.getAllByText('Anotação Privada').length).toBe(2);
    });

    it('ConversationMediaModal exibe estado vazio para anotações se lista for vazia', () => {
        render(
            <ConversationMediaModal
                isOpen={true}
                onClose={vi.fn()}
                contactName="Aryaraj"
                mediaData={{
                    ...mockMediaData,
                    total_notes: 0,
                    notes: []
                }}
                isLoading={false}
                activeClientId={1}
            />
        );

        // Clica na aba Anotações
        fireEvent.click(screen.getByRole('button', { name: /Anotações/i }));
        expect(screen.getByText('Nenhuma anotação privada nesta conversa')).toBeInTheDocument();
    });

    it('ConversationMediaModal permite copiar texto de anotação privada', () => {
        // Mock clipboard writeText
        const writeTextMock = vi.fn().mockResolvedValue(undefined);
        Object.assign(navigator, {
            clipboard: {
                writeText: writeTextMock
            }
        });

        render(
            <ConversationMediaModal
                isOpen={true}
                onClose={vi.fn()}
                contactName="Aryaraj"
                mediaData={mockMediaData}
                isLoading={false}
                activeClientId={1}
            />
        );

        fireEvent.click(screen.getByRole('button', { name: /Anotações/i }));

        const copyButtons = screen.getAllByTitle('Copiar anotação');
        expect(copyButtons.length).toBe(2);

        fireEvent.click(copyButtons[0]);
        expect(writeTextMock).toHaveBeenCalledWith('Cliente solicitou proposta customizada para 10 usuários.');
    });

    it('ConversationMediaModal fecha ao clicar no botão de fechar e NÃO fecha ao clicar no backdrop', () => {
        const onClose = vi.fn();
        const { container } = render(
            <ConversationMediaModal
                isOpen={true}
                onClose={onClose}
                contactName="Aryaraj"
                mediaData={mockMediaData}
                isLoading={false}
                activeClientId={1}
            />
        );

        // Clicar no backdrop não deve chamar onClose
        const backdrop = container.querySelector('.bg-black\\/80');
        expect(backdrop).toBeInTheDocument();
        fireEvent.click(backdrop);
        expect(onClose).not.toHaveBeenCalled();

        // Clicar no botão fechar deve chamar onClose
        const closeBtn = screen.getByTitle('Fechar');
        fireEvent.click(closeBtn);
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('ConversationMediaModal aplica paginação de no máximo 20 itens por página em anotações', () => {
        const manyNotes = Array.from({ length: 25 }, (_, i) => ({
            id: i + 1,
            message_id: i + 1,
            content: `Anotação de teste #${i + 1}`,
            timestamp: '2026-08-17T10:00:00Z',
            sender_type: 'system'
        }));

        render(
            <ConversationMediaModal
                isOpen={true}
                onClose={vi.fn()}
                contactName="Aryaraj"
                mediaData={{
                    total_media: 0,
                    total_docs: 0,
                    total_links: 0,
                    total_notes: 25,
                    total_all: 25,
                    media: [],
                    docs: [],
                    links: [],
                    notes: manyNotes
                }}
                isLoading={false}
                activeClientId={1}
            />
        );

        fireEvent.click(screen.getByRole('button', { name: /Anotações/i }));

        // Página 1: deve mostrar item 1 e 20, mas NÃO o 21
        expect(screen.getByText('Anotação de teste #1')).toBeInTheDocument();
        expect(screen.getByText('Anotação de teste #20')).toBeInTheDocument();
        expect(screen.queryByText('Anotação de teste #21')).not.toBeInTheDocument();

        // Indicador de paginação
        expect(screen.getByText(/Mostrando/i)).toBeInTheDocument();
        expect(screen.getByText('1 / 2')).toBeInTheDocument();

        // Avançar para próxima página
        const nextBtn = screen.getByTitle('Próxima Página');
        fireEvent.click(nextBtn);

        // Página 2: deve mostrar item 21 a 25 e não o item 1
        expect(screen.queryByText('Anotação de teste #1')).not.toBeInTheDocument();
        expect(screen.getByText('Anotação de teste #21')).toBeInTheDocument();
        expect(screen.getByText('Anotação de teste #25')).toBeInTheDocument();
        expect(screen.getByText('2 / 2')).toBeInTheDocument();
    });

    it('ConversationMediaModal renderiza botão Excluir para anotações e abre modal de confirmação ao clicar', () => {
        const onDeleteNote = vi.fn();
        render(
            <ConversationMediaModal
                isOpen={true}
                onClose={vi.fn()}
                contactName="Aryaraj"
                mediaData={mockMediaData}
                isLoading={false}
                activeClientId={1}
                onDeleteNote={onDeleteNote}
            />
        );

        fireEvent.click(screen.getByRole('button', { name: /Anotações/i }));

        const deleteButtons = screen.getAllByTitle('Excluir anotação');
        expect(deleteButtons.length).toBe(2);

        // Modal de confirmação não deve estar visível antes do clique
        expect(screen.queryByText('Excluir Anotação Privada')).not.toBeInTheDocument();

        // Clica no botão de excluir da primeira anotação
        fireEvent.click(deleteButtons[0]);

        // Modal de confirmação deve aparecer
        expect(screen.getByText('Excluir Anotação Privada')).toBeInTheDocument();
        expect(screen.getByText(/Tem certeza que deseja excluir esta anotação privada\?/i)).toBeInTheDocument();

        // Clica em Cancelar
        const cancelBtn = screen.getByRole('button', { name: 'Cancelar' });
        fireEvent.click(cancelBtn);

        // Modal de confirmação deve fechar
        expect(screen.queryByText('Excluir Anotação Privada')).not.toBeInTheDocument();
        expect(onDeleteNote).not.toHaveBeenCalled();
    });

    it('ConversationMediaModal chama onDeleteNote ao confirmar exclusão no popup', async () => {
        const onDeleteNote = vi.fn().mockResolvedValue(undefined);
        render(
            <ConversationMediaModal
                isOpen={true}
                onClose={vi.fn()}
                contactName="Aryaraj"
                mediaData={mockMediaData}
                isLoading={false}
                activeClientId={1}
                onDeleteNote={onDeleteNote}
            />
        );

        fireEvent.click(screen.getByRole('button', { name: /Anotações/i }));

        const deleteButtons = screen.getAllByTitle('Excluir anotação');
        fireEvent.click(deleteButtons[1]); // Anotação com id 11

        // Confirma a exclusão no modal (botão do ConfirmModal não possui title 'Excluir anotação')
        const confirmButtons = screen.getAllByRole('button', { name: 'Excluir' });
        const confirmBtn = confirmButtons.find(btn => btn.getAttribute('title') !== 'Excluir anotação');
        fireEvent.click(confirmBtn);

        expect(onDeleteNote).toHaveBeenCalledWith(11);
    });
});
