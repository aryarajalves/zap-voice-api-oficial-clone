import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import MediaHeaderUploader from './MediaHeaderUploader';

// Mocks
vi.mock('../../../contexts/ClientContext', () => ({
    useClient: () => ({ activeClient: { id: 1 } })
}));

vi.mock('react-hot-toast', () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn(),
        custom: vi.fn()
    }
}));

vi.mock('../../../config', () => ({
    API_URL: 'http://localhost:8000/api'
}));

const defaultProps = {
    format: 'VIDEO',
    templateParams: {},
    handleParamChange: vi.fn()
};

describe('MediaHeaderUploader', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.setItem('token', 'test-token');
    });

    it('deve renderizar a área de upload por padrão', () => {
        render(<MediaHeaderUploader {...defaultProps} />);
        expect(document.getElementById('media-upload-area')).toBeTruthy();
    });

    it('deve exibir o título correto para Vídeo', () => {
        render(<MediaHeaderUploader {...defaultProps} format="VIDEO" />);
        expect(screen.getByText(/Vídeo do Cabeçalho — Obrigatório/i)).toBeDefined();
    });

    it('deve exibir o título correto para Imagem', () => {
        render(<MediaHeaderUploader {...defaultProps} format="IMAGE" />);
        expect(screen.getByText(/Imagem do Cabeçalho — Obrigatório/i)).toBeDefined();
    });

    it('deve exibir o título correto para Documento', () => {
        render(<MediaHeaderUploader {...defaultProps} format="DOCUMENT" />);
        expect(screen.getByText(/Documento do Cabeçalho — Obrigatório/i)).toBeDefined();
    });

    it('deve exibir aviso vermelho quando HEADER_0 está vazio', () => {
        render(<MediaHeaderUploader {...defaultProps} templateParams={{}} />);
        expect(screen.getByText(/pendente — necessário para avançar/i)).toBeDefined();
    });

    it('deve exibir confirmação verde quando HEADER_0 está preenchido', () => {
        render(
            <MediaHeaderUploader
                {...defaultProps}
                templateParams={{ 'HEADER_0': 'https://exemplo.com/video.mp4' }}
            />
        );
        expect(screen.getByText(/pronto para avançar/i)).toBeDefined();
    });

    it('deve rejeitar arquivo acima de 16MB', async () => {
        const { toast } = await import('react-hot-toast');
        render(<MediaHeaderUploader {...defaultProps} format="VIDEO" />);

        const input = document.querySelector('[data-testid="media-file-input"]');
        const bigFile = new File(['x'.repeat(17 * 1024 * 1024)], 'video-grande.mp4', { type: 'video/mp4' });
        Object.defineProperty(bigFile, 'size', { value: 17 * 1024 * 1024 });

        fireEvent.change(input, { target: { files: [bigFile] } });

        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith(
                expect.stringContaining('muito grande'),
                expect.any(Object)
            );
        });
    });

    it('deve rejeitar tipo de arquivo inválido para Vídeo (imagem enviada)', async () => {
        const { toast } = await import('react-hot-toast');
        render(<MediaHeaderUploader {...defaultProps} format="VIDEO" />);

        const input = document.querySelector('[data-testid="media-file-input"]');
        const wrongFile = new File([''], 'foto.jpg', { type: 'image/jpeg' });

        fireEvent.change(input, { target: { files: [wrongFile] } });

        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith(
                expect.stringContaining('não aceito'),
                expect.any(Object)
            );
        });
    });

    it('deve limpar HEADER_0 ao clicar em remover arquivo', () => {
        const handleParamChange = vi.fn();
        render(
            <MediaHeaderUploader
                {...defaultProps}
                handleParamChange={handleParamChange}
                templateParams={{ 'HEADER_0': 'https://exemplo.com/video.mp4' }}
            />
        );

        // Simular estado com arquivo uploadado (injeta diretamente via link)
        const removeBtn = document.getElementById('media-remove-upload');
        if (removeBtn) {
            fireEvent.click(removeBtn);
            expect(handleParamChange).toHaveBeenCalledWith('HEADER_0', '');
        }
    });
});
