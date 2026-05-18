import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ScheduleCalendar from './ScheduleCalendar';

// Mock active client context
vi.mock('./contexts/ClientContext', () => ({
    useClient: () => ({
        activeClient: { id: 1, name: 'Cliente Teste' }
    })
}));

// Mock fetchWithAuth
vi.mock('../AuthContext', () => ({
    fetchWithAuth: vi.fn()
}));

// Mock react-hot-toast
vi.mock('react-hot-toast', () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn()
    }
}));

// Mock icons
vi.mock('react-icons/fi', () => ({
    FiChevronLeft: () => <span>ChevronLeft</span>,
    FiChevronRight: () => <span>ChevronRight</span>,
    FiClock: () => <span>Clock</span>,
    FiTrash2: () => <span>Trash2</span>,
    FiEdit2: () => <span>Edit2</span>,
    FiRepeat: () => <span>Repeat</span>,
    FiUsers: () => <span>Users</span>,
    FiZap: () => <span>Zap</span>,
    FiInfo: () => <span>Info</span>
}));

// Mock ConfirmModal
vi.mock('./ConfirmModal', () => ({
    default: ({ isOpen, onClose, onConfirm, title, message }) => (
        isOpen ? (
            <div data-testid="confirm-modal">
                <h3>{title}</h3>
                <p>{message}</p>
                <button onClick={onConfirm}>Confirmar</button>
                <button onClick={onClose}>Cancelar</button>
            </div>
        ) : null
    )
}));

import { fetchWithAuth } from '../AuthContext';

describe('ScheduleCalendar Component', () => {
    const mockEvents = [
        {
            id: 'evt-1',
            type: 'single',
            status: 'pending',
            start: new Date(new Date().getFullYear(), new Date().getMonth(), 15, 10, 0, 0).toISOString(),
            template_name: 'Template Boas Vindas',
            contact_count: 1,
            private_message: 'Mensagem privada de teste'
        },
        {
            id: 'evt-2',
            type: 'bulk',
            status: 'pending',
            start: new Date(new Date().getFullYear(), new Date().getMonth(), 20, 14, 30, 0).toISOString(),
            funnel_name: 'Funil Promocional',
            contact_count: 50
        }
    ];

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders calendar cells and event buttons correctly', async () => {
        fetchWithAuth.mockResolvedValue({
            ok: true,
            json: async () => mockEvents
        });

        render(<ScheduleCalendar refreshKey="1" />);

        // Verify month is rendered (e.g. "maio de 2026")
        const currentMonthYear = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
        expect(screen.getByText(new RegExp(currentMonthYear, 'i'))).toBeInTheDocument();

        // Wait for fetch events to complete and verify events are rendered on grid
        await waitFor(() => {
            expect(screen.getByText('Template Boas Vindas')).toBeInTheDocument();
            expect(screen.getByText('Funil Promocional')).toBeInTheDocument();
        });
    });

    it('opens event details modal when clicking on an event', async () => {
        fetchWithAuth.mockResolvedValue({
            ok: true,
            json: async () => mockEvents
        });

        render(<ScheduleCalendar refreshKey="1" />);

        await waitFor(() => {
            expect(screen.getByText('Template Boas Vindas')).toBeInTheDocument();
        });

        const eventBtn = screen.getByText('Template Boas Vindas');
        fireEvent.click(eventBtn);

        // Verify details modal is open
        expect(screen.getByTestId('event-modal')).toBeInTheDocument();
        expect(screen.getByText('Detalhes do Agendamento')).toBeInTheDocument();
        expect(screen.getByText('Template: Template Boas Vindas')).toBeInTheDocument();
        expect(screen.getByText('Mensagem Privada Ativada 🔓')).toBeInTheDocument();
    });

    it('enters edit mode inside event details modal', async () => {
        fetchWithAuth.mockResolvedValue({
            ok: true,
            json: async () => mockEvents
        });

        render(<ScheduleCalendar refreshKey="1" />);

        await waitFor(() => {
            expect(screen.getByText('Template Boas Vindas')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText('Template Boas Vindas'));

        // Click Edit
        const editBtn = screen.getByText('Editar');
        fireEvent.click(editBtn);

        // Verify edit fields are rendered
        expect(screen.getByText('Editar Agendamento')).toBeInTheDocument();
        expect(screen.getByText('Nova Data')).toBeInTheDocument();
        expect(screen.getByText('Novo Horário')).toBeInTheDocument();
    });
});
