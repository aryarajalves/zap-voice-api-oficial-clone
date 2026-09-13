import React from 'react';
import { FiSearch } from 'react-icons/fi';

export default function HumanAgentsSearch({ searchQuery, setSearchQuery }) {
    return (
        <div className="relative">
            <FiSearch className="absolute left-4 top-3.5 text-gray-400 dark:text-gray-500" size={16} />
            <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por nome ou número do contato na página..."
                className="w-full pl-11 pr-4 py-3 bg-white dark:bg-[#1e293b] border border-gray-100 dark:border-white/5 rounded-2xl text-xs text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all shadow-sm"
            />
        </div>
    );
}
