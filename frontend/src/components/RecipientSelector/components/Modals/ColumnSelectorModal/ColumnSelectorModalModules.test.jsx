import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { toast } from 'react-hot-toast';
import {
    validateStep1,
    validateStep2
} from './utils/columnSelectorValidation';
import ColumnSelectorHeader from './components/ColumnSelectorHeader';
import ManualTagsDropdown from './components/ManualTagsDropdown';
import Step1ColumnMapping from './components/Step1ColumnMapping';
import Step2SaveLeads from './components/Step2SaveLeads';

vi.mock('react-hot-toast', () => ({
    toast: {
        error: vi.fn(),
        success: vi.fn()
    }
}));

describe('ColumnSelectorModal Modules & Utils', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    const mockCsv = {
        headers: ['Telefone', 'Nome', 'Vazio'],
        rows: [
            ['5511999999999', 'Carlos', ''],
            ['5511888888888', 'Ana', '   ']
        ],
        nonEmptyIndices: [0, 1]
    };

    describe('columnSelectorValidation', () => {
        it('validateStep1 valida ausência de telefone e colunas vazias', () => {
            // Sem telefone
            const resNoPhone = validateStep1({ '1': 'Nome' }, mockCsv);
            expect(resNoPhone).toBe(false);
            expect(toast.error).toHaveBeenCalledWith('Selecione a coluna de TELEFONE');

            // Coluna vazia mapeada
            const resEmptyCol = validateStep1({ '0': 'phone', '2': '{{1}}' }, mockCsv);
            expect(resEmptyCol).toBe(false);
            expect(toast.error).toHaveBeenCalledWith(
                expect.stringContaining('não possui nenhuma informação no arquivo')
            );

            // Mapeamento válido
            const resValid = validateStep1({ '0': 'phone', '1': '{{1}}' }, mockCsv);
            expect(resValid).toBe(true);
        });

        it('validateStep2 valida colunas opcionais de nome e email', () => {
            // Coluna válida
            expect(validateStep2('1', '', mockCsv)).toBe(true);
            expect(validateStep2('', '', mockCsv)).toBe(true);

            // Coluna de nome vazia no arquivo
            const resInvalidName = validateStep2('2', '', mockCsv);
            expect(resInvalidName).toBe(false);
            expect(toast.error).toHaveBeenCalledWith(
                expect.stringContaining('selecionada para Nome não possui dados no arquivo')
            );

            // Coluna de email vazia no arquivo
            const resInvalidEmail = validateStep2('', '2', mockCsv);
            expect(resInvalidEmail).toBe(false);
            expect(toast.error).toHaveBeenCalledWith(
                expect.stringContaining('selecionada para E-mail não possui dados no arquivo')
            );
        });
    });

    describe('ColumnSelectorHeader', () => {
        it('renderiza título do passo 1 e aciona onClose', () => {
            const onClose = vi.fn();
            render(<ColumnSelectorHeader step={1} onClose={onClose} />);

            expect(screen.getByText('Passo 1 de 2')).toBeInTheDocument();
            expect(screen.getByText('Mapear Colunas')).toBeInTheDocument();

            const closeBtn = screen.getByRole('button');
            fireEvent.click(closeBtn);
            expect(onClose).toHaveBeenCalled();
        });

        it('renderiza título do passo 2', () => {
            render(<ColumnSelectorHeader step={2} onClose={vi.fn()} />);
            expect(screen.getByText('Passo 2 de 2')).toBeInTheDocument();
            expect(screen.getByText('Salvar na Base de Contatos')).toBeInTheDocument();
        });
    });

    describe('ManualTagsDropdown', () => {
        it('abre dropdown e permite filtrar e selecionar tag', () => {
            const setIsOpen = vi.fn();
            const toggleTag = vi.fn();

            render(
                <ManualTagsDropdown
                    availableTags={['Cliente', 'VIP', 'Lead']}
                    saveLeadsTags=""
                    isSaveTagsDropdownOpen={true}
                    setIsSaveTagsDropdownOpen={setIsOpen}
                    saveTagsSearch=""
                    setSaveTagsSearch={vi.fn()}
                    toggleSaveLeadsTag={toggleTag}
                />
            );

            expect(screen.getByText('Cliente')).toBeInTheDocument();
            expect(screen.getByText('VIP')).toBeInTheDocument();

            fireEvent.click(screen.getByText('VIP'));
            expect(toggleTag).toHaveBeenCalledWith('VIP');
        });
    });

    describe('Step1ColumnMapping', () => {
        it('renderiza colunas e botões de ação do passo 1', () => {
            const onSelect = vi.fn();
            const onClear = vi.fn();
            const onContinue = vi.fn();

            render(
                <Step1ColumnMapping
                    csvData={mockCsv}
                    columnMapping={{ '0': 'phone' }}
                    templateVariables={[{ key: '{{1}}', label: 'Nome' }]}
                    onSelect={onSelect}
                    onClear={onClear}
                    onContinue={onContinue}
                />
            );

            expect(screen.getAllByText('Telefone').length).toBeGreaterThanOrEqual(1);

            const clearBtn = screen.getByRole('button', { name: /Limpar Mapeamento/i });
            fireEvent.click(clearBtn);
            expect(onClear).toHaveBeenCalled();

            const continueBtn = screen.getByRole('button', { name: /Continuar/i });
            fireEvent.click(continueBtn);
            expect(onContinue).toHaveBeenCalled();
        });
    });

    describe('Step2SaveLeads', () => {
        it('renderiza selects e aciona onBack e onConfirm', () => {
            const onBack = vi.fn();
            const onConfirm = vi.fn();

            render(
                <Step2SaveLeads
                    csvData={mockCsv}
                    nameColumn=""
                    setNameColumn={vi.fn()}
                    emailColumn=""
                    setEmailColumn={vi.fn()}
                    availableTags={[]}
                    saveLeadsTags=""
                    isSaveTagsDropdownOpen={false}
                    setIsSaveTagsDropdownOpen={vi.fn()}
                    saveTagsSearch=""
                    setSaveTagsSearch={vi.fn()}
                    toggleSaveLeadsTag={vi.fn()}
                    onBack={onBack}
                    onConfirm={onConfirm}
                />
            );

            expect(screen.getByText(/Atualizar contatos no banco de dados\?/i)).toBeInTheDocument();

            const backBtn = screen.getByRole('button', { name: /Voltar/i });
            fireEvent.click(backBtn);
            expect(onBack).toHaveBeenCalled();

            const skipBtn = screen.getByRole('button', { name: /Pular e Importar/i });
            fireEvent.click(skipBtn);
            expect(onConfirm).toHaveBeenCalledWith(false);

            const saveBtn = screen.getByRole('button', { name: /Salvar e Importar/i });
            fireEvent.click(saveBtn);
            expect(onConfirm).toHaveBeenCalledWith(true);
        });
    });
});
