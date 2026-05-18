import React from 'react';
import { FiClock, FiRefreshCw } from 'react-icons/fi';
import { useClient } from '../contexts/ClientContext';
import { useRecurringSchedules } from './RecurringSchedules/useRecurringSchedules';
import { ScheduleCard } from './RecurringSchedules/ScheduleCard';
import { ViewContactsModal, ConfirmActionModal, EditScheduleModal, ViewMessageModal } from './RecurringSchedules/Modals';

export default function RecurringSchedules() {
    const { activeClient } = useClient();
    const {
        schedules,
        isLoading,
        isDeleting,
        isEditing,
        isTriggering,
        viewingContacts,
        setViewingContacts,
        selectedSchedule,
        setSelectedSchedule,
        editFreq,
        setEditFreq,
        editDays,
        setEditDays,
        editDayOfMonth,
        setEditDayOfMonth,
        editTime,
        setEditTime,
        fetchSchedules,
        handleToggleStatus,
        handleDelete,
        handleUpdate,
        fetchContacts,
        openEdit,
        handleManualTrigger,
        
        // Novos retornos do hook
        viewingMessageSchedule,
        setViewingMessageSchedule,
        templates,
        funnels,
        isUpdatingMessage,
        handleUpdateMessage
    } = useRecurringSchedules(activeClient);

    if (isLoading && schedules.length === 0) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <>
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-black text-white tracking-tight">Disparos Recorrentes Criados</h2>
                        <p className="text-slate-400 text-sm">Gerencie suas campanhas automáticas programadas.</p>
                    </div>
                    <button 
                        onClick={fetchSchedules}
                        className="p-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-all active:scale-95 border border-white/5 shadow-lg"
                    >
                        <FiRefreshCw className={isLoading ? 'animate-spin' : ''} />
                    </button>
                </div>

                {schedules.length === 0 ? (
                    <div className="bg-slate-900/40 border border-dashed border-slate-700 rounded-[2.5rem] p-16 text-center space-y-6 shadow-inner">
                        <div className="w-20 h-20 bg-slate-800 rounded-[2rem] flex items-center justify-center mx-auto text-slate-600 shadow-2xl">
                            <FiClock size={40} />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-xl font-bold text-white">Nenhum disparo recorrente</h3>
                            <p className="text-slate-500 max-w-sm mx-auto">Vá até o Disparo em Massa para criar uma nova campanha com recorrência semanal ou mensal.</p>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {schedules.map((schedule) => (
                            <ScheduleCard 
                                key={schedule.id}
                                schedule={schedule}
                                onTrigger={() => setSelectedSchedule({ ...schedule, type: 'trigger' })}
                                onFetchContacts={fetchContacts}
                                onOpenEdit={openEdit}
                                onToggleStatus={handleToggleStatus}
                                onConfirmDelete={() => setSelectedSchedule({ ...schedule, type: 'delete' })}
                                onViewMessage={setViewingMessageSchedule}
                                isTriggering={isTriggering}
                            />
                        ))}
                    </div>
                )}
            </div>

            <ViewContactsModal 
                viewingContacts={viewingContacts} 
                onClose={() => setViewingContacts(null)} 
            />

            <ConfirmActionModal 
                selectedSchedule={selectedSchedule}
                onCancel={() => setSelectedSchedule(null)}
                onConfirm={() => {
                    if (selectedSchedule?.type === 'trigger') {
                        handleManualTrigger(selectedSchedule.id);
                        setSelectedSchedule(null);
                    } else if (selectedSchedule?.type === 'delete') {
                        handleDelete(selectedSchedule.id);
                    }
                }}
                isProcessing={isTriggering || isDeleting}
            />

            <EditScheduleModal 
                selectedSchedule={selectedSchedule}
                editFreq={editFreq}
                setEditFreq={setEditFreq}
                editDays={editDays}
                setEditDays={setEditDays}
                editDayOfMonth={editDayOfMonth}
                setEditDayOfMonth={setEditDayOfMonth}
                editTime={editTime}
                setEditTime={setEditTime}
                onCancel={() => setSelectedSchedule(null)}
                onSave={handleUpdate}
                isEditing={isEditing}
            />

            <ViewMessageModal 
                viewingMessageSchedule={viewingMessageSchedule}
                onClose={() => setViewingMessageSchedule(null)}
                onSave={handleUpdateMessage}
                templates={templates}
                funnels={funnels}
                isUpdating={isUpdatingMessage}
            />
        </>
    );
}
