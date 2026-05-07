import React, { useState, useEffect } from 'react';
import { FiX, FiPlay, FiClock, FiUsers, FiSettings, FiAlertTriangle } from 'react-icons/fi';
import RecipientSelector from './RecipientSelector';
import InboxSelector from './InboxSelector';
import { toast } from 'react-hot-toast';
import { API_URL } from '../config';
import { fetchWithAuth } from '../AuthContext';
import { useClient } from '../contexts/ClientContext';

const TriggerFunnelModal = ({ isOpen, onClose, funnel, onTriggerSuccess }) => {
    const { activeClient } = useClient();
    
    // States
    const [selectedConversations, setSelectedConversations] = useState([]);
    const [selectedInbox, setSelectedInbox] = useState(null);
    const [scheduleMode, setScheduleMode] = useState(false);
    const [scheduledTime, setScheduledTime] = useState('');
    const [delay, setDelay] = useState(5);
    const [concurrency, setConcurrency] = useState(1);
    const [isSending, setIsSending] = useState(false);

    // Reset states when funnel changes or modal opens
    useEffect(() => {
        if (isOpen) {
            setSelectedConversations([]);
            setScheduleMode(false);
            setScheduledTime('');
        }
    }, [isOpen, funnel]);

    if (!isOpen || !funnel) return null;

    const handleTrigger = async () => {
        if (selectedConversations.length === 0) {
            toast.error("Selecione pelo menos um contato.");
            return;
        }
        if (scheduleMode && !scheduledTime) {
            toast.error("Selecione uma data e hora para agendar.");
            return;
        }

        setIsSending(true);
        const total = selectedConversations.length;
        const useBulkEndpoint = total > 1 || scheduleMode;

        try {
            if (useBulkEndpoint) {
                const contactName = total === 1
                    ? (selectedConversations[0].contact_name || selectedConversations[0].phone || 'Contato')
                    : `Disparo em Massa (${total} contatos)`;

                const res = await fetchWithAuth(`${API_URL}/funnels/${funnel.id}/trigger-bulk`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        conversations: selectedConversations.map(c => ({
                            id: c.conversation_id,
                            inbox_id: selectedInbox,
                            meta: {
                                sender: {
                                    name: c.contact_name || c.phone,
                                    phone_number: c.phone
                                }
                            }
                        })),
                        schedule_at: scheduleMode ? new Date(scheduledTime).toISOString() : null,
                        contact_name: contactName,
                        delay_seconds: parseInt(delay),
                        concurrency_limit: parseInt(concurrency)
                    })
                }, activeClient?.id);

                if (!res.ok) {
                    const err = await res.json();
                    throw new Error(err.detail || 'Erro ao processar disparo');
                }

                if (scheduleMode) toast.success("Agendamento realizado!");
                else toast.success("Disparo iniciado!");
                
            } else {
                // Single Trigger
                const conv = selectedConversations[0];
                const convId = conv.conversation_id || '0';
                let url = `${API_URL}/funnels/${funnel.id}/trigger?conversation_id=${convId}`;
                const name = conv.contact_name || conv.phone;
                const phone = conv.phone;
                if (selectedInbox) url += `&inbox_id=${selectedInbox}`;
                url += `&contact_name=${encodeURIComponent(name)}&contact_phone=${encodeURIComponent(phone)}`;

                const response = await fetchWithAuth(url, { method: 'POST' }, activeClient?.id);
                if (!response.ok) throw new Error('Falha ao disparar funil');
                toast.success("Funil disparado com sucesso!");
            }

            onTriggerSuccess();
            onClose();
        } catch (error) {
            console.error(error);
            toast.error(error.message);
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-[#1e293b] rounded-[2.5rem] w-full max-w-2xl max-h-[90vh] shadow-2xl border border-gray-100 dark:border-white/5 flex flex-col overflow-hidden animate-zoom-in">
                
                {/* Header */}
                <div className="px-8 py-8 border-b border-gray-100 dark:border-white/5 flex justify-between items-center bg-gray-50/50 dark:bg-white/5">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-xl shadow-blue-500/10">
                            <FiPlay size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-gray-800 dark:text-white uppercase tracking-tight">Disparar Funil</h2>
                            <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium italic">Funil: <span className="font-bold text-blue-600 dark:text-blue-400">{funnel.name}</span></p>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-700">
                    
                    <div className="space-y-6">
                        {/* Destination */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-gray-400 uppercase text-[10px] font-bold tracking-widest">
                                <FiUsers /> Destinatários
                            </div>
                            <div className="hidden">
                                <InboxSelector onSelect={setSelectedInbox} />
                            </div>
                            <RecipientSelector 
                                selectedInbox={selectedInbox} 
                                onSelect={setSelectedConversations} 
                                requireOpenWindow={true} 
                            />
                        </div>

                        {/* Configuration */}
                        <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-gray-700/50">
                            <div className="flex items-center gap-2 text-gray-400 uppercase text-[10px] font-bold tracking-widest">
                                <FiSettings /> Configurações de Envio
                            </div>
                            
                            {/* Scheduling */}
                            <div className="bg-gray-50 dark:bg-[#0f172a]/40 p-4 rounded-2xl border border-gray-100 dark:border-white/5 space-y-3">
                                <label className="flex items-center justify-between cursor-pointer group">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-1.5 rounded-lg transition-colors ${scheduleMode ? 'bg-amber-100 text-amber-600' : 'bg-gray-200 dark:bg-gray-800 text-gray-400'}`}>
                                            <FiClock size={16} />
                                        </div>
                                        <span className="text-sm font-bold text-gray-700 dark:text-gray-200">Agendar para o futuro?</span>
                                    </div>
                                    <input 
                                        type="checkbox" 
                                        checked={scheduleMode} 
                                        onChange={(e) => setScheduleMode(e.target.checked)} 
                                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" 
                                    />
                                </label>

                                {scheduleMode && (
                                    <div className="space-y-3 animate-in slide-in-from-top-2 duration-200">
                                        <input
                                            type="datetime-local"
                                            value={scheduledTime}
                                            onChange={(e) => setScheduledTime(e.target.value)}
                                            className="w-full p-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm"
                                        />
                                        {(() => {
                                            if (!scheduledTime) return null;
                                            const now = new Date();
                                            const sched = new Date(scheduledTime);
                                            const diffHours = (sched - now) / (1000 * 60 * 60);

                                            if (diffHours >= 24) {
                                                return (
                                                    <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-xl flex gap-2">
                                                        <FiAlertTriangle className="text-amber-500 shrink-0" size={14} />
                                                        <p className="text-[10px] text-amber-800 dark:text-amber-300 font-medium leading-relaxed">
                                                            Atenção: Janela de 24h pode fechar sem Template.
                                                        </p>
                                                    </div>
                                                );
                                            }
                                            return null;
                                        })()}
                                    </div>
                                )}
                            </div>

                            {/* Advanced Params */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="p-3 bg-gray-50 dark:bg-gray-900/40 rounded-2xl border border-gray-100 dark:border-gray-700">
                                    <label className="block text-[9px] font-bold text-gray-400 mb-1 uppercase tracking-wider">Intervalo (Seg)</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={delay}
                                        onChange={(e) => setDelay(e.target.value)}
                                        className="w-full bg-transparent text-base font-bold text-gray-800 dark:text-white outline-none"
                                    />
                                </div>
                                <div className="p-3 bg-gray-50 dark:bg-gray-900/40 rounded-2xl border border-gray-100 dark:border-gray-700">
                                    <label className="block text-[9px] font-bold text-gray-400 mb-1 uppercase tracking-wider">Concorrência</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={concurrency}
                                        onChange={(e) => setConcurrency(e.target.value)}
                                        className="w-full bg-transparent text-base font-bold text-gray-800 dark:text-white outline-none"
                                    />
                                </div>
                            </div>

                            {/* Summary Card */}
                            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-100 dark:border-blue-800/50">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold uppercase">Resumo</span>
                                    <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-300 text-[9px] font-bold rounded-full">Pronto</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-600 dark:text-gray-400">Total de contatos:</span>
                                    <span className="font-bold text-gray-800 dark:text-white">{selectedConversations.length}</span>
                                </div>
                                {selectedConversations.length > 0 && selectedConversations.every(c => c.window_open) && (
                                    <div className="mt-3 flex items-center gap-2 py-1.5 px-3 bg-green-100 dark:bg-green-900/30 rounded-xl border border-green-200 dark:border-green-800/50">
                                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                        <span className="text-[10px] font-bold text-green-700 dark:text-green-400 uppercase tracking-wider">Janela de 24h Ativa para todos</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-8 py-6 bg-gray-50 dark:bg-[#0f172a]/40 border-t border-gray-100 dark:border-white/5 flex justify-end gap-3">
                    <button 
                        onClick={onClose}
                        className="px-6 py-3 rounded-2xl text-sm font-bold text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-all"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleTrigger}
                        disabled={selectedConversations.length === 0 || (scheduleMode && !scheduledTime) || isSending}
                        className={`px-10 py-3 rounded-2xl font-bold text-white shadow-lg transition-all flex items-center gap-2 ${
                            selectedConversations.length === 0 || isSending
                            ? 'bg-gray-300 dark:bg-gray-700 cursor-not-allowed grayscale'
                            : 'bg-blue-600 hover:bg-blue-700 hover:scale-105 active:scale-95 shadow-blue-500/25'
                        }`}
                    >
                        {isSending ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Processando...
                            </>
                        ) : (
                            <>
                                <FiPlay fill="currentColor" size={16} />
                                {scheduleMode ? 'AGENDAR DISPARO' : 'DISPARAR AGORA'}
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TriggerFunnelModal;
