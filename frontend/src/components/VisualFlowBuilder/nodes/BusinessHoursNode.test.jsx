import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ReactFlowProvider } from 'reactflow';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import BusinessHoursNode from './BusinessHoursNode';

describe('BusinessHoursNode', () => {
    const mockOnChange = vi.fn();
    const mockData = {
        schedule: {
            '0': { open: true, periods: [{ start: '08:00', end: '18:00' }] },
            '1': { open: true, periods: [{ start: '08:00', end: '18:00' }] }
        },
        waitUntilOpen: false,
        onChange: mockOnChange,
        onDelete: vi.fn(),
        onDuplicate: vi.fn(),
        onSetStart: vi.fn(),
        isStart: false
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    test('deve renderizar os estados Aberto e Fechado por padrao quando waitUntilOpen for false', () => {
        render(
            <ReactFlowProvider>
                <BusinessHoursNode id="node-hours-1" data={mockData} />
            </ReactFlowProvider>
        );

        expect(screen.getByText('🟢 Aberto')).toBeInTheDocument();
        expect(screen.getByText('🔴 Fechado')).toBeInTheDocument();
    });

    test('deve ocultar o estado Fechado quando waitUntilOpen for true', () => {
        const customData = {
            ...mockData,
            waitUntilOpen: true
        };

        render(
            <ReactFlowProvider>
                <BusinessHoursNode id="node-hours-1" data={customData} />
            </ReactFlowProvider>
        );

        expect(screen.getByText('🟢 Aberto')).toBeInTheDocument();
        expect(screen.queryByText('🔴 Fechado')).not.toBeInTheDocument();
    });

    test('deve chamar onChange ao alternar o checkbox de aguardar horario comercial', () => {
        render(
            <ReactFlowProvider>
                <BusinessHoursNode id="node-hours-1" data={mockData} />
            </ReactFlowProvider>
        );

        const checkbox = screen.getByLabelText('Aguardar horário comercial para prosseguir');
        expect(checkbox).not.toBeChecked();

        fireEvent.click(checkbox);

        expect(mockOnChange).toHaveBeenCalledWith('node-hours-1', { waitUntilOpen: true });
    });
});
