import React from 'react';
import { FiPlus } from 'react-icons/fi';
import { parseManualEntry } from '../utils/blockedUtils';

export default function ManualInput({ manualInput, setManualInput, handleBlockManual, adding, add55ToManualInput, blockType, setBlockType }) {
    const entriesCount = parseManualEntry(manualInput).length;
    const isResting = blockType === 'resting';

    return (
        <form onSubmit={handleBlockManual} className="flex flex-col gap-5 animate-in fade-in duration-300">
            {/* Seletor de Tipo de Bloqueio */}
            <div className="space-y-2">
                <span className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Tipo de Ação
                </span>
                <div className="flex bg-gray-100 dark:bg-gray-900/60 p-1 rounded-xl w-full max-w-sm select-none">
                    <button
                        type="button"
                        onClick={() => setBlockType('permanent')}
                        className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                            blockType === 'permanent' 
                                ? 'bg-white dark:bg-gray-800 shadow-sm text-red-650 dark:text-red-400' 
                                : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'
                        }`}
                    >
                        🚫 Permanente
                    </button>
                    <button
                        type="button"
                        onClick={() => setBlockType('resting')}
                        className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                            blockType === 'resting' 
                                ? 'bg-white dark:bg-gray-800 shadow-sm text-amber-650 dark:text-amber-400' 
                                : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'
                        }`}
                    >
                        ⏰ Repouso (24 horas)
                    </button>
                </div>
            </div>

            <div className="flex-1 w-full">
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                    {isResting ? 'Adicionar Números para Repouso' : 'Adicionar Números para Bloqueio'}
                </label>
                <textarea
                    value={manualInput}
                    onChange={(e) => setManualInput(e.target.value)}
                    placeholder="Cole os números aqui (um por linha ou separados por vírgula)..."
                    className={`w-full px-4 py-3 border border-white/10 rounded-xl focus:ring-2 outline-none h-32 resize-none font-mono text-sm bg-white/5 dark:bg-gray-700/50 text-gray-900 dark:text-white transition-all ${
                        isResting ? 'focus:ring-amber-500 border-amber-500/20' : 'focus:ring-red-500 border-red-500/20'
                    }`}
                />
                <p className="text-xs text-gray-500 mt-1">
                    Formatos aceitos: 5511999999999, (11) 99999-9999 ou <strong>5511999999999;Nome</strong>
                </p>
            </div>
            <div className="flex gap-4">
                <button
                    type="submit"
                    disabled={adding || !manualInput}
                    className={`flex-1 py-3 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg active:scale-95 ${
                        isResting 
                            ? 'bg-amber-600 hover:bg-amber-750 shadow-amber-500/20' 
                            : 'bg-red-600 hover:bg-red-750 shadow-red-500/20'
                    }`}
                >
                    {adding ? <span className="animate-pulse">Processando...</span> : (
                        <>
                            <FiPlus /> {isResting ? `Repousar ${entriesCount > 0 ? entriesCount : ''} Contatos` : `Bloquear ${entriesCount > 0 ? entriesCount : ''} Contatos`}
                        </>
                    )}
                </button>
                <button
                    type="button"
                    onClick={add55ToManualInput}
                    disabled={!manualInput.trim()}
                    className="px-6 bg-gray-800 text-white rounded-xl font-bold hover:bg-gray-700 transition-all border border-white/5 active:scale-95 disabled:opacity-30"
                    title="Adicionar 55 aos números abaixo"
                >
                    +55
                </button>
            </div>
        </form>
    );
}
