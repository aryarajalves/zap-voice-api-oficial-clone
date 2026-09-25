import React from 'react';
import { FiSearch, FiX } from 'react-icons/fi';

export default function BulkTagSearchInput({
  targetCategory,
  searchTerm,
  setSearchTerm,
  searchInputRef,
  onKeyDown
}) {
  const isChat = targetCategory === 'chat';

  return (
    <div className="space-y-2">
      <label className="block text-xs font-semibold text-slate-300">
        {isChat
          ? 'Pesquisar ou criar etiquetas do Chat:'
          : 'Pesquisar ou criar etiquetas de Contatos:'}
      </label>
      <div className="relative">
        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
        <input
          ref={searchInputRef}
          id="bulk-tag-search-input"
          type="text"
          placeholder={isChat ? 'Digite o nome da etiqueta do Chat...' : 'Digite o nome da etiqueta de Contatos...'}
          maxLength={25}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value.slice(0, 25))}
          onKeyDown={onKeyDown}
          className="w-full pl-9 pr-8 py-2 bg-slate-800 border border-slate-700 text-white rounded-xl text-sm focus:outline-none focus:border-blue-500 placeholder-slate-500 transition"
        />
        {searchTerm && (
          <button
            type="button"
            onClick={() => setSearchTerm('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
            title="Limpar busca"
          >
            <FiX size={14} />
          </button>
        )}
      </div>
    </div>
  );
}
