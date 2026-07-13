import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { FiPlus, FiTrash2, FiTag, FiEdit2, FiCheck, FiX } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { API_URL } from '../../../config';

const COLOR_PRESETS = [
    { value: '#3B82F6', name: 'Azul' },
    { value: '#10B981', name: 'Verde' },
    { value: '#F59E0B', name: 'Laranja' },
    { value: '#EF4444', name: 'Vermelho' },
    { value: '#8B5CF6', name: 'Roxo' },
    { value: '#EC4899', name: 'Rosa' },
    { value: '#06B6D4', name: 'Ciano' },
    { value: '#6366F1', name: 'Indigo' }
];

const LabelsTab = ({ user, activeClient }) => {
    const [labels, setLabels] = useState([]);
    const [name, setName] = useState('');
    const [color, setColor] = useState('#3B82F6');
    const [loading, setLoading] = useState(false);
    const [loadingList, setLoadingList] = useState(true);
    const [editingLabel, setEditingLabel] = useState(null);

    // Controle do Modal de Deleção
    const [labelToDelete, setLabelToDelete] = useState(null);
    const [deletingId, setDeletingId] = useState(null);

    const getHeaders = () => {
        const token = localStorage.getItem('token');
        const clientId = activeClient?.id || user?.client_id || '';
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'X-Client-ID': String(clientId)
        };
    };

    const fetchLabels = async () => {
        setLoadingList(true);
        try {
            const response = await fetch(`${API_URL}/chat/labels/details`, {
                headers: getHeaders()
            });
            if (response.ok) {
                const data = await response.json();
                setLabels(data);
            } else {
                toast.error("Erro ao buscar marcadores.");
            }
        } catch (error) {
            console.error(error);
            toast.error("Falha na comunicação com o servidor.");
        } finally {
            setLoadingList(false);
        }
    };

    useEffect(() => {
        if (activeClient?.id || user?.client_id) {
            fetchLabels();
        } else {
            setLoadingList(false);
        }
    }, [activeClient?.id, user?.client_id]);

    const handleSaveLabel = async (e) => {
        if (e && typeof e.preventDefault === 'function') {
            e.preventDefault();
        }
        if (!name.trim()) {
            toast.error("Por favor, digite o nome da etiqueta.");
            return;
        }

        setLoading(true);
        try {
            const isEditing = editingLabel !== null;
            const method = isEditing ? 'PUT' : 'POST';
            const url = isEditing 
                ? `${API_URL}/chat/labels/${editingLabel.id}`
                : `${API_URL}/chat/labels`;

            const response = await fetch(url, {
                method: method,
                headers: getHeaders(),
                body: JSON.stringify({
                    name: name.trim(),
                    color: color
                })
            });

            if (response.ok) {
                toast.success(isEditing ? "Etiqueta atualizada com sucesso!" : "Etiqueta criada com sucesso!");
                setName('');
                setColor('#3B82F6');
                setEditingLabel(null);
                fetchLabels();
            } else {
                const err = await response.json();
                toast.error(err.detail || `Falha ao ${isEditing ? 'atualizar' : 'criar'} etiqueta.`);
            }
        } catch (error) {
            console.error(error);
            toast.error("Erro ao conectar com o servidor.");
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteLabel = async () => {
        if (!labelToDelete) return;
        setDeletingId(labelToDelete.id || labelToDelete.name);
        try {
            const url = labelToDelete.id > 0
                ? `${API_URL}/chat/labels/${labelToDelete.id}`
                : `${API_URL}/chat/labels/0?name=${encodeURIComponent(labelToDelete.name)}`;

            const response = await fetch(url, {
                method: 'DELETE',
                headers: getHeaders()
            });

            if (response.ok) {
                toast.success("Etiqueta excluída com sucesso!");
                setLabelToDelete(null);
                fetchLabels();
            } else {
                const err = await response.json();
                toast.error(err.detail || "Falha ao excluir etiqueta.");
            }
        } catch (error) {
            console.error(error);
            toast.error("Erro ao conectar com o servidor.");
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                    <FiTag className="text-blue-500" />
                    Gerenciar Marcadores / Etiquetas
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Crie e customize marcadores para classificar os contatos e conversas do atendimento em tempo real.
                </p>
            </div>

            {/* Form de Criação / Edição */}
            <div className="bg-gray-50/50 dark:bg-white/5 border border-gray-100 dark:border-white/5 p-5 rounded-2xl space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-2">
                            {editingLabel ? 'Editar Nome da Etiqueta' : 'Nome da Etiqueta'}
                        </label>
                        <input
                            type="text"
                            placeholder="Ex: Suporte, Financeiro, Lead Quente..."
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleSaveLabel();
                                }
                            }}
                            className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-white/10 text-gray-800 dark:text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-2">
                            Cor da Etiqueta
                        </label>
                        <div className="flex flex-wrap gap-2 items-center">
                            {COLOR_PRESETS.map((preset) => (
                                <button
                                    key={preset.value}
                                    type="button"
                                    onClick={() => setColor(preset.value)}
                                    title={preset.name}
                                    className={`w-8 h-8 rounded-full border-2 transition-all relative ${
                                        color === preset.value
                                            ? 'border-blue-500 scale-110 shadow-md'
                                            : 'border-transparent opacity-80 hover:opacity-100 hover:scale-105'
                                    }`}
                                    style={{ backgroundColor: preset.value }}
                                >
                                    {color === preset.value && (
                                        <span className="absolute inset-0 flex items-center justify-center text-white text-xs font-bold">✓</span>
                                    )}
                                </button>
                            ))}
                            {/* Seletor Customizado de Cor */}
                            <div className="relative w-8 h-8 rounded-full overflow-hidden border border-gray-300 dark:border-white/20 hover:scale-105 transition-all">
                                <input
                                    type="color"
                                    value={color}
                                    onChange={(e) => setColor(e.target.value)}
                                    className="absolute -inset-1 cursor-pointer w-12 h-12 p-0 border-0"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                    {editingLabel && (
                        <button
                            type="button"
                            onClick={() => {
                                setEditingLabel(null);
                                setName('');
                                setColor('#3B82F6');
                            }}
                            className="px-5 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-bold text-sm transition-all"
                        >
                            Cancelar Edição
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={handleSaveLabel}
                        disabled={loading}
                        className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm shadow-md hover:shadow-lg transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
                    >
                        {editingLabel ? <FiCheck size={16} /> : <FiPlus size={16} />}
                        {editingLabel ? 'Salvar Alterações' : 'Criar Marcador'}
                    </button>
                </div>
            </div>

            {/* Listagem de Marcadores */}
            <div className="space-y-3">
                <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300">
                    Marcadores Cadastrados
                </h4>

                {loadingList ? (
                    <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                        <svg className="animate-spin h-8 w-8 text-blue-500 mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span className="text-xs">Carregando marcadores...</span>
                    </div>
                ) : labels.length === 0 ? (
                    <div className="text-center py-12 bg-slate-900/40 backdrop-blur-md p-8 rounded-2xl border border-dashed border-white/5 shadow-inner flex flex-col items-center justify-center gap-2">
                        <div className="w-12 h-12 rounded-2xl bg-green-500/5 flex items-center justify-center border border-green-500/10 mb-2 shadow-lg shadow-green-500/5">
                            <FiTag className="text-green-400" size={20} />
                        </div>
                        <p className="text-xs font-black uppercase text-slate-300 tracking-wider">Nenhum Marcador Criado</p>
                        <p className="text-[10px] font-bold text-slate-500 max-w-[200px]">Crie o seu primeiro marcador utilizando o painel de cadastro acima.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        {labels.map((label) => (
                            <div
                                key={`${label.id}-${label.name}`}
                                className="flex items-center justify-between p-3.5 bg-white dark:bg-gray-800 border border-gray-100 dark:border-white/5 rounded-xl hover:shadow-md transition-all group"
                            >
                                <div className="flex items-center gap-2.5 min-w-0">
                                    <span
                                        className="w-3.5 h-3.5 rounded-full shrink-0"
                                        style={{ backgroundColor: label.color }}
                                    />
                                    <div className="flex flex-col min-w-0">
                                        <span className="text-sm font-bold text-gray-800 dark:text-gray-200 truncate pr-2">
                                            {label.name}
                                        </span>
                                        {label.is_legacy && (
                                            <span className="text-[9px] font-bold text-blue-500 bg-blue-500/10 px-1.5 py-0.5 rounded-md mt-0.5 w-max">
                                                Nas Conversas
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-0.5">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setEditingLabel(label);
                                            setName(label.name);
                                            setColor(label.color);
                                        }}
                                        className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-500/10 dark:hover:bg-blue-500/20 rounded-lg transition-colors"
                                        title="Editar Marcador"
                                    >
                                        <FiEdit2 size={14} />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setLabelToDelete(label)}
                                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-500/10 dark:hover:bg-red-500/20 rounded-lg transition-colors"
                                        title="Excluir Marcador"
                                    >
                                        <FiTrash2 size={14} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Modal de Confirmação de Exclusão (com portal no body) */}
            {labelToDelete && ReactDOM.createPortal(
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-[#1e293b] w-full max-w-md p-6 rounded-3xl shadow-2xl border border-gray-100 dark:border-white/5 animate-in zoom-in-95 duration-200 text-center">
                        <div className="w-14 h-14 bg-red-100 dark:bg-red-900/30 rounded-2xl flex items-center justify-center text-red-500 mx-auto mb-4">
                            <FiTrash2 size={24} />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Excluir Marcador</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                            Tem certeza que deseja excluir o marcador <strong className="text-gray-700 dark:text-gray-200">"{labelToDelete.name}"</strong>?
                            Esta ação é definitiva e removerá a etiqueta de qualquer busca ou filtro.
                        </p>
                        <div className="flex gap-3 justify-center">
                            <button
                                type="button"
                                onClick={() => setLabelToDelete(null)}
                                className="px-5 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-bold text-sm rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                disabled={deletingId !== null}
                                onClick={handleDeleteLabel}
                                className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-sm rounded-xl transition-all active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
                            >
                                {deletingId !== null ? (
                                    <>
                                        <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Excluindo...
                                    </>
                                ) : (
                                    "Excluir"
                                )}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default LabelsTab;
