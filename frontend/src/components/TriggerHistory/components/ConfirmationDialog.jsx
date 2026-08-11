import React from 'react';
import { createPortal } from 'react-dom';

const ConfirmationDialog = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText,
    confirmColorClass = 'bg-rose-600 hover:bg-rose-500',
    icon = '⚠️',
    loading = false,
    showSelect = false,
    selectLabel = 'Tempo de Repouso:',
    selectValue = 24,
    onSelectChange,
    selectOptions = []
}) => {
    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md" onClick={(e) => e.stopPropagation()}>
            <div className="bg-slate-900 border border-slate-700/60 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden p-6 animate-in fade-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
                <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                    <span className="shrink-0">{icon}</span> {title}
                </h4>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 leading-relaxed">
                    {message}
                </p>

                {showSelect && selectOptions.length > 0 && (
                    <div className="mb-6 bg-gray-50 dark:bg-gray-900/60 p-3.5 rounded-xl border border-gray-200 dark:border-gray-700">
                        <label htmlFor="confirmation-dialog-select" className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">
                            {selectLabel}
                        </label>
                        <select
                            id="confirmation-dialog-select"
                            value={selectValue}
                            onChange={(e) => onSelectChange && onSelectChange(Number(e.target.value))}
                            className="w-full text-sm p-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg outline-none focus:ring-2 focus:ring-amber-500 font-bold text-gray-800 dark:text-white cursor-pointer"
                        >
                            {selectOptions.map(opt => (
                                <option key={opt.value} value={opt.value} className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-medium">
                                    {opt.label}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                <div className="flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition font-medium"
                        disabled={loading}
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={onConfirm}
                        className={`px-4 py-2 text-white rounded-lg transition font-medium flex items-center gap-2 ${confirmColorClass}`}
                        disabled={loading}
                    >
                        {loading ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        ) : (
                            confirmText
                        )}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default ConfirmationDialog;
