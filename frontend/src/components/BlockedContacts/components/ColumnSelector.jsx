import React from 'react';
import { FiFileText, FiSearch, FiCheck, FiArrowRight } from 'react-icons/fi';
import { mapCountryToCode } from '../utils/blockedUtils';

export default function ColumnSelector({
    importData,
    selectedPhoneCols,
    setSelectedPhoneCols,
    selectedNameCol,
    setSelectedNameCol,
    phoneColSearch,
    setPhoneColSearch,
    nameColSearch,
    setNameColSearch,
    setShowFullPreview,
    processMappedImport,
    importing,
    onCancel
}) {
    return (
        <div className="space-y-6 bg-white/5 dark:bg-gray-900/30 p-6 rounded-2xl border border-white/5 animate-in fade-in duration-300">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                    <FiFileText className="text-red-500" />
                    Configurar Importação
                </h3>
                <span className="text-xs font-bold bg-red-500/20 text-red-700 dark:text-red-300 px-3 py-1 rounded-full border border-red-500/20">
                    {importData.rows.length} linhas detectadas
                </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Coluna de Telefone */}
                <div className="space-y-2">
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">
                        Qual coluna contém os números? <span className="text-red-500">*</span>
                    </label>
                    <div className="relative mb-2">
                        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={12} />
                        <input
                            type="text"
                            placeholder="Filtrar colunas..."
                            value={phoneColSearch}
                            onChange={(e) => setPhoneColSearch(e.target.value)}
                            className="w-full pl-8 pr-3 py-2 text-xs border border-white/10 rounded-lg bg-white/5 dark:bg-gray-800 outline-none focus:ring-1 focus:ring-red-500"
                        />
                    </div>
                    <div className="max-h-[200px] overflow-y-auto grid grid-cols-1 gap-2 p-1">
                        {importData.nonEmptyIndices
                            .filter(idx => (importData.headers[idx] || '').toLowerCase().includes(phoneColSearch.toLowerCase()))
                            .map((idx) => {
                                const selectionIndex = selectedPhoneCols.indexOf(idx);
                                const isSelected = selectionIndex !== -1;
                                return (
                                    <button
                                        key={idx}
                                        onClick={() => {
                                            if (isSelected) setSelectedPhoneCols(prev => prev.filter(i => i !== idx));
                                            else setSelectedPhoneCols(prev => [...prev, idx]);
                                        }}
                                        className={`px-4 py-3 text-left text-sm rounded-xl border transition-all flex items-center justify-between relative ${isSelected
                                            ? 'bg-red-600 border-red-600 text-white shadow-xl shadow-red-500/40 z-20 scale-105'
                                            : 'bg-white/5 dark:bg-gray-800/50 border-white/5 text-gray-700 dark:text-gray-300 hover:border-red-400/50'
                                            }`}
                                    >
                                        <span className="truncate font-medium">{importData.headers[idx] || `Coluna ${idx + 1}`}</span>
                                        {isSelected && (
                                            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-white text-red-600 text-[10px] font-black">
                                                {selectionIndex + 1}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                    </div>
                </div>

                {/* Coluna de Nome */}
                <div className="space-y-2">
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">
                        Qual coluna contém os nomes? (Opcional)
                    </label>
                    <div className="relative mb-2">
                        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={12} />
                        <input
                            type="text"
                            placeholder="Filtrar colunas..."
                            value={nameColSearch}
                            onChange={(e) => setNameColSearch(e.target.value)}
                            className="w-full pl-8 pr-3 py-2 text-xs border border-white/10 rounded-lg bg-white/5 dark:bg-gray-800 outline-none focus:ring-1 focus:ring-blue-500"
                        />
                    </div>
                    <div className="max-h-[200px] overflow-y-auto grid grid-cols-1 gap-2 p-1">
                        <button
                            onClick={() => setSelectedNameCol(-1)}
                            className={`px-4 py-3 text-left text-sm rounded-xl border transition-all ${selectedNameCol === -1
                                ? 'bg-gray-600 border-gray-600 text-white shadow-lg'
                                : 'bg-white/5 dark:bg-gray-800/50 border-white/5 text-gray-700 dark:text-gray-300'
                                }`}
                        >
                            Nenhuma (Não importar nomes)
                        </button>
                        {importData.nonEmptyIndices
                            .filter(idx => (importData.headers[idx] || '').toLowerCase().includes(nameColSearch.toLowerCase()))
                            .map((idx) => (
                                <button
                                    key={idx}
                                    onClick={() => setSelectedNameCol(idx)}
                                    className={`px-4 py-3 text-left text-sm rounded-xl border transition-all flex items-center justify-between relative ${selectedNameCol === idx
                                        ? 'bg-gray-600 border-gray-600 text-white shadow-xl z-20 scale-105'
                                        : 'bg-white/5 dark:bg-gray-800/50 border-white/5 text-gray-700 dark:text-gray-300 hover:border-gray-400/50'
                                        }`}
                                >
                                    <span className="truncate">{importData.headers[idx] || `Coluna ${idx + 1}`}</span>
                                    {selectedNameCol === idx && <FiCheck size={18} />}
                                </button>
                            ))}
                    </div>
                </div>
            </div>

            {selectedPhoneCols.length > 0 && (
                <div className="bg-white/5 dark:bg-black/20 rounded-2xl p-5 border border-white/5 animate-in slide-in-from-top-2 duration-300">
                    <div className="flex justify-between items-center mb-3">
                        <p className="text-[10px] uppercase tracking-widest font-bold text-gray-500 dark:text-gray-400 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                            Prévia da junção:
                        </p>
                        <button
                            onClick={() => setShowFullPreview(true)}
                            className="text-[10px] font-bold text-red-400 hover:text-red-300 bg-red-400/10 px-2 py-1 rounded-lg cursor-pointer border border-red-400/20"
                        >
                            Ver Lista Completa
                        </button>
                    </div>
                    <div className="space-y-2">
                        {importData.rows.slice(0, 5).map((row, idx) => {
                            const joinedVal = selectedPhoneCols.map(colIdx => mapCountryToCode(String(row[colIdx] || '').trim())).join('');
                            const nameVal = selectedNameCol !== -1 ? String(row[selectedNameCol] || '').trim() : '';
                            return (
                                <div key={idx} className="text-sm font-mono text-gray-700 dark:text-gray-300 flex items-center gap-3">
                                    <span className="w-5 text-[11px] text-gray-400 text-right">{idx + 1}.</span>
                                    <div className="flex flex-wrap gap-2">
                                        <span className="py-1 px-2 bg-white/5 dark:bg-gray-800 rounded border border-white/5">
                                            {joinedVal || <span className="text-gray-500 italic">Vazio</span>}
                                        </span>
                                        {nameVal && (
                                            <span className="py-1 px-2 bg-blue-500/10 text-blue-400 rounded border border-blue-500/20 text-[11px] font-sans">
                                                {nameVal}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            <div className="flex gap-3 pt-4 border-t border-white/5">
                <button
                    onClick={processMappedImport}
                    disabled={importing || selectedPhoneCols.length === 0}
                    className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-lg shadow-red-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95"
                >
                    {importing ? 'Importando...' : 'Confirmar Importação'}
                    {!importing && <FiArrowRight />}
                </button>
                <button
                    onClick={onCancel}
                    className="px-6 py-3 bg-white/5 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold rounded-xl hover:bg-white/10 transition border border-white/5"
                >
                    Cancelar
                </button>
            </div>
        </div>
    );
}
