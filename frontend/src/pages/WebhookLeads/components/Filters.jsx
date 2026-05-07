import React from 'react';
import { FiSearch, FiTag } from 'react-icons/fi';

export default function Filters({ search, setSearch, selectedTag, setSelectedTag, availableFilters, total }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
      <div className="relative">
        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input 
          type="text" 
          placeholder="Buscar por nome ou telefone..."
          className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      
      <div className="relative">
        <FiTag className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <select 
          className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all appearance-none"
          value={selectedTag}
          onChange={(e) => setSelectedTag(e.target.value)}
        >
          <option value="">Todas as Etiquetas</option>
          {availableFilters.tags?.map(tag => (
            <option key={tag} value={tag}>{tag}</option>
          ))}
        </select>
      </div>

      <div className="flex items-center justify-end px-2">
         <span className="text-xs font-semibold text-gray-400">Total: {total} leads</span>
      </div>
    </div>
  );
}
