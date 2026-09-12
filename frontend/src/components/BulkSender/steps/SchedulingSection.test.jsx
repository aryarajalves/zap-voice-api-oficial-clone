import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import SchedulingSection from './SchedulingSection';

describe('SchedulingSection — Prazo Limite de Envio (Opcional)', () => {
    const baseProps = {
        isRecurring: false,
        setIsRecurring: vi.fn(),
        setScheduledTime: vi.fn(),
        recurrenceFrequency: 'weekly',
        setRecurrenceFrequency: vi.fn(),
        recurrenceDaysOfWeek: [],
        setRecurrenceDaysOfWeek: vi.fn(),
        recurrenceTime: '09:00',
        setRecurrenceTime: vi.fn(),
        recurrenceDayOfMonth: 1,
        setRecurrenceDayOfMonth: vi.fn(),
        scheduledTime: '',
        maxDispatchTime: '',
        setMaxDispatchTime: vi.fn(),
        clearMaxDispatchTime: vi.fn(),
        isDynamicLabel: false,
        setIsDynamicLabel: vi.fn(),
        selectionMetadata: null,
        selectedChatwootLabels: []
    };

    it('deve exibir o fallback padrão de 24h quando maxDispatchTime estiver vazio', () => {
        render(<SchedulingSection {...baseProps} maxDispatchTime="" />);
        
        expect(screen.getByText(/Prazo Limite de Envio \(Opcional\)/i)).toBeInTheDocument();
        expect(screen.getByText(/Fallback Padrão de 24h:/i)).toBeInTheDocument();
        expect(screen.queryByText(/Personalizado/i)).not.toBeInTheDocument();
        expect(screen.queryByTestId('bulk-clear-max-dispatch-time-btn')).not.toBeInTheDocument();
    });

    it('deve exibir o badge Personalizado e botão de limpar quando maxDispatchTime estiver preenchido', () => {
        render(<SchedulingSection {...baseProps} maxDispatchTime="2026-09-12T18:00" />);
        
        expect(screen.getByText(/Personalizado/i)).toBeInTheDocument();
        expect(screen.getByTestId('bulk-clear-max-dispatch-time-btn')).toBeInTheDocument();
        expect(screen.getByText(/Disparo e mensagens na fila serão abortados se ultrapassar esta data\/horário/i)).toBeInTheDocument();
    });

    it('deve chamar setMaxDispatchTime ao alterar a data e hora limite no input', () => {
        const setMaxDispatchTimeMock = vi.fn();
        render(<SchedulingSection {...baseProps} setMaxDispatchTime={setMaxDispatchTimeMock} />);
        
        const input = screen.getByTestId('bulk-max-dispatch-time-input');
        fireEvent.change(input, { target: { value: '2026-09-12T20:30' } });
        
        expect(setMaxDispatchTimeMock).toHaveBeenCalledWith('2026-09-12T20:30');
    });

    it('deve chamar setMaxDispatchTime("") ao clicar no botão de limpar prazo limite', () => {
        const setMaxDispatchTimeMock = vi.fn();
        render(<SchedulingSection {...baseProps} maxDispatchTime="2026-09-12T18:00" setMaxDispatchTime={setMaxDispatchTimeMock} />);
        
        const clearBtn = screen.getByTestId('bulk-clear-max-dispatch-time-btn');
        fireEvent.click(clearBtn);
        
        expect(setMaxDispatchTimeMock).toHaveBeenCalledWith('');
    });
});
