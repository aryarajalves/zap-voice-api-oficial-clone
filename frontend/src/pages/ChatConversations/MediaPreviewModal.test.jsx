import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import MediaPreviewModal from './MediaPreviewModal';

vi.mock('react-icons/fi', () => ({
    FiX: () => <span data-testid="icon-x" />,
    FiSend: () => <span data-testid="icon-send" />,
    FiRefreshCw: () => <span data-testid="icon-refresh" />,
    FiFileText: () => <span data-testid="icon-file-text" />,
    FiMusic: () => <span data-testid="icon-music" />,
}));

describe('MediaPreviewModal', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('não renderiza quando mediaPreview é nulo', () => {
        const { container } = render(<MediaPreviewModal mediaPreview={null} />);
        expect(container.firstChild).toBeNull();
    });

    it('renderiza preview de imagem corretamente', () => {
        const mediaPreview = {
            messageType: 'image',
            localUrl: 'blob:http://localhost/fake-img',
            file: new File(['fake'], 'foto.jpg', { type: 'image/jpeg' }),
        };

        render(
            <MediaPreviewModal
                mediaPreview={mediaPreview}
                previewCaption="Minha foto"
                setPreviewCaption={vi.fn()}
                isSendingMedia={false}
                onClose={vi.fn()}
                onSend={vi.fn()}
            />
        );

        expect(screen.getByText('🖼️ Enviar Imagem')).toBeInTheDocument();
        expect(screen.getByAltText('Preview')).toHaveAttribute('src', 'blob:http://localhost/fake-img');
        expect(screen.getByDisplayValue('Minha foto')).toBeInTheDocument();
    });

    it('renderiza preview de documento/PDF corretamente com tamanho', () => {
        const mediaPreview = {
            messageType: 'document',
            localUrl: 'blob:http://localhost/fake-pdf',
            file: new File([new ArrayBuffer(1024 * 1024 * 2)], 'documento.pdf', { type: 'application/pdf' }),
        };

        render(
            <MediaPreviewModal
                mediaPreview={mediaPreview}
                previewCaption=""
                setPreviewCaption={vi.fn()}
                isSendingMedia={false}
                onClose={vi.fn()}
                onSend={vi.fn()}
            />
        );

        expect(screen.getByText('📄 Enviar Documento')).toBeInTheDocument();
        expect(screen.getByText('documento.pdf')).toBeInTheDocument();
        expect(screen.getByText('2.00 MB')).toBeInTheDocument();
    });

    it('renderiza preview de áudio corretamente com player', () => {
        const mediaPreview = {
            messageType: 'audio',
            localUrl: 'blob:http://localhost/fake-audio',
            file: new File(['fake'], 'audio.mp3', { type: 'audio/mp3' }),
        };

        render(
            <MediaPreviewModal
                mediaPreview={mediaPreview}
                previewCaption="Áudio explicativo"
                setPreviewCaption={vi.fn()}
                isSendingMedia={false}
                onClose={vi.fn()}
                onSend={vi.fn()}
            />
        );

        expect(screen.getByText('🎵 Enviar Áudio')).toBeInTheDocument();
        expect(screen.getByText('audio.mp3')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Áudio explicativo')).toBeInTheDocument();
    });

    it('chama onSend ao clicar no botão de enviar', () => {
        const onSend = vi.fn();
        const mediaPreview = {
            messageType: 'image',
            localUrl: 'blob:http://localhost/fake-img',
            file: new File(['fake'], 'foto.jpg', { type: 'image/jpeg' }),
        };

        render(
            <MediaPreviewModal
                mediaPreview={mediaPreview}
                previewCaption="Legenda"
                setPreviewCaption={vi.fn()}
                isSendingMedia={false}
                onClose={vi.fn()}
                onSend={onSend}
            />
        );

        fireEvent.click(screen.getByRole('button', { name: /Enviar/i }));
        expect(onSend).toHaveBeenCalledTimes(1);
    });
});
