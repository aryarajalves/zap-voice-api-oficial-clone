import React from 'react';
import { FiUsers, FiZap, FiClock, FiTrash2, FiEdit2, FiInfo, FiRefreshCw } from 'react-icons/fi';
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
    const [confirmDispatch, setConfirmDispatch] = React.useState(false);
    const [isDispatching, setIsDispatching] = React.useState(false);

    const handleImmediateDispatch = async () => {
        setIsDispatching(true);
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
        } finally {
            setIsDispatching(false);
            setConfirmDispatch(false);
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

                            {selectedEvent.is_dynamic_label && (
                                <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-900/50 rounded-lg shadow-sm">
                                    <label className="block text-[10px] font-bold uppercase text-emerald-600 dark:text-emerald-400 mb-1 tracking-wider italic font-black flex items-center gap-1">
                                        <FiRefreshCw size={10} /> Agendamento Dinâmico por Etiqueta 🔄
                                    </label>
                                    <p className="text-xs text-emerald-700 dark:text-emerald-300 italic">
                                        Novos leads da etiqueta &quot;{selectedEvent.dynamic_label_name || 'Chatwoot'}&quot; serão incluídos automaticamente no disparo.
                                    </p>
                                </div>
                            )}

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
                                            onClick={() => setConfirmDispatch(true)}
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

            {/* Modal de Confirmação de Disparo Imediato */}
            {confirmDispatch && (
                <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4">
                    {/* Backdrop sem onClick para proibir o fechamento clicando fora */}
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200" />

                    {/* Card de Confirmação Centralizado */}
                    <div 
                        className="relative bg-white dark:bg-[#1e293b] rounded-[2rem] shadow-2xl max-w-sm w-full overflow-hidden border border-gray-100 dark:border-white/10 p-6 animate-in zoom-in-95 fade-in duration-200"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="h-1.5 w-full bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-500 absolute top-0 left-0" />
                        
                        <div className="flex flex-col items-center text-center gap-4 pt-2">
                            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 shadow-lg shadow-emerald-500/10">
                                <FiZap size={36} />
                            </div>

                            <div className="space-y-2">
                                <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">
                                    Disparar Agora?
                                </h3>
                                <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed font-medium">
                                    Tem certeza que deseja antecipar e iniciar o disparo deste agendamento neste momento?
                                </p>
                            </div>
                        </div>

                        <div className="flex justify-center gap-3 mt-6">
                            <button
                                onClick={() => setConfirmDispatch(false)}
                                disabled={isDispatching}
                                className="flex-1 py-2.5 rounded-xl text-gray-700 dark:text-gray-300 font-bold uppercase tracking-wider text-[11px] hover:bg-gray-100 dark:hover:bg-white/5 transition border border-gray-200 dark:border-white/10 active:scale-95 disabled:opacity-50"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleImmediateDispatch}
                                disabled={isDispatching}
                                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold uppercase tracking-wider text-[11px] shadow-lg shadow-emerald-500/20 transition active:scale-95 flex items-center justify-center gap-1.5 disabled:opacity-50"
                            >
                                {isDispatching ? (
                                    <div className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
                                ) : (
                                    <>
                                        <FiZap size={14} /> Confirmo
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EventDetailsModal;
