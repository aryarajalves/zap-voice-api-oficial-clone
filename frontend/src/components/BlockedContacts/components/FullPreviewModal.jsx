import React from 'react';
import { createPortal } from 'react-dom';
import { FiX, FiSlash } from 'react-icons/fi';
import { mapCountryToCode } from '../utils/blockedUtils';

export default function FullPreviewModal({ isOpen, onClose, importData, selectedPhoneCols, selectedNameCol }) {
    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-gray-800 rounded-3xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl overflow-hidden border border-white/10">
                <div className="p-5 border-b border-white/5 flex justify-between items-center bg-white/5 dark:bg-gray-900/50">
                    <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-3">
                        <div className="p-2 bg-red-500/10 rounded-lg">
                            <FiSlash className="text-red-500" />
                        </div>
                        Lista Completa da Junção
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors">
                        <FiX className="text-gray-500" />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-2 bg-transparent">
                    <table className="w-full text-sm">
                        <thead className="sticky top-0 z-50 bg-white dark:bg-gray-800 border-b border-white/5">
                            <tr>
                                <th className="text-left py-3 px-4 text-gray-400 font-bold text-[10px] uppercase tracking-widest text-right w-20">Linha</th>
                                <th className="text-left py-3 px-4 text-gray-400 font-bold text-[10px] uppercase tracking-widest">Telefone</th>
                                <th className="text-left py-3 px-4 text-gray-400 font-bold text-[10px] uppercase tracking-widest">Nome</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {importData.rows.map((row, idx) => {
                                const joinedVal = selectedPhoneCols.map(colIdx => mapCountryToCode(String(row[colIdx] || '').trim())).join('');
                                const nameVal = selectedNameCol !== -1 ? String(row[selectedNameCol] || '').trim() : '';
                                return (
                                    <tr key={idx} className="hover:bg-red-500/5 transition-colors">
                                        <td className="py-2.5 px-4 text-xs text-gray-400 font-mono text-right">{idx + 1}</td>
                                        <td className="py-2.5 px-4 text-sm font-mono text-gray-800 dark:text-gray-200">
                                            <span className="py-1 px-2 bg-white/5 rounded border border-white/5">
                                                {joinedVal || <span className="text-red-300 italic">vazio</span>}
                                            </span>
                                        </td>
                                        <td className="py-2.5 px-4 text-sm text-gray-600 dark:text-gray-400">
                                            {nameVal || <span className="text-gray-300 italic">-</span>}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                <div className="p-5 bg-white/5 border-t border-white/5 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-8 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-lg shadow-red-500/20 transition-all active:scale-95"
                    >
                        Fechar Prévia
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
