import React, { useState, useEffect } from 'react';
import { FiX, FiPlus, FiTrash2, FiSave, FiAlertCircle, FiCheck, FiInfo } from 'react-icons/fi';
import { API_URL } from '../config';
import { fetchWithAuth } from '../AuthContext';
import { useClient } from '../contexts/ClientContext';
import { toast } from 'react-hot-toast';

const GlobalsModal = ({ isOpen, onClose }) => {
    const { activeClient } = useClient();
    const [variables, setVariables] = useState([]);
    const [loading, setLoading] = useState(false);
    const [newName, setNewName] = useState('');
    const [newValue, setNewValue] = useState('');
    const [editingId, setEditingId] = useState(null);

    useEffect(() => {
        if (isOpen && activeClient) {
            fetchVariables();
        }
    }, [isOpen, activeClient]);

    const fetchVariables = async () => {
        setLoading(true);
        try {
            const res = await fetchWithAuth(`${API_URL}/globals`, {}, activeClient.id);
            if (res.ok) {
                const data = await res.json();
                setVariables(data);
            }
        } catch (error) {
            console.error("Erro ao carregar variáveis:", error);
            toast.error("Erro ao carregar variáveis");
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        if (!newName.trim()) return;

        // Validar nome da variável (apenas letras, números e underscore)
        const nameRegex = /^[a-zA-Z0-9_]+$/;
        if (!nameRegex.test(newName)) {
            toast.error("Nome da variável deve conter apenas letras, números e sublinhados (_)");
            return;
        }

        try {
            const url = editingId
                ? `${API_URL}/globals/${editingId}`
                : `${API_URL}/globals`;
            const method = editingId ? 'PUT' : 'POST';

            const res = await fetchWithAuth(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newName, value: newValue })
            }, activeClient.id);

            if (res.ok) {
                toast.success(editingId ? "Variável atualizada!" : "Variável global configurada!");
                setNewName('');
                setNewValue('');
                setEditingId(null);
                fetchVariables();
            } else {
                const err = await res.json();
                toast.error(err.detail || "Erro ao criar variável");
            }
        } catch (error) {
            toast.error("Erro de conexão");
        }
    };

    const handleDelete = async (id) => {
        try {
            const res = await fetchWithAuth(`${API_URL}/globals/${id}`, {
                method: 'DELETE'
            }, activeClient.id);

            if (res.ok) {
                toast.success("Variável excluída");
                fetchVariables();
            }
        } catch (error) {
            toast.error("Erro ao excluir");
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-gray-800 rounded-3xl w-full max-w-2xl shadow-2xl border border-gray-100 dark:border-gray-700 flex flex-col max-h-[85vh] overflow-hidden">
                {/* Header */}
                <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
                    <div>
                        <h3 className="text-xl font-bold text-gray-800 dark:text-white">Variáveis Globais</h3>
                        <p className="text-xs text-gray-500 mt-1">Defina valores que podem ser usados em qualquer funil usando {"{{nome_da_variavel}}"}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors">
                        <FiX size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Guia de uso */}
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/50 p-4 rounded-2xl flex gap-3">
                        <FiInfo className="text-blue-500 shrink-0 mt-1" size={20} />
                        <div className="text-xs text-blue-800 dark:text-blue-300 leading-relaxed">
                            <p className="font-bold mb-1">Como usar:</p>
                            <p>Crie uma variável chamada <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">preco_site</code> com o valor <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">R$ 97,00</code>. No seu funil, escreva: <br />
                                <span className="italic">"O valor do curso é {"{{preco_site}}"}"</span>. O sistema trocará automaticamente pelo valor definido aqui.</p>
                        </div>
                    </div>

                    {/* Formulário de Criação */}
                    <form onSubmit={handleCreate} className="globals-form bg-gray-50 dark:bg-gray-900/50 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Nome da Variável</label>
                                <input
                                    type="text"
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value.toLowerCase().replace(/\s/g, '_'))}
                                    placeholder="ex: nome_do_produto"
                                    className="w-full p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Valor</label>
                                <input
                                    type="text"
                                    value={newValue}
                                    onChange={(e) => setNewValue(e.target.value)}
                                    placeholder="ex: ZapVoice v2"
                                    className="w-full p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                />
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button
                                type="submit"
                                disabled={!newName}
                                className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2"
                            >
                                {editingId ? <FiSave /> : <FiPlus />}
                                {editingId ? "Atualizar Variável" : "Salvar Variável"}
                            </button>
                            {editingId && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setEditingId(null);
                                        setNewName('');
                                        setNewValue('');
                                    }}
                                    className="px-4 py-3 bg-gray-100 dark:bg-gray-800 text-gray-500 rounded-xl font-bold text-sm hover:bg-gray-200"
                                >
                                    Cancelar
                                </button>
                            )}
                        </div>
                    </form>

                    {/* Lista de Variáveis */}
                    <div className="space-y-3">
                        <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Suas Variáveis Ativas ({variables.length})</h4>
                        {loading ? (
                            <div className="flex justify-center py-10">
                                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                            </div>
                        ) : variables.length === 0 ? (
                            <div className="text-center py-10 border-2 border-dashed border-gray-100 dark:border-gray-700 rounded-2xl text-gray-400 text-sm">
                                Nenhuma variável global definida.
                            </div>
                        ) : (
                            <div className="grid gap-2">
                                {variables.map(v => (
                                    <div key={v.id} className="group flex items-center justify-between p-4 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl hover:border-blue-200 dark:hover:border-blue-900/50 transition-all shadow-sm">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <code className="text-blue-600 dark:text-blue-400 font-bold text-sm">{"{{"}{v.name}{"}}"}</code>
                                            </div>
                                            <p className="text-gray-500 dark:text-gray-400 text-xs mt-1 truncate">{v.value}</p>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => {
                                                    setEditingId(v.id);
                                                    setNewName(v.name);
                                                    setNewValue(v.value);
                                                    // Scroll to top of form
                                                    document.querySelector('.globals-form')?.scrollIntoView({ behavior: 'smooth' });
                                                }}
                                                className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                                title="Editar variável"
                                            >
                                                <FiPlus size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(v.id)}
                                                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                                title="Excluir variável"
                                            >
                                                <FiTrash2 size={16} />
                                            </button>
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

export default GlobalsModal;
