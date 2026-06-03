import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { API_URL } from '../../../config';
import { fetchWithAuth } from '../../../AuthContext';
import { useClient } from '../../../contexts/ClientContext';
import { FiMousePointer, FiX } from 'react-icons/fi';

const ManualInteractionModal = ({ isOpen, onClose, triggerId, onRefresh }) => {
    const { activeClient } = useClient();
    const [phonesInput, setPhonesInput] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        if (!activeClient) return toast.error('Selecione um cliente primeiro');
        
        const lines = phonesInput.split('\n')
            .map(line => line.trim().replace(/\D/g, ''))
            .filter(phone => phone.length >= 8);

        if (lines.length === 0) {
            return toast.error('Insira pelo menos um telefone válido (apenas números, mínimo de 8 dígitos).');
        }

        setLoading(true);
        const loadToast = toast.loading(`Iniciando funil de interação para ${lines.length} contatos...`);

        try {
            const res = await fetchWithAuth(`${API_URL}/triggers/${triggerId}/manual-interaction`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phones: lines })
            }, activeClient.id);

            if (res.ok) {
                const data = await res.json();
                toast.dismiss(loadToast);
                toast.success(`${data.triggered_count} contatos ativados no funil de interação!`, { icon: '🔥' });
                setPhonesInput('');
                onRefresh();
                onClose();
            } else {
                const err = await res.json();
                throw new Error(err.detail || 'Falha ao processar a ativação manual.');
            }
        } catch (error) {
            console.error('Erro na ativação manual de interações:', error);
            toast.dismiss(loadToast);
            toast.error(error.message || 'Erro ao comunicar com o servidor');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[20050] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-[#1e293b] border border-white/5 rounded-[2rem] w-full max-w-md flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="p-5 border-b border-white/5 bg-[#0f172a]/50 flex justify-between items-center rounded-t-[2rem]">
                    <h3 className="font-bold text-white text-base flex items-center gap-2">
                        <FiMousePointer className="text-orange-400" size={16} />
                        Disparar Interação Manual
                    </h3>
                    <button 
                        onClick={() => !loading && onClose()} 
                        className="text-gray-400 hover:text-gray-200 transition disabled:opacity-50"
                        disabled={loading}
                    >
                        <FiX size={20} />
                    </button>
                </div>
                
                <div className="p-6 space-y-4">
                    <p className="text-[11px] text-gray-400 font-medium leading-relaxed">
                        Cole abaixo os números de telefone dos contatos que interagiram e que devem receber o **Funil de Interação** configurado para este disparo. Insira um número de telefone por linha.
                    </p>
                    
                    <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">
                            Números de Telefone (Um por linha)
                        </label>
                        <textarea
                            disabled={loading}
                            rows={6}
                            placeholder="Ex:&#10;5511999999999&#10;5521888888888"
                            className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-xs font-mono text-white placeholder:text-slate-600 hover:border-orange-500/30 focus:border-orange-500/50 outline-none transition-all shadow-inner resize-none"
                            value={phonesInput}
                            onChange={(e) => setPhonesInput(e.target.value)}
                        />
                    </div>
                </div>
                
                <div className="p-5 border-t border-white/5 bg-[#0f172a]/50 flex justify-end gap-3 rounded-b-[2rem]">
                    <button 
                        onClick={onClose}
                        disabled={loading}
                        className="px-4 py-2 bg-slate-800 text-gray-300 hover:bg-slate-700 rounded-lg text-xs font-black uppercase tracking-wider transition-all disabled:opacity-50"
                    >
                        Cancelar
                    </button>
                    <button 
                        onClick={handleSubmit}
                        disabled={loading || !phonesInput.trim()}
                        className="px-5 py-2 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-orange-950/20 flex items-center gap-2"
                    >
                        {loading ? (
                            <>
                                <span className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                                Disparando...
                            </>
                        ) : (
                            'Iniciar Funil'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ManualInteractionModal;
