import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { renderLinkedText } from './linkifyText';

describe('renderLinkedText utility', () => {
    it('retorna texto original quando não há links', () => {
        const text = 'Olá, tudo bem? Mensagem sem link.';
        const result = renderLinkedText(text);
        expect(result).toEqual([text]);
    });

    it('identifica e transforma URLs com https:// em links clicáveis', () => {
        const text = 'Acesse nosso portal em https://zapvoice.com.br para testar.';
        render(<div>{renderLinkedText(text)}</div>);

        const link = screen.getByRole('link', { name: 'https://zapvoice.com.br' });
        expect(link).toBeDefined();
        expect(link.getAttribute('href')).toBe('https://zapvoice.com.br');
        expect(link.getAttribute('target')).toBe('_blank');
        expect(link.getAttribute('rel')).toBe('noopener noreferrer');
    });

    it('identifica e transforma URLs com www. adicionando https:// ao href', () => {
        const text = 'Veja no site www.google.com.br agora mesmo.';
        render(<div>{renderLinkedText(text)}</div>);

        const link = screen.getByRole('link', { name: 'www.google.com.br' });
        expect(link).toBeDefined();
        expect(link.getAttribute('href')).toBe('https://www.google.com.br');
    });

    it('ignora pontuações no final da URL', () => {
        const text = 'Consulte o link www.google.com.br, por favor!';
        render(<div>{renderLinkedText(text)}</div>);

        const link = screen.getByRole('link', { name: 'www.google.com.br' });
        expect(link).toBeDefined();
        expect(link.getAttribute('href')).toBe('https://www.google.com.br');
    });

    it('lida com múltiplos links no mesmo texto', () => {
        const text = 'Primeiro link https://site1.com e segundo www.site2.com.br aqui.';
        render(<div>{renderLinkedText(text)}</div>);

        const links = screen.getAllByRole('link');
        expect(links.length).toBe(2);
        expect(links[0].getAttribute('href')).toBe('https://site1.com');
        expect(links[1].getAttribute('href')).toBe('https://www.site2.com.br');
    });
});
