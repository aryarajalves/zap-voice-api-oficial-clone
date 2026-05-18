import React from 'react';
import { FiUsers, FiZap, FiClock, FiTrash2, FiEdit2, FiInfo } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { fetchWithAuth } from '../../../AuthContext';
import { API_URL } from '../../../config';

const EventDetailsModal = ({
    selectedEvent,
    setSelectedEvent,
    isEditing,
    setIsEditing,
    editDate,
    setEditDate,
    editTime,
    setEditTime,
    isSaving,
    handleUpdateEvent,
    requestDelete,
    activeClient,
    setEvents
}) => {
    const handleImmediateDispatch = async () => {
        try {
            const res = await fetchWithAuth(`${API_URL}/schedules/${selectedEvent.id}/dispatch`, {
                method: 'POST'
            }, activeClient.id);
            if (res.ok) {
                toast.success("🚀 Disparo iniciado! Processando em instantes...");
                setEvents(prev => prev.filter(e => e.id !== selectedEvent.id));
                setSelectedEvent(null);
            } else {
                const err = await res.json();
                toast.error(err.detail || "Erro ao disparar");
            }
        } catch (e) {
            toast.error("Erro de conexão");
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200" data-testid="event-modal">
            <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-sm shadow-2xl p-6 border border-gray-200 dark:border-gray-700 animate-in zoom-in-95 duration-200">
                <div className="flex justify-between items-start mb-4">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        {selectedEvent.type === 'bulk' ? <FiUsers className="text-purple-500" /> : <FiZap className="text-blue-500" />}
                        Detalhes do Agendamento
                    </h3>
                    <button 
                        onClick={() => setSelectedEvent(null)} 
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-2xl leading-none"
                        aria-label="Fechar"
                    >
                        &times;
                    </button>
                </div>

                <div className="space-y-4 text-sm text-gray-600 dark:text-gray-300">
                    {!isEditing ? (
                        <>
                            {/* --- VIEW MODE --- */}
                            <div>
                                <label className="block text-xs font-bold uppercase text-gray-400 mb-1">Título</label>
                                <p className="font-semibold text-gray-900 dark:text-white text-base">
                                    {selectedEvent.template_name
                                        ? `Template: ${selectedEvent.template_name}`
                                        : (selectedEvent.funnel_name ? `Funil: ${selectedEvent.funnel_name}` : selectedEvent.title)}
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold uppercase text-gray-400 mb-1">Data</label>
                                    <p>{new Date(selectedEvent.start).toLocaleDateString()}</p>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase text-gray-400 mb-1">Horário</label>
                                    <p className="flex items-center gap-1 font-mono text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded w-fit">
                                        <FiClock size={12} />
                                        {new Date(selectedEvent.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold uppercase text-gray-400 mb-1">Contatos</label>
                                    <p>{selectedEvent.contact_count}</p>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase text-gray-400 mb-1">Status</label>
                                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold capitalize
                                ${['pending', 'queued', 'Queued'].includes(selectedEvent.status) ? 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300' :
                                            selectedEvent.status === 'processing' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                                                selectedEvent.status === 'completed' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                                    'bg-red-100 text-red-700'}`}>
                                        {selectedEvent.status}
                                    </span>
                                </div>
                            </div>

                            {selectedEvent.private_message && (
                                <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-900/50 rounded-lg shadow-sm">
                                    <label className="block text-[10px] font-bold uppercase text-indigo-500 dark:text-indigo-400 mb-1 tracking-wider italic font-black flex items-center gap-1">
                                        <FiInfo size={10} /> Mensagem Privada Ativada 🔓
                                    </label>
                                    <p className="text-xs text-indigo-700 dark:text-indigo-300 italic truncate" title={selectedEvent.private_message}>
                                        &quot;{selectedEvent.private_message}&quot;
                                    </p>
                                </div>
                            )}

                            <div className="flex gap-2 pt-2">
                                {['pending', 'queued', 'Queued'].includes(selectedEvent.status) && (
                                    <>
                                        <button
                                            onClick={handleImmediateDispatch}
                                            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-green-50 text-green-600 hover:bg-green-100 border border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-900/50 transition-colors font-bold text-xs"
                                        >
                                            <FiZap size={14} /> Disparar Agora
                                        </button>
                                        <button
                                            onClick={() => setIsEditing(true)}
                                            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-900/50 transition-colors font-bold text-xs"
                                        >
                                            <FiEdit2 size={14} /> Editar
                                        </button>
                                    </>
                                )}

                                {selectedEvent.status !== 'processing' && (
                                    <button
                                        onClick={() => requestDelete(selectedEvent)}
                                        className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900/50 transition-colors font-bold text-xs"
                                    >
                                        <FiTrash2 size={14} />
                                        {['pending', 'queued', 'Queued'].includes(selectedEvent.status) ? 'Cancelar' : 'Excluir'}
                                    </button>
                                )}
                            </div>
                        </>
                    ) : (
                        <>
                            {/* --- EDIT MODE --- */}
                            <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl border border-gray-100 dark:border-gray-700 space-y-4">
                                <h4 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                    <FiEdit2 className="text-blue-500" /> Editar Agendamento
                                </h4>

                                <div>
                                    <label className="block text-xs font-bold uppercase text-gray-500 dark:text-gray-400 mb-1">Nova Data</label>
                                    <input
                                        type="date"
                                        value={editDate}
                                        onChange={e => setEditDate(e.target.value)}
                                        className="w-full px-3 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold uppercase text-gray-500 dark:text-gray-400 mb-1">Novo Horário</label>
                                    <input
                                        type="time"
                                        value={editTime}
                                        onChange={e => setEditTime(e.target.value)}
                                        className="w-full px-3 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                    />
                                </div>

                                <div className="flex gap-2 pt-2">
                                    <button
                                        onClick={() => setIsEditing(false)}
                                        className="flex-1 py-2 rounded-lg text-gray-600 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-700 transition"
                                        disabled={isSaving}
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={handleUpdateEvent}
                                        disabled={isSaving}
                                        className="flex-1 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {isSaving ? <div className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full"></div> : "Salvar Alterações"}
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default EventDetailsModal;
