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
        total_all: 4,
        media: [
            { id: 1, type: 'image', url: 'https://example.com/foto1.jpg', caption: 'Foto 1', timestamp: '2026-08-17T10:00:00Z' },
            { id: 2, type: 'video', url: 'https://example.com/video1.mp4', caption: 'Vídeo 1', timestamp: '2026-08-17T10:05:00Z' }
        ],
        docs: [
            { id: 3, type: 'document', url: 'https://example.com/contrato.pdf', filename: 'contrato.pdf', timestamp: '2026-08-17T10:10:00Z' }
        ],
        links: [
            { id: '4-0', url: 'https://zapvoice.com.br', preview_text: 'Site da ZapVoice', timestamp: '2026-08-17T10:15:00Z' }
        ]
    };

    it('ContactMediaSection renderiza título e contagem total de itens', () => {
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
        expect(screen.getByText('4')).toBeInTheDocument();

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

    it('ConversationMediaModal renderiza abas e permite alternar entre Mídia, Documentos e Links', () => {
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

        // Aba Mídia inicial
        expect(screen.getByText('Mídia')).toBeInTheDocument();
        expect(screen.getByText('Documentos')).toBeInTheDocument();
        expect(screen.getByText('Links')).toBeInTheDocument();

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

    it('ConversationMediaModal aplica paginação de no máximo 20 itens por página', () => {
        // Gerar 25 itens de mídia para testar a paginação
        const manyMedia = Array.from({ length: 25 }, (_, i) => ({
            id: i + 1,
            type: 'image',
            url: `https://example.com/foto_${i + 1}.jpg`,
            caption: `Foto #${i + 1}`,
            timestamp: '2026-08-17T10:00:00Z'
        }));

        render(
            <ConversationMediaModal
                isOpen={true}
                onClose={vi.fn()}
                contactName="Aryaraj"
                mediaData={{
                    total_media: 25,
                    total_docs: 0,
                    total_links: 0,
                    total_all: 25,
                    media: manyMedia,
                    docs: [],
                    links: []
                }}
                isLoading={false}
                activeClientId={1}
            />
        );

        // Página 1: deve mostrar item 1 e 20, mas NÃO o 21
        expect(screen.getByAltText('Foto #1')).toBeInTheDocument();
        expect(screen.getByAltText('Foto #20')).toBeInTheDocument();
        expect(screen.queryByAltText('Foto #21')).not.toBeInTheDocument();

        // Indicador de paginação
        expect(screen.getByText(/Mostrando/i)).toBeInTheDocument();
        expect(screen.getByText('1 / 2')).toBeInTheDocument();

        // Avançar para próxima página
        const nextBtn = screen.getByTitle('Próxima Página');
        fireEvent.click(nextBtn);

        // Página 2: deve mostrar item 21 a 25 e não o item 1
        expect(screen.queryByAltText('Foto #1')).not.toBeInTheDocument();
        expect(screen.getByAltText('Foto #21')).toBeInTheDocument();
        expect(screen.getByAltText('Foto #25')).toBeInTheDocument();
        expect(screen.getByText('2 / 2')).toBeInTheDocument();
    });
});
