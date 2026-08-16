import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ReactFlowProvider } from 'reactflow';
import { vi } from 'vitest';
import MetadataPanel from './MetadataPanel';

describe('MetadataPanel', () => {
    const mockProps = {
        funnelName: 'Funil Teste',
        setFunnelName: vi.fn(),
        showRestrictions: false,
        setShowRestrictions: vi.fn(),
        allowedPhones: '',
        setAllowedPhones: vi.fn(),
        blockedPhones: '',
        setBlockedPhones: vi.fn(),
        showBusinessHours: false,
        setShowBusinessHours: vi.fn(),
        businessHoursStart: '08:00',
        setBusinessHoursStart: vi.fn(),
        businessHoursEnd: '18:00',
        setBusinessHoursEnd: vi.fn(),
        businessHoursDays: [0, 1, 2, 3, 4],
        setBusinessHoursDays: vi.fn(),
        showKeywords: true,
        setShowKeywords: vi.fn(),
        triggerPhrase: 'VALIDAR, AULA',
        setTriggerPhrase: vi.fn(),
        triggerMatchType: 'contains',
        setTriggerMatchType: vi.fn(),
        triggerLimitType: 'once_per_day',
        setTriggerLimitType: vi.fn(),
        isTriggerActive: true,
        setIsTriggerActive: vi.fn()
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    test('renderiza os gatilhos como badges/balões e permite alterar opções', () => {
        render(
            <ReactFlowProvider>
                <MetadataPanel {...mockProps} />
            </ReactFlowProvider>
        );

        expect(screen.getByText('Palavra-Chave de Ativação')).toBeInTheDocument();
        expect(screen.getByText('VALIDAR')).toBeInTheDocument();
        expect(screen.getByText('AULA')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Contém a palavra-chave')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Máximo 1x por dia (mesmo dia)')).toBeInTheDocument();

        // Adicionar nova palavra-chave via Enter
        const inputKw = screen.getByPlaceholderText('+ Adicionar');
        fireEvent.change(inputKw, { target: { value: 'NOVO_GATILHO' } });
        fireEvent.keyDown(inputKw, { key: 'Enter', code: 'Enter' });
        expect(mockProps.setTriggerPhrase).toHaveBeenCalledWith('VALIDAR, AULA, NOVO_GATILHO');

        // Alterar correspondência
        const selectMatch = screen.getByDisplayValue('Contém a palavra-chave');
        fireEvent.change(selectMatch, { target: { value: 'exact' } });
        expect(mockProps.setTriggerMatchType).toHaveBeenCalledWith('exact');

        // Alterar limite de reativação
        const selectLimit = screen.getByDisplayValue('Máximo 1x por dia (mesmo dia)');
        fireEvent.change(selectLimit, { target: { value: 'once_lifetime' } });
        expect(mockProps.setTriggerLimitType).toHaveBeenCalledWith('once_lifetime');
    });

    test('permite remover um badge/balão ao clicar no botão X', () => {
        render(
            <ReactFlowProvider>
                <MetadataPanel {...mockProps} />
            </ReactFlowProvider>
        );

        const removeButtons = screen.getAllByTitle('Remover');
        expect(removeButtons.length).toBe(2);
        fireEvent.click(removeButtons[0]);
        expect(mockProps.setTriggerPhrase).toHaveBeenCalledWith('AULA');
    });

    test('permite ativar/desativar o gatilho por palavra-chave', () => {
        render(
            <ReactFlowProvider>
                <MetadataPanel {...mockProps} />
            </ReactFlowProvider>
        );

        const checkbox = screen.getByLabelText('Gatilho Ativo');
        expect(checkbox).toBeChecked();
        fireEvent.click(checkbox);
        expect(mockProps.setIsTriggerActive).toHaveBeenCalledWith(false);
    });

    test('alterna a visibilidade da seção de palavras-chave ao clicar no botão', () => {
        render(
            <ReactFlowProvider>
                <MetadataPanel {...mockProps} showKeywords={false} />
            </ReactFlowProvider>
        );

        const toggleBtn = screen.getByText('Palavra-Chave de Ativação');
        fireEvent.click(toggleBtn);
        expect(mockProps.setShowKeywords).toHaveBeenCalledWith(true);
    });
});
