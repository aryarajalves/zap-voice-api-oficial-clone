import React from 'react';
import { FiTag, FiX } from 'react-icons/fi';

const PRESET_COLORS = [
    { name: 'Vermelho', value: '#EF4444' },
    { name: 'Azul', value: '#3B82F6' },
    { name: 'Verde', value: '#10B981' },
    { name: 'Amarelo', value: '#F59E0B' },
    { name: 'Roxo', value: '#8B5CF6' },
    { name: 'Ciano', value: '#06B6D4' },
    { name: 'Rosa', value: '#EC4899' },
    { name: 'Cinza', value: '#6B7280' }
];

export default function NewTagModal({
    newTagModalData,
    setNewTagModalData,
    handleAddTagWithName
}) {
    if (!newTagModalData || !newTagModalData.isOpen) return null;

    return (
        <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
        >
            <div
                className="bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-white/10 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#0f172a]/60">
                    <div className="flex items-center gap-2 font-bold text-gray-800 dark:text-gray-100 text-sm">
                        <FiTag className="text-blue-500" size={18} />
                        <span>Escolher Cor para Novo Marcador</span>
                    </div>
                    <button
                        type="button"
                        onClick={() => setNewTagModalData(null)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-white/10 transition cursor-pointer"
                    >
                        <FiX size={18} />
                    </button>
                </div>

                <div className="p-6 space-y-4 font-sans">
                    <div>
                        <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-2">
                            Nome da Etiqueta (Máx. 20 caracteres)
                        </label>
                        <input
                            type="text"
                            maxLength={20}
                            value={newTagModalData.name}
                            onChange={(e) => setNewTagModalData(prev => ({ ...prev, name: e.target.value.slice(0, 20) }))}
                            className="w-full px-3 py-2 bg-gray-50 dark:bg-black/30 text-gray-800 dark:text-gray-100 text-xs rounded-xl border border-gray-200 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500 font-sans"
                        />
                        <span className="text-[10px] text-gray-400 mt-1 block text-right">
                            {newTagModalData.name ? newTagModalData.name.length : 0}/20 caracteres
                        </span>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-2">
                            Selecione a Cor da Etiqueta
                        </label>
                        <div className="flex flex-wrap gap-2 items-center">
                            {PRESET_COLORS.map((preset) => (
                                <button
                                    key={preset.value}
                                    type="button"
                                    onClick={() => setNewTagModalData(prev => ({ ...prev, color: preset.value }))}
                                    title={preset.name}
                                    className={`w-8 h-8 rounded-full border-2 transition-all relative cursor-pointer ${
                                        newTagModalData.color === preset.value
                                            ? 'border-blue-500 scale-110 shadow-md'
                                            : 'border-transparent opacity-80 hover:opacity-100 hover:scale-105'
                                    }`}
                                    style={{ backgroundColor: preset.value }}
                                >
                                    {newTagModalData.color === preset.value && (
                                        <span className="absolute inset-0 flex items-center justify-center text-white text-xs font-bold">✓</span>
                                    )}
                                </button>
                            ))}
                            <div className="relative w-8 h-8 rounded-full overflow-hidden border border-gray-300 dark:border-white/20 hover:scale-105 transition-all">
                                <input
                                    type="color"
                                    value={newTagModalData.color}
                                    onChange={(e) => setNewTagModalData(prev => ({ ...prev, color: e.target.value }))}
                                    className="absolute -inset-1 cursor-pointer w-12 h-12 p-0 border-0"
                                />
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-[11px] font-semibold text-gray-400 mb-1">
                            Pré-visualização:
                        </label>
                        <span
                            style={{
                                color: newTagModalData.color,
                                borderColor: newTagModalData.color + '33',
                                backgroundColor: newTagModalData.color + '15'
                            }}
                            className="text-xs px-2.5 py-1 rounded-lg inline-flex items-center gap-1.5 border font-semibold break-words max-w-full"
                        >
                            {newTagModalData.name || 'Nova Etiqueta'}
                        </span>
                    </div>
                </div>

                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#0f172a]/60">
                    <button
                        type="button"
                        onClick={() => setNewTagModalData(null)}
                        className="px-4 py-2 rounded-xl border border-gray-300 dark:border-white/10 text-gray-700 dark:text-gray-300 text-xs font-semibold hover:bg-gray-100 dark:hover:bg-white/5 transition cursor-pointer"
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        disabled={!newTagModalData.name || !newTagModalData.name.trim()}
                        onClick={async () => {
                            const finalName = newTagModalData.name.trim().slice(0, 20);
                            if (!finalName) return;
                            await handleAddTagWithName(finalName, newTagModalData.color);
                            setNewTagModalData(null);
                        }}
                        className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold transition-all shadow-md cursor-pointer"
                    >
                        Criar e Aplicar Marcador
                    </button>
                </div>
            </div>
        </div>
    );
}
