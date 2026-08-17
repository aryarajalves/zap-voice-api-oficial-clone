import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { renderConvoMentions, filterConvosForMention } from './convoMentionUtils';

describe('convoMentionUtils', () => {
    describe('filterConvosForMention', () => {
        const mockConvos = [
            { id: 102, contact_name: 'João Silva', phone: '5511999998888' },
            { id: 101, contact_name: 'Aryaraj Alves', phone: '5585996123586' },
            { id: 103, contact_name: 'Maria Santos', phone: '5521977776666' }
        ];

        it('retorna os contatos ordenados em ordem alfabética (A-Z)', () => {
            const result = filterConvosForMention(mockConvos, '');
            expect(result.length).toBe(3);
            expect(result[0].contact_name).toBe('Aryaraj Alves');
            expect(result[1].contact_name).toBe('João Silva');
            expect(result[2].contact_name).toBe('Maria Santos');
        });

        it('filtra por nome do contato ignorando maiúsculas/minúsculas', () => {
            const result = filterConvosForMention(mockConvos, 'arya');
            expect(result.length).toBe(1);
            expect(result[0].id).toBe(101);
        });

        it('filtra por telefone', () => {
            const result = filterConvosForMention(mockConvos, '99999');
            expect(result.length).toBe(1);
            expect(result[0].contact_name).toBe('João Silva');
        });

        it('filtra por ID da conversa', () => {
            const result = filterConvosForMention(mockConvos, '103');
            expect(result.length).toBe(1);
            expect(result[0].contact_name).toBe('Maria Santos');
        });
    });

    describe('renderConvoMentions', () => {
        it('retorna texto simples sem alterações se não houver menção', () => {
            const text = 'Esta é uma anotação simples.';
            const { container } = render(<div>{renderConvoMentions(text)}</div>);
            expect(container.textContent).toBe(text);
        });

        it('renderiza o chip de menção @[Aryaraj #101] e dispara onSelectConvo ao clicar', () => {
            const onSelect = vi.fn();
            const text = 'Verificar com @[Aryaraj #101] sobre a proposta';
            
            render(<div>{renderConvoMentions(text, onSelect)}</div>);

            const chip = screen.getByRole('button', { name: /Aryaraj/i });
            expect(chip).toBeDefined();
            expect(screen.getByText('#101')).toBeDefined();

            fireEvent.click(chip);
            expect(onSelect).toHaveBeenCalledWith(101);
        });

        it('preserva links externos e menções na mesma anotação', () => {
            const text = 'Acesse https://google.com e veja com @[Maria #103]';
            const { container } = render(<div>{renderConvoMentions(text)}</div>);

            const link = container.querySelector('a');
            expect(link).toBeDefined();
            expect(link.getAttribute('href')).toBe('https://google.com');

            const chip = screen.getByRole('button', { name: /Maria/i });
            expect(chip).toBeDefined();
        });
    });
});
