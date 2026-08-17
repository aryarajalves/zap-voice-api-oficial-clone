import React from 'react';
import { FiTag, FiX } from 'react-icons/fi';

export default function BulkTagModal({
    isOpen,
    onClose,
    availableLabels = [],
    selectedBulkTag,
    setSelectedBulkTag,
    customBulkTag,
    setCustomBulkTag,
    onApply,
    isApplying,
    selectedCount
}) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-5" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg">
                            <FiTag size={18} />
                        </div>
                        <div>
                            <h3 className="font-bold text-white text-base">Etiquetar Contatos</h3>
                            <p className="text-xs text-slate-400">
                                Aplicando em <strong>{selectedCount}</strong> contato(s) selecionado(s)
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-white p-1"
                    >
                        <FiX size={18} />
                    </button>
                </div>

                <div className="space-y-4">
                    {availableLabels.length > 0 && (
                        <div>
                            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                                Escolher etiqueta existente:
                            </label>
                            <select
                                value={selectedBulkTag}
                                onChange={e => { setSelectedBulkTag(e.target.value); if (e.target.value) setCustomBulkTag(''); }}
                                className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                            >
                                <option value="">-- Selecione uma etiqueta --</option>
                                {availableLabels.map(l => (
                                    <option key={l} value={l}>{l}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                            {availableLabels.length > 0 ? 'Ou criar/digitar nova etiqueta:' : 'Digite o nome da etiqueta:'}
                        </label>
                        <input
                            type="text"
                            value={customBulkTag}
                            onChange={e => { setCustomBulkTag(e.target.value); if (e.target.value) setSelectedBulkTag(''); }}
                            placeholder="Ex: VIP, Interessado, Lead 2026"
                            className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-blue-500 placeholder-slate-500"
                        />
                    </div>
                </div>

                <div className="flex justify-end gap-3 border-t border-slate-800 pt-4">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-700 transition"
                        disabled={isApplying}
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={onApply}
                        disabled={isApplying || (!selectedBulkTag && !customBulkTag.trim())}
                        className="px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition flex items-center gap-2"
                    >
                        {isApplying ? 'Aplicando...' : 'Aplicar Etiqueta'}
                    </button>
                </div>
            </div>
        </div>
    );
}
