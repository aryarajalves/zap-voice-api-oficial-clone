import React from 'react';
import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import RecurringSchedules from '../RecurringSchedules';
import { useClient } from '../../contexts/ClientContext';
import { useRecurringSchedules } from './useRecurringSchedules';

// Mock dependencies
vi.mock('../../contexts/ClientContext');
vi.mock('./useRecurringSchedules');

describe('RecurringSchedules Component', () => {
    const mockHook = {
        schedules: [],
        isLoading: false,
        isDeleting: false,
        isEditing: false,
        isTriggering: false,
        viewingContacts: null,
        setViewingContacts: vi.fn(),
        selectedSchedule: null,
        setSelectedSchedule: vi.fn(),
        editFreq: 'weekly',
        setEditFreq: vi.fn(),
        editDays: [],
        setEditDays: vi.fn(),
        editDayOfMonth: '',
        setEditDayOfMonth: vi.fn(),
        editTime: '09:00',
        setEditTime: vi.fn(),
        fetchSchedules: vi.fn(),
        handleToggleStatus: vi.fn(),
        handleDelete: vi.fn(),
        handleUpdate: vi.fn(),
        fetchContacts: vi.fn(),
        openEdit: vi.fn(),
        handleManualTrigger: vi.fn(),
        
        // Novos mocks
        viewingMessageSchedule: null,
        setViewingMessageSchedule: vi.fn(),
        templates: [],
        funnels: [],
        isUpdatingMessage: false,
        handleUpdateMessage: vi.fn()
    };

    beforeEach(() => {
        vi.clearAllMocks();
        useClient.mockReturnValue({ activeClient: { id: 1 } });
        useRecurringSchedules.mockReturnValue(mockHook);
    });

    it('deve renderizar o estado de carregamento', () => {
        useRecurringSchedules.mockReturnValue({
            ...mockHook,
            isLoading: true,
            schedules: []
        });

        render(<RecurringSchedules />);
        const spinner = document.querySelector('.animate-spin');
        expect(spinner).toBeDefined();
    });

    it('deve renderizar mensagem de lista vazia', () => {
        render(<RecurringSchedules />);
        expect(screen.getByText(/Nenhum disparo recorrente/i)).toBeDefined();
    });

    it('deve renderizar cards de agendamento quando houver dados', () => {
        useRecurringSchedules.mockReturnValue({
            ...mockHook,
            schedules: [
                { 
                    id: 1, 
                    template_name: 'Template Alpha', 
                    is_active: true, 
                    frequency: 'weekly',
                    scheduled_time: '10:00'
                }
            ]
        });

        render(<RecurringSchedules />);
        expect(screen.getByText(/Template Alpha/i)).toBeDefined();
        expect(screen.getByText(/10:00/i)).toBeDefined();
    });
});
