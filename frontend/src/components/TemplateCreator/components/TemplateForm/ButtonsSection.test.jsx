import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ButtonsSection from './ButtonsSection';

describe('ButtonsSection Component', () => {
    it('deve renderizar mensagem de nenhum botão adicionado quando a lista for vazia', () => {
        const logic = {
            formData: { buttons: [] },
            handleAddButton: vi.fn(),
            updateButton: vi.fn(),
            removeButton: vi.fn()
        };

        render(<ButtonsSection logic={logic} />);

        expect(screen.getByText('Botões de Interação')).toBeInTheDocument();
        expect(screen.getByText('Nenhum botão adicionado ainda')).toBeInTheDocument();
    });

    it('deve chamar handleAddButton ao clicar no botão de adicionar', () => {
        const handleAddButton = vi.fn();
        const logic = {
            formData: { buttons: [] },
            handleAddButton,
            updateButton: vi.fn(),
            removeButton: vi.fn()
        };

        render(<ButtonsSection logic={logic} />);

        const addButton = screen.getByRole('button', { name: /Adicionar Botão/i });
        fireEvent.click(addButton);

        expect(handleAddButton).toHaveBeenCalledTimes(1);
    });

    it('deve renderizar botões existentes e acionar remoção ao clicar na lixeira', () => {
        const removeButton = vi.fn();
        const updateButton = vi.fn();
        const logic = {
            formData: {
                buttons: [
                    { type: 'URL', text: 'Abrir Site', url: 'https://exemplo.com' }
                ]
            },
            handleAddButton: vi.fn(),
            updateButton,
            removeButton
        };

        render(<ButtonsSection logic={logic} />);

        expect(screen.getByDisplayValue('Abrir Site')).toBeInTheDocument();
        expect(screen.getByDisplayValue('https://exemplo.com')).toBeInTheDocument();

        const removeBtn = screen.getByTitle('Remover Botão');
        expect(removeBtn).toBeInTheDocument();
        expect(removeBtn.className).toContain('flex-shrink-0');

        fireEvent.click(removeBtn);
        expect(removeButton).toHaveBeenCalledWith(0);
    });
});
