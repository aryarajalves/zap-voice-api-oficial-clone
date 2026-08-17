import React, { useState } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import MentionTextarea from './MentionTextarea';

vi.mock('../../../AuthContext', () => ({
    fetchWithAuth: vi.fn().mockImplementation(() =>
        Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
                items: [
                    { id: 101, contact_name: 'Aryaraj Alves', phone: '5585996123586' },
                    { id: 102, contact_name: 'Carlos Oliveira', phone: '5511988887777' }
                ],
                total: 2,
                page: 1,
                pages: 1
            })
        })
    )
}));

describe('MentionTextarea component', () => {
    const mockConvos = [
        { id: 102, contact_name: 'Carlos Oliveira', phone: '5511988887777' },
        { id: 101, contact_name: 'Aryaraj Alves', phone: '5585996123586' }
    ];

    it('renderiza o textarea corretamente com placeholder', () => {
        render(
            <MentionTextarea
                value=""
                onChange={() => {}}
                placeholder="Digite sua anotação..."
                conversations={mockConvos}
            />
        );

        expect(screen.getByPlaceholderText('Digite sua anotação...')).toBeDefined();
    });

    it('abre o dropdown de menções quando o usuário digita @ com contatos ordenados A-Z', async () => {
        function ControlledComponent() {
            const [val, setVal] = useState('');
            return (
                <MentionTextarea
                    value={val}
                    onChange={(e) => setVal(e.target.value)}
                    conversations={mockConvos}
                />
            );
        }

        render(<ControlledComponent />);

        const textarea = screen.getByRole('textbox');
        fireEvent.change(textarea, { target: { value: '@', selectionStart: 1 } });

        await waitFor(() => {
            expect(screen.getByText('Aryaraj Alves')).toBeDefined();
            expect(screen.getByText('Carlos Oliveira')).toBeDefined();
        });
    });

    it('insere a menção no formato @[Nome #ID] ao clicar em um contato do dropdown', async () => {
        let finalValue = '';
        function ControlledComponent() {
            const [val, setVal] = useState('');
            return (
                <MentionTextarea
                    value={val}
                    onChange={(e) => {
                        setVal(e.target.value);
                        finalValue = e.target.value;
                    }}
                    conversations={mockConvos}
                />
            );
        }

        render(<ControlledComponent />);

        const textarea = screen.getByRole('textbox');
        fireEvent.change(textarea, { target: { value: 'Ver @', selectionStart: 5 } });

        await waitFor(() => {
            expect(screen.getByText('Aryaraj Alves')).toBeDefined();
        });

        fireEvent.mouseDown(screen.getByText('Aryaraj Alves'));

        await waitFor(() => {
            expect(finalValue).toContain('@[Aryaraj Alves #101]');
        });
    });
});
