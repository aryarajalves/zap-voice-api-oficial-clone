import React from 'react';
import { FiTag, FiEdit2, FiTrash2 } from 'react-icons/fi';

const ChatwootLabelsSection = ({
    user,
    formData,
    fetchLabels,
    loadingLabels,
    labelForm,
    setLabelForm,
    editingLabel,
    setEditingLabel,
    isAddingLabel,
    handleUpdateLabel,
    handleAddLabel,
    handleDeleteLabel,
    labels
}) => {
    const isAllowedRole = ['super_admin', 'admin', 'administrator', 'owner'].includes(user?.role);
    const hasCredentials = Boolean(formData.CHATWOOT_API_URL && formData.CHATWOOT_API_TOKEN);

    if (!isAllowedRole || !hasCredentials) {
        return null;
    }

    return (
        <div className="space-y-4 pt-6 border-t border-gray-100 dark:border-white/5">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="p-1.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg">
                        <FiTag className="h-5 w-5" />
                    </span>
                    <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200">Gerenciar Etiquetas</h3>
                </div>
                <button
                    type="button"
                    onClick={fetchLabels}
                    className="text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1 transition-all cursor-pointer"
                >
                    {loadingLabels ? "Atualizando..." : "🔄 Atualizar"}
                </button>
            </div>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed italic border-l-2 border-indigo-200 dark:border-indigo-800 pl-3">
                Gerencie as etiquetas do Chatwoot. Você pode criar novas com cores personalizadas ou editar as existentes.
            </p>

            <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl border border-gray-100 dark:border-white/5 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Nome da Etiqueta</label>
                        <input
                            type="text"
                            value={labelForm.title}
                            onChange={(e) => setLabelForm({ ...labelForm, title: e.target.value })}
                            placeholder="Ex: Urgente, Suporte..."
                            className="w-full p-2 border border-gray-300 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all bg-white dark:bg-[#1f2937]/50 text-sm"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Cor da Etiqueta</label>
                        <div className="flex gap-2">
                            <input
                                type="color"
                                value={labelForm.color}
                                onChange={(e) => setLabelForm({ ...labelForm, color: e.target.value })}
                                className="w-10 h-10 p-0.5 border border-gray-300 dark:border-white/10 rounded-lg cursor-pointer bg-white dark:bg-[#1f2937]/50"
                            />
                            <input
                                type="text"
                                value={labelForm.color}
                                onChange={(e) => setLabelForm({ ...labelForm, color: e.target.value })}
                                placeholder="#3352f9"
                                className="flex-1 p-2 border border-gray-300 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all bg-white dark:bg-[#1f2937]/50 text-sm font-mono"
                            />
                        </div>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={editingLabel ? handleUpdateLabel : handleAddLabel}
                        disabled={isAddingLabel || !labelForm.title}
                        className={`flex-1 py-2 ${editingLabel ? 'bg-amber-500 hover:bg-amber-600' : 'bg-indigo-600 hover:bg-indigo-700'} text-white font-bold rounded-lg transition-all shadow-md active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer`}
                    >
                        {isAddingLabel ? 'Processando...' : editingLabel ? 'Atualizar Etiqueta' : 'Criar Nova Etiqueta'}
                    </button>
                    {editingLabel && (
                        <button
                            type="button"
                            onClick={() => {
                                setEditingLabel(null);
                                setLabelForm({ title: '', color: '#3352f9' });
                            }}
                            className="px-4 py-2 bg-gray-200 dark:bg-[#1f2937]/50 text-gray-700 dark:text-gray-200 font-bold rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-all cursor-pointer"
                        >
                            Cancelar
                        </button>
                    )}
                </div>

                {/* List of Existing Labels */}
                <div className="space-y-3 pt-4 border-t border-gray-100 dark:border-white/5">
                    <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Etiquetas no Chatwoot</h4>
                    {loadingLabels ? (
                        <div className="flex justify-center p-4">
                            <div className="animate-spin h-5 w-5 border-2 border-indigo-500 border-t-transparent rounded-full"></div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                            {labels && labels.length > 0 ? (
                                labels.map(label => (
                                    <div key={label.id} className="flex items-center justify-between p-2.5 bg-white dark:bg-[#1f2937]/80 rounded-xl border border-gray-100 dark:border-white/5 hover:shadow-sm transition-all group">
                                        <div className="flex items-center gap-3">
                                            <div 
                                                className="w-4 h-4 rounded-full border border-gray-200 dark:border-white/10 shadow-inner"
                                                style={{ backgroundColor: label.color }}
                                            ></div>
                                            <span className="text-xs font-bold text-gray-700 dark:text-gray-200 truncate max-w-[120px]">{label.title}</span>
                                        </div>
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setEditingLabel(label);
                                                    setLabelForm({ title: label.title, color: label.color });
                                                }}
                                                className="p-1.5 text-gray-400 hover:text-amber-500 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-900/20 cursor-pointer"
                                                title="Editar Etiqueta"
                                            >
                                                <FiEdit2 size={14} />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleDeleteLabel(label.id)}
                                                className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 cursor-pointer"
                                                title="Excluir Etiqueta"
                                            >
                                                <FiTrash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-center text-gray-400 text-xs py-4 italic col-span-2">Nenhuma etiqueta encontrada.</p>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ChatwootLabelsSection;
