import React from 'react';
import { FiPlus, FiCheck, FiRepeat } from 'react-icons/fi';

export const COLOR_PRESETS = [
    { value: '#3B82F6', name: 'Azul' },
    { value: '#10B981', name: 'Verde' },
    { value: '#F59E0B', name: 'Laranja' },
    { value: '#EF4444', name: 'Vermelho' },
    { value: '#8B5CF6', name: 'Roxo' },
    { value: '#EC4899', name: 'Rosa' },
    { value: '#06B6D4', name: 'Ciano' },
    { value: '#6366F1', name: 'Indigo' }
];

const LabelForm = ({
    name,
    setName,
    color,
    setColor,
    editingLabel,
    setEditingLabel,
    handleSaveLabel,
    loading,
    onTransfer
}) => {
    return (
        <div className="bg-gray-50/50 dark:bg-white/5 border border-gray-100 dark:border-white/5 p-5 rounded-2xl space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <div className="flex justify-between items-center mb-2">
                        <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                            {editingLabel ? 'Editar Nome da Etiqueta' : 'Nome da Etiqueta'}
                        </label>
                        <span className="text-[10px] text-gray-400 font-semibold">
                            {name ? name.length : 0}/25 caracteres
                        </span>
                    </div>
                    <input
                        type="text"
                        placeholder="Ex: Suporte, Lead Quente..."
                        value={name}
                        maxLength={25}
                        onChange={(e) => setName(e.target.value.slice(0, 25))}
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

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <div>
                    {editingLabel && onTransfer && (
                        <button
                            type="button"
                            onClick={() => onTransfer(editingLabel)}
                            className="px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl font-bold text-sm transition-all flex items-center gap-1.5 border border-emerald-500/20"
                            title="Transferir contatos deste marcador para outro"
                        >
                            <FiRepeat size={15} />
                            Transferir Contatos
                        </button>
                    )}
                </div>

                <div className="flex items-center gap-3">
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
        </div>
    );
};

export default LabelForm;
