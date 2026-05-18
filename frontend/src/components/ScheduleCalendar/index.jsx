import React from 'react';
import { useCalendarEvents } from './hooks/useCalendarEvents';
import CalendarHeader from './components/CalendarHeader';
import WeekDaysHeader from './components/WeekDaysHeader';
import CalendarGrid from './components/CalendarGrid';
import EventDetailsModal from './components/EventDetailsModal';
import ConfirmModal from '../ConfirmModal';

const ScheduleCalendar = ({ refreshKey }) => {
    const {
        activeClient,
        currentDate,
        setCurrentDate,
        events,
        setEvents,
        loading,
        selectedEvent,
        setSelectedEvent,
        confirmDelete,
        setConfirmDelete,
        isEditing,
        setIsEditing,
        editDate,
        setEditDate,
        editTime,
        setEditTime,
        isSaving,
        getDaysInMonth,
        getFirstDayOfMonth,
        handlePrevMonth,
        handleNextMonth,
        confirmDeleteAction,
        requestDelete,
        handleUpdateEvent
    } = useCalendarEvents(refreshKey);

    return (
        <div className="flex flex-col h-full bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            {/* Header do Calendário */}
            <CalendarHeader
                currentDate={currentDate}
                eventsCount={events.length}
                loading={loading}
                handlePrevMonth={handlePrevMonth}
                handleNextMonth={handleNextMonth}
                setCurrentDate={setCurrentDate}
            />

            {/* Dias da Semana Header */}
            <WeekDaysHeader />

            {/* Grid de Dias */}
            <CalendarGrid
                currentDate={currentDate}
                events={events}
                getDaysInMonth={getDaysInMonth}
                getFirstDayOfMonth={getFirstDayOfMonth}
                setSelectedEvent={setSelectedEvent}
            />

            {/* Modal de Detalhes do Evento */}
            {selectedEvent && (
                <EventDetailsModal
                    selectedEvent={selectedEvent}
                    setSelectedEvent={setSelectedEvent}
                    isEditing={isEditing}
                    setIsEditing={setIsEditing}
                    editDate={editDate}
                    setEditDate={setEditDate}
                    editTime={editTime}
                    setEditTime={setEditTime}
                    isSaving={isSaving}
                    handleUpdateEvent={handleUpdateEvent}
                    requestDelete={requestDelete}
                    activeClient={activeClient}
                    setEvents={setEvents}
                />
            )}

            {/* Modal de Confirmação de Exclusão */}
            <ConfirmModal
                isOpen={!!confirmDelete}
                onClose={() => setConfirmDelete(null)}
                onConfirm={confirmDeleteAction}
                title="Confirmar Exclusão"
                message={confirmDelete?.event?.status === 'pending'
                    ? "Tem certeza que deseja cancelar este agendamento pendente? Ele não será enviado."
                    : "Tem certeza que deseja remover este registro do histórico? Essa ação é irreversível."}
                confirmText={confirmDelete?.event?.status === 'pending' ? "Cancelar Agendamento" : "Excluir"}
                isDangerous={true}
            />
        </div>
    );
};

export default ScheduleCalendar;
