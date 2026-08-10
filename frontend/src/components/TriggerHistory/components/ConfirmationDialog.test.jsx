import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ConfirmationDialog from './ConfirmationDialog';

describe('ConfirmationDialog Component', () => {
    it('não deve renderizar quando isOpen for false', () => {
        const { container } = render(
            <ConfirmationDialog isOpen={false} onClose={vi.fn()} onConfirm={vi.fn()} title="Teste" message="Mensagem" />
        );
        expect(container.firstChild).toBeNull();
    });

    it('deve renderizar título e mensagem quando aberto', () => {
        render(
            <ConfirmationDialog isOpen={true} onClose={vi.fn()} onConfirm={vi.fn()} title="Colocar em Repouso?" message="Você deseja repousar contatos?" confirmText="Sim, Repousar" />
        );
        expect(screen.getByText('Colocar em Repouso?')).toBeInTheDocument();
        expect(screen.getByText('Você deseja repousar contatos?')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Sim, Repousar' })).toBeInTheDocument();
    });

    it('deve renderizar o dropdown de horas e disparar o callback onSelectChange ao alterar a opção', () => {
        const onSelectChange = vi.fn();
        const selectOptions = [
            { value: 24, label: '24 horas (1 dia) — Padrão' },
            { value: 48, label: '48 horas (2 dias)' },
            { value: 72, label: '72 horas (3 dias)' },
            { value: 96, label: '96 horas (4 dias)' }
        ];

        render(
            <ConfirmationDialog
                isOpen={true}
                onClose={vi.fn()}
                onConfirm={vi.fn()}
                title="Colocar em Repouso?"
                message="Mensagem de teste"
                showSelect={true}
                selectLabel="Tempo de Repouso:"
                selectValue={24}
                onSelectChange={onSelectChange}
                selectOptions={selectOptions}
            />
        );

        expect(screen.getByText('Tempo de Repouso:')).toBeInTheDocument();
        const select = screen.getByRole('combobox');
        expect(select).toBeInTheDocument();
        expect(select.value).toBe('24');

        fireEvent.change(select, { target: { value: '72' } });
        expect(onSelectChange).toHaveBeenCalledWith(72);
    });
});
