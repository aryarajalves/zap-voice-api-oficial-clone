import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ColumnSelectorModal from './ColumnSelectorModal';
import { toast } from 'react-hot-toast';

vi.mock('react-hot-toast', () => ({
    toast: {
        error: vi.fn(),
        success: vi.fn()
    }
}));

describe('ColumnSelectorModal Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    const defaultProps = {
        isVisible: true,
        csvData: {
            headers: ['Telefone', 'Posição', 'Nome'],
            rows: [
                ['5511999999999', '', 'João Silva'],
                ['5511888888888', '   ', 'Maria Souza']
            ],
            nonEmptyIndices: [0, 1, 2]
        },
        columnMapping: { '0': 'phone', '1': 'ignore', '2': '{{1}}' },
        setColumnMapping: vi.fn(),
        templateVariables: [{ key: '{{1}}', label: '{{1}}' }],
        onConfirm: vi.fn(),
        onClose: vi.fn(),
        availableTags: [],
        saveLeadsTags: '',
        setSaveLeadsTags: vi.fn(),
        isSaveTagsDropdownOpen: false,
        setIsSaveTagsDropdownOpen: vi.fn(),
        saveTagsSearch: '',
        setSaveTagsSearch: vi.fn(),
        toggleSaveLeadsTag: vi.fn(),
        nameColumn: '',
        setNameColumn: vi.fn(),
        emailColumn: '',
        setEmailColumn: vi.fn()
    };

    it('deve exibir erro caso nenhuma coluna de telefone tenha sido mapeada', () => {
        render(
            <ColumnSelectorModal
                {...defaultProps}
                columnMapping={{ '0': 'ignore', '1': 'ignore' }}
            />
        );

        const continueBtn = screen.getByText('Continuar');
        fireEvent.click(continueBtn);

        expect(toast.error).toHaveBeenCalledWith('Selecione a coluna de TELEFONE');
        expect(screen.getByText('Passo 1 de 2')).toBeInTheDocument();
    });

    it('deve bloquear o avanço e disparar toast se uma coluna selecionada estiver completamente vazia no arquivo', () => {
        // A coluna 1 ("Posição") está vazia em todas as linhas ('', '   ')
        render(
            <ColumnSelectorModal
                {...defaultProps}
                columnMapping={{ '0': 'phone', '1': '{{1}}' }}
            />
        );

        const continueBtn = screen.getByText('Continuar');
        fireEvent.click(continueBtn);

        expect(toast.error).toHaveBeenCalledWith(
            'A coluna "Posição" foi selecionada, mas não possui nenhuma informação no arquivo.'
        );
        // Não deve avançar para o Passo 2
        expect(screen.getByText('Passo 1 de 2')).toBeInTheDocument();
    });

    it('deve avançar para o Passo 2 quando as colunas mapeadas tiverem dados válidos', () => {
        render(
            <ColumnSelectorModal
                {...defaultProps}
                columnMapping={{ '0': 'phone', '2': '{{1}}' }}
            />
        );

        const continueBtn = screen.getByText('Continuar');
        fireEvent.click(continueBtn);

        expect(toast.error).not.toHaveBeenCalled();
        expect(screen.getByText('Passo 2 de 2')).toBeInTheDocument();
        expect(screen.getByText('Salvar na Base de Contatos')).toBeInTheDocument();
    });

    it('deve bloquear a confirmação no Passo 2 se a coluna de Nome selecionada estiver vazia', () => {
        render(
            <ColumnSelectorModal
                {...defaultProps}
                columnMapping={{ '0': 'phone' }}
                nameColumn="1" // Coluna 'Posição' que está vazia
            />
        );

        // Avançar para passo 2
        const continueBtn = screen.getByText('Continuar');
        fireEvent.click(continueBtn);

        expect(screen.getByText('Passo 2 de 2')).toBeInTheDocument();

        // Tentar salvar e importar com coluna de nome vazia
        const saveBtn = screen.getByText('Salvar e Importar');
        fireEvent.click(saveBtn);

        expect(toast.error).toHaveBeenCalledWith(
            'A coluna "Posição" selecionada para Nome não possui dados no arquivo.'
        );
        expect(defaultProps.onConfirm).not.toHaveBeenCalled();
    });
});
