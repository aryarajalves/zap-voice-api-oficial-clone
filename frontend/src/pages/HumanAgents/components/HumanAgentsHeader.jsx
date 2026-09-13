import React from 'react';
import { FiUsers, FiRefreshCw } from 'react-icons/fi';

export default function HumanAgentsHeader({ limit, setLimit, setPage, loading, onRefresh }) {
    return (
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-[#1e293b] p-6 rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm transition-colors">
            <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-500/10 rounded-xl text-blue-500">
                    <FiUsers size={22} />
                </div>
                <div>
                    <h2 className="text-lg font-bold text-gray-800 dark:text-white">Fila de Atendimento Humano</h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Gerencie conversas que estão sob atendimento manual de humanos no momento.</p>
                </div>
            </div>
            <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
                <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 dark:text-gray-400 font-semibold">Exibir:</span>
                    <select
                        value={limit}
                        onChange={(e) => {
                            setLimit(Number(e.target.value));
                            setPage(1);
                        }}
                        className="bg-white dark:bg-[#1e293b] border border-gray-100 dark:border-white/5 text-gray-700 dark:text-gray-300 rounded-xl px-2.5 py-1.5 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                        <option value={20}>20 por página</option>
                        <option value={50}>50 por página</option>
                        <option value={100}>100 por página</option>
                    </select>
                </div>
                <button
                    onClick={onRefresh}
                    disabled={loading}
                    className="p-2.5 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 text-gray-600 dark:text-gray-300 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 transition-colors disabled:opacity-50 cursor-pointer"
                    title="Atualizar fila"
                >
                    <FiRefreshCw className={loading ? "animate-spin" : ""} size={16} />
                </button>
            </div>
        </div>
    );
}
