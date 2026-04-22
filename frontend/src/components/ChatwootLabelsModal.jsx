import React, { useState, useEffect } from 'react';
import { FiX, FiTag, FiPlus, FiTrash2, FiSave, FiInfo } from 'react-icons/fi';
import { API_URL } from '../config';
import { fetchWithAuth } from '../AuthContext';
import { useClient } from '../contexts/ClientContext';
import { toast } from 'react-hot-toast';

const PRESET_COLORS = [
    '#3352f9', '#f93333', '#33f933', '#f9a633', '#f933f9', '#33f9f9', '#7c33f9', '#000000', '#6b7280'
];

const ChatwootLabelsModal = ({ isOpen, onClose }) => {
    const { activeClient } = useClient();
    const [labels, setLabels] = useState([]);
    const [loading, setLoading] = useState(false);
    const [newTitle, setNewTitle] = useState('');
    const [newColor, setNewColor] = useState('#3352f9');
    const [newDescription, setNewDescription] = useState('');

    useEffect(() => {
        if (isOpen && activeClient) {
            fetchLabels();
        }
    }, [isOpen, activeClient]);

    const fetchLabels = async () => {
        setLoading(true);
        try {
            const res = await fetchWithAuth(`${API_URL}/chatwoot/labels`, {}, activeClient.id);
            if (res.ok) {
                const data = await res.json();
                setLabels(Array.isArray(data) ? data : []);
            }
        } catch (error) {
            console.error("Erro ao carregar etiquetas:", error);
            toast.error("Erro ao carregar etiquetas");
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        if (!newTitle.trim()) {
            toast.error("Título é obrigatório");
            return;
        }

        const loadingToast = toast.loading("Criando etiqueta...");
        try {
            const res = await fetchWithAuth(`${API_URL}/chatwoot/labels`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: newTitle.trim(),
                    color: newColor,
                    description: newDescription
                })
            }, activeClient.id);

            if (res.ok) {
                toast.dismiss(loadingToast);
                toast.success("Etiqueta criada no Chatwoot!");
                setNewTitle('');
                setNewDescription('');
                fetchLabels();
            } else {
                const err = await res.json();
                toast.dismiss(loadingToast);
                toast.error(err.detail || "Erro ao criar etiqueta");
            }
        } catch (error) {
            toast.dismiss(loadingToast);
            toast.error("Erro de conexão");
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-gray-800 rounded-3xl w-full max-w-2xl shadow-2xl border border-gray-100 dark:border-gray-700 flex flex-col max-h-[85vh] overflow-hidden">
                {/* Header */}
                <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
                    <div>
                        <h3 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                            <FiTag className="text-blue-500" /> Etiquetas do Chatwoot
                        </h3>
                        <p className="text-xs text-gray-500 mt-1">Gerencie as etiquetas (tags) disponíveis na sua conta do Chatwoot</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors">
                        <FiX size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Formulário de Criação */}
                    <form onSubmit={handleCreate} className="bg-gray-50 dark:bg-gray-900/50 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Nome da Etiqueta</label>
                                <input
                                    type="text"
                                    value={newTitle}
                                    onChange={(e) => setNewTitle(e.target.value.replace(/\s+/g, '-'))}
                                    placeholder="ex: Lead Quente"
                                    className="w-full p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Cor da Etiqueta</label>
                                <div className="flex items-center gap-3">
                                    <input
                                        type="color"
                                        value={newColor}
                                        onChange={(e) => setNewColor(e.target.value)}
                                        className="h-10 w-10 p-0 border-none bg-transparent cursor-pointer"
                                    />
                                    <div className="flex flex-wrap gap-1">
                                        {PRESET_COLORS.map(c => (
                                            <button
                                                key={c}
                                                type="button"
                                                onClick={() => setNewColor(c)}
                                                className={`w-6 h-6 rounded-full border-2 ${newColor === c ? 'border-blue-500 scale-110' : 'border-transparent'}`}
                                                style={{ backgroundColor: c }}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Descrição (Opcional)</label>
                            <input
                                type="text"
                                value={newDescription}
                                onChange={(e) => setNewDescription(e.target.value)}
                                placeholder="Pequena descrição da finalidade desta etiqueta"
                                className="w-full p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={!newTitle.trim()}
                            className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2"
                        >
                            <FiPlus /> Adicionar Etiqueta no Chatwoot
                        </button>
                    </form>

                    {/* Lista de Etiquetas */}
                    <div className="space-y-3">
                        <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Etiquetas Existentes ({labels.length})</h4>
                        {loading ? (
                            <div className="flex justify-center py-10">
                                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                            </div>
                        ) : labels.length === 0 ? (
                            <div className="text-center py-10 border-2 border-dashed border-gray-100 dark:border-gray-700 rounded-2xl text-gray-400 text-sm">
                                Nenhuma etiqueta encontrada.
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {labels.map(l => (
                                    <div key={l.id} className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl shadow-sm">
                                        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: l.color }} />
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-sm text-gray-800 dark:text-gray-200 truncate">{l.title}</p>
                                            {l.description && <p className="text-[10px] text-gray-500 truncate">{l.description}</p>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80">
                    <button onClick={onClose} className="w-full py-3 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 rounded-xl font-bold hover:bg-gray-100 dark:hover:bg-gray-700 transition-all">
                        Fechar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ChatwootLabelsModal;
