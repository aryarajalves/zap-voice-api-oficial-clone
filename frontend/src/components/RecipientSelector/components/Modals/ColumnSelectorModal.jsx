
import React from 'react';
import { createPortal } from 'react-dom';

const ColumnSelectorModal = ({
    isVisible,
    csvData,
    columnMapping,
    setColumnMapping,
    templateVariables,
    onConfirm,
    onClose
}) => {
    if (!isVisible) return null;

    const handleSelect = (idx, val) => {
        setColumnMapping(prev => {
            const next = { ...prev };
            // Remove this value from any other column first
            if (val !== 'ignore') {
                Object.keys(next).forEach(k => {
                    if (k !== String(idx) && next[k] === val) next[k] = 'ignore';
                });
            }
            next[String(idx)] = val;
            return next;
        });
    };

    return createPortal(
        <div className="fixed inset-0 z-[10000] bg-black/90 backdrop-blur-xl flex items-center justify-center p-6 animate-in fade-in duration-300">
            <div className="bg-[#0d1117] w-full max-w-2xl rounded-[2rem] border border-white/8 shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="flex justify-between items-center px-8 pt-8 pb-6 border-b border-white/5">
                    <div>
                        <h3 className="text-xl font-black text-white tracking-tight">Mapear Colunas</h3>
                        <p className="text-xs text-slate-500 mt-1">Clique nos badges para definir o que cada coluna representa</p>
                    </div>
                    <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-500 hover:text-white hover:bg-white/8 transition-all duration-200">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12" /></svg>
                    </button>
                </div>

                {/* Columns list */}
                <div className="px-8 py-5 space-y-3 max-h-[60vh] overflow-y-auto premium-scrollbar">
                    {csvData.nonEmptyIndices.map((idx) => {
                        const header = csvData.headers[idx] || `Coluna ${idx + 1}`;
                        const previewVal = csvData.rows[0]?.[idx];
                        const currentMapping = columnMapping[String(idx)] || 'ignore';

                        const allOptions = [
                            { value: 'ignore', label: 'Ignorar', icon: null, color: 'slate' },
                            { value: 'phone', label: 'Telefone', icon: '📞', color: 'blue' },
                            ...templateVariables.map(v => ({ value: v.key, label: v.label, icon: '✦', color: 'emerald' }))
                        ];

                        const takenByOthers = new Set(
                            Object.entries(columnMapping)
                                .filter(([k, v]) => k !== String(idx) && v !== 'ignore')
                                .map(([, v]) => v)
                        );

                        return (
                            <div key={idx} className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-white/10 transition-all duration-200">
                                {/* Column name */}
                                <div className="w-44 shrink-0">
                                    <div className="font-bold text-white text-sm truncate">{header}</div>
                                    {previewVal !== undefined && previewVal !== null && String(previewVal).trim() !== '' && (
                                        <div className="text-[10px] text-slate-600 truncate mt-0.5 font-mono">ex: {String(previewVal)}</div>
                                    )}
                                </div>

                                {/* Option pills */}
                                <div className="flex flex-wrap gap-2 flex-1">
                                    {allOptions.map(opt => {
                                        const isSelected = currentMapping === opt.value;
                                        const isTaken = takenByOthers.has(opt.value) && opt.value !== 'ignore';
                                        const colorMap = {
                                            slate: isSelected ? 'bg-slate-700 border-slate-500 text-slate-200' : 'bg-transparent border-slate-800 text-slate-600 hover:border-slate-600 hover:text-slate-400',
                                            blue: isSelected ? 'bg-blue-500/20 border-blue-400/60 text-blue-300 shadow-sm shadow-blue-500/20' : isTaken ? 'bg-transparent border-slate-800/50 text-slate-700 cursor-not-allowed' : 'bg-transparent border-slate-700 text-slate-500 hover:border-blue-500/50 hover:text-blue-400',
                                            emerald: isSelected ? 'bg-emerald-500/20 border-emerald-400/60 text-emerald-300 shadow-sm shadow-emerald-500/20' : isTaken ? 'bg-transparent border-slate-800/50 text-slate-700 cursor-not-allowed' : 'bg-transparent border-slate-700 text-slate-500 hover:border-emerald-500/50 hover:text-emerald-400',
                                        };
                                        return (
                                            <button
                                                key={opt.value}
                                                onClick={() => !isTaken && handleSelect(idx, opt.value)}
                                                disabled={isTaken}
                                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all duration-200 ${colorMap[opt.color]} ${isSelected ? 'scale-105' : 'hover:scale-[1.03]'}`}
                                            >
                                                {opt.icon && <span className="text-[10px]">{opt.icon}</span>}
                                                {opt.label}
                                                {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-current ml-0.5 opacity-70"></span>}
                                                {isTaken && <span className="opacity-40 text-[9px] ml-0.5">✓</span>}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Footer */}
                <div className="px-8 py-6 border-t border-white/5 flex gap-3">
                    <button
                        onClick={() => setColumnMapping({})}
                        className="px-6 py-3 text-slate-500 font-bold hover:text-white transition-all duration-200 uppercase text-xs rounded-xl hover:bg-white/5"
                    >
                        Limpar
                    </button>
                    <button
                        onClick={onConfirm}
                        className="flex-1 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl font-black text-sm uppercase tracking-widest transition-all duration-200 shadow-lg shadow-emerald-900/30 active:scale-[0.98]"
                    >
                        Confirmar Importação
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default ColumnSelectorModal;
