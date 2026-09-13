import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ViewContactsModal } from '../ViewContactsModal';
import { ConfirmActionModal } from '../ConfirmActionModal';
import { EditScheduleModal } from '../EditScheduleModal';
import { useViewContactsModal } from '../useViewContactsModal';
import { renderHook } from '@testing-library/react';

vi.mock('react-hot-toast', () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn()
    }
}));

describe('RecurringSchedules Modals Modular Suite', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('useViewContactsModal hook', () => {
        const mockViewingContacts = {
            id: 1,
            mode: 'tag',
            tag: 'VIP',
            exclusion_list: ['5511999999999'],
            contacts: [
                { name: 'Alice', phone: '5511999999999', email: 'alice@test.com' },
                { name: 'Bob', phone: '5511888888888', email: 'bob@test.com' }
            ]
        };

        it('deve inicializar com contatos e exclusões', () => {
            const { result } = renderHook(() => useViewContactsModal({
                viewingContacts: mockViewingContacts,
                onSaveExclusions: vi.fn(),
                onRefreshContacts: vi.fn()
            }));

            expect(result.current.contacts).toHaveLength(2);
            expect(result.current.activeContacts).toHaveLength(1);
            expect(result.current.excludedContacts).toHaveLength(1);
            expect(result.current.hasChanges).toBe(false);
        });

        it('deve alternar exclusão de contato e marcar hasChanges como true', () => {
            const { result } = renderHook(() => useViewContactsModal({
                viewingContacts: mockViewingContacts,
                onSaveExclusions: vi.fn(),
                onRefreshContacts: vi.fn()
            }));

            act(() => {
                result.current.handleToggleExclusion('5511888888888');
            });

            expect(result.current.localExclusions).toContain('5511888888888');
            expect(result.current.hasChanges).toBe(true);
        });

        it('deve filtrar contatos por status ativo ou removido', () => {
            const { result } = renderHook(() => useViewContactsModal({
                viewingContacts: mockViewingContacts,
                onSaveExclusions: vi.fn(),
                onRefreshContacts: vi.fn()
            }));

            act(() => {
                result.current.setFilterType('active');
            });

            expect(result.current.displayedContacts).toHaveLength(1);
            expect(result.current.displayedContacts[0].name).toBe('Bob');

            act(() => {
                result.current.setFilterType('excluded');
            });

            expect(result.current.displayedContacts).toHaveLength(1);
            expect(result.current.displayedContacts[0].name).toBe('Alice');
        });
    });

    describe('ConfirmActionModal component', () => {
        it('deve renderizar modal de exclusão quando type for delete', () => {
            const onCancel = vi.fn();
            const onConfirm = vi.fn();

            render(
                <ConfirmActionModal
                    selectedSchedule={{ type: 'delete', id: 5 }}
                    onCancel={onCancel}
                    onConfirm={onConfirm}
                    isProcessing={false}
                />
            );

            expect(screen.getByText('Excluir Agendamento?')).toBeDefined();
            expect(screen.getByText('Excluir Agora')).toBeDefined();

            fireEvent.click(screen.getByText('Cancelar'));
            expect(onCancel).toHaveBeenCalled();
        });

        it('deve renderizar modal de disparo manual quando type for trigger', () => {
            const onConfirm = vi.fn();

            render(
                <ConfirmActionModal
                    selectedSchedule={{ type: 'trigger', id: 10, template_name: 'Campanha|Oferta' }}
                    onCancel={vi.fn()}
                    onConfirm={onConfirm}
                    isProcessing={false}
                />
            );

            expect(screen.getByText('Disparar Agora?')).toBeDefined();
            expect(screen.getByText('Confirmar Disparo')).toBeDefined();

            fireEvent.click(screen.getByText('Confirmar Disparo'));
            expect(onConfirm).toHaveBeenCalled();
        });
    });

    describe('EditScheduleModal component', () => {
        it('deve renderizar botões de frequência semanal e mensal', () => {
            const setEditFreq = vi.fn();
            const onCancel = vi.fn();
            const onSave = vi.fn();

            render(
                <EditScheduleModal
                    selectedSchedule={{ id: 1 }}
                    editFreq="weekly"
                    setEditFreq={setEditFreq}
                    editDays={[{ day: 0, time: '10:00' }]}
                    setEditDays={vi.fn()}
                    editDayOfMonth=""
                    setEditDayOfMonth={vi.fn()}
                    editTime="10:00"
                    setEditTime={vi.fn()}
                    onCancel={onCancel}
                    onSave={onSave}
                    isEditing={false}
                />
            );

            expect(screen.getByText('Editar Agendamento')).toBeDefined();
            expect(screen.getByText('Semanal')).toBeDefined();
            expect(screen.getByText('Mensal')).toBeDefined();
            expect(screen.getByText('Salvar Alterações')).toBeDefined();

            fireEvent.click(screen.getByText('Mensal'));
            expect(setEditFreq).toHaveBeenCalledWith('monthly');
        });
    });

    describe('ViewContactsModal component', () => {
        it('deve renderizar contatos na listagem e permitir fechar', () => {
            const onClose = vi.fn();

            render(
                <ViewContactsModal
                    viewingContacts={{
                        id: 1,
                        mode: 'tag',
                        tag: 'VIP',
                        exclusion_list: [],
                        contacts: [
                            { name: 'Maria Silva', phone: '5511999990000', email: 'maria@test.com' }
                        ]
                    }}
                    onClose={onClose}
                    onSaveExclusions={vi.fn()}
                    isSavingExclusions={false}
                    onRefreshContacts={vi.fn()}
                />
            );

            expect(screen.getByText('Público Alvo')).toBeDefined();
            expect(screen.getByText('Maria Silva')).toBeDefined();
            expect(screen.getByText('5511999990000')).toBeDefined();

            fireEvent.click(screen.getByText('FECHAR'));
            expect(onClose).toHaveBeenCalled();
        });
    });
});
