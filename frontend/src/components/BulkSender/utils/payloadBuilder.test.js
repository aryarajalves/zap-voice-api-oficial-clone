import { describe, it, expect } from 'vitest';
import { buildComponentsPayload } from './payloadBuilder';

describe('buildComponentsPayload', () => {
    it('should format text components correctly', () => {
        const template = {
            components: [
                { type: 'BODY', text: 'Olá {{1}}, seu código é {{2}}.' }
            ]
        };
        const params = {
            'BODY_0': 'Maria',
            'BODY_1': '1234'
        };
        const result = buildComponentsPayload(template, params);
        expect(result).toEqual([
            {
                type: 'body',
                parameters: [
                    { type: 'text', text: 'Maria' },
                    { type: 'text', text: '1234' }
                ]
            }
        ]);
    });

    it('should handle media headers', () => {
        const template = {
            components: [
                { type: 'HEADER', format: 'IMAGE' }
            ]
        };
        const params = {
            'HEADER_0': 'https://example.com/image.png'
        };
        const result = buildComponentsPayload(template, params);
        expect(result).toEqual([
            {
                type: 'header',
                parameters: [
                    { type: 'image', image: { link: 'https://example.com/image.png' } }
                ]
            }
        ]);
    });

    it('should handle video headers', () => {
        const template = {
            components: [
                { type: 'HEADER', format: 'VIDEO' }
            ]
        };
        const params = {
            'HEADER_0': 'https://example.com/video.mp4'
        };
        const result = buildComponentsPayload(template, params);
        expect(result).toEqual([
            {
                type: 'header',
                parameters: [
                    { type: 'video', video: { link: 'https://example.com/video.mp4' } }
                ]
            }
        ]);
    });

    it('should handle document headers', () => {
        const template = {
            components: [
                { type: 'HEADER', format: 'DOCUMENT' }
            ]
        };
        const params = {
            'HEADER_0': 'https://example.com/doc.pdf'
        };
        const result = buildComponentsPayload(template, params);
        expect(result).toEqual([
            {
                type: 'header',
                parameters: [
                    { type: 'document', document: { link: 'https://example.com/doc.pdf' } }
                ]
            }
        ]);
    });

    it('should omit header component when HEADER_0 is empty', () => {
        const template = {
            components: [
                { type: 'HEADER', format: 'IMAGE' },
                { type: 'BODY', text: 'Olá {{1}}.' }
            ]
        };
        const params = {
            'HEADER_0': '',
            'BODY_0': 'Maria'
        };
        const result = buildComponentsPayload(template, params);
        // Header sem link não deve ser incluído no payload
        expect(result).toEqual([
            {
                type: 'body',
                parameters: [{ type: 'text', text: 'Maria' }]
            }
        ]);
    });
    it('should handle buttons with variables', () => {
        const template = {
            components: [
                {
                    type: 'BUTTONS',
                    buttons: [
                        { type: 'URL', url: 'https://example.com/{{1}}' }
                    ]
                }
            ]
        };
        const params = {
            'BUTTONS_0': 'promo123'
        };
        const result = buildComponentsPayload(template, params);
        expect(result).toEqual([
            {
                type: 'button',
                sub_type: 'url',
                index: 0,
                parameters: [{ type: 'text', text: 'promo123' }]
            }
        ]);
    });
});
