import { describe, it, expect, beforeEach, vi } from 'vitest';
import { resolveMediaUrl } from './mediaUrlResolver';

describe('resolveMediaUrl utility', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it('retorna string vazia para entrada nula ou inválida', () => {
        expect(resolveMediaUrl(null)).toBe('');
        expect(resolveMediaUrl(undefined)).toBe('');
        expect(resolveMediaUrl('')).toBe('');
    });

    it('retorna a URL original se for http/https externa', () => {
        expect(resolveMediaUrl('https://example.com/imagem.png')).toBe('https://example.com/imagem.png');
        expect(resolveMediaUrl('http://example.com/imagem.png')).toBe('http://example.com/imagem.png');
    });

    it('resolve caminhos /static com a URL base do backend', () => {
        const resolved = resolveMediaUrl('/static/uploads/foto123.jpg');
        expect(resolved).toContain('/static/uploads/foto123.jpg');
        expect(resolved).toMatch(/^https?:\/\//);
    });

    it('formata chaves com prefixo minio/whatsapp para endpoint de mídia com token e client_id', () => {
        localStorage.setItem('token', 'fake-jwt-token');
        const resolved = resolveMediaUrl('minio:whatsapp/anexo.jpg', 42);
        expect(resolved).toContain('/chat/media/whatsapp%2Fanexo.jpg');
        expect(resolved).toContain('token=fake-jwt-token');
        expect(resolved).toContain('client_id=42');
    });

    it('lida com IDs diretos de mídia', () => {
        localStorage.setItem('token', 'token123');
        const resolved = resolveMediaUrl('987654321', 10);
        expect(resolved).toContain('/chat/media/987654321');
        expect(resolved).toContain('token=token123');
        expect(resolved).toContain('client_id=10');
    });
});
