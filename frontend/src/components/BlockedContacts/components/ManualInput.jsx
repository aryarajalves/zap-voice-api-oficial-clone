import React from 'react';
import { FiPlus } from 'react-icons/fi';
import { parseManualEntry } from '../utils/blockedUtils';

export default function ManualInput({ manualInput, setManualInput, handleBlockManual, adding, add55ToManualInput }) {
    const entriesCount = parseManualEntry(manualInput).length;

    return (
        <form onSubmit={handleBlockManual} className="flex flex-col gap-4 animate-in fade-in duration-300">
            <div className="flex-1 w-full">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Adicionar Números para Bloqueio
                </label>
                <textarea
                    value={manualInput}
                    onChange={(e) => setManualInput(e.target.value)}
                    placeholder="Cole os números aqui (um por linha ou separados por vírgula)..."
                    className="w-full px-4 py-3 border border-white/10 rounded-xl focus:ring-2 focus:ring-red-500 outline-none h-32 resize-none font-mono text-sm bg-white/5 dark:bg-gray-700/50 text-gray-900 dark:text-white"
                />
                <p className="text-xs text-gray-500 mt-1">
                    Formatos aceitos: 5511999999999, (11) 99999-9999 ou <strong>5511999999999;Nome</strong>
                </p>
            </div>
            <div className="flex gap-4">
                <button
                    type="submit"
                    disabled={adding || !manualInput}
                    className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-red-500/20 active:scale-95"
                >
                    {adding ? <span className="animate-pulse">Processando...</span> : (
                        <>
                            <FiPlus /> Bloquear {entriesCount > 0 ? entriesCount : ''} Contatos
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
