import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { FiX, FiTag, FiLoader, FiChevronDown, FiPlus, FiCheck, FiSearch } from 'react-icons/fi';
import useScrollLock from '../../../hooks/useScrollLock';

export default function BulkTagModal({
  isOpen,
  onClose,
  onConfirm,
  isSaving,
  count,
  selectAllPages,
  availableTags = [],
}) {
  const [selectedTags, setSelectedTags] = useState([]);
  const [tagSearch, setTagSearch] = useState('');
  const [actionType, setActionType] = useState('add'); // 'add' ou 'remove'
  const [dropdownOpen, setDropdownOpen] = useState(false);
  
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);

  useScrollLock(isOpen);

  useEffect(() => {
    if (isOpen) {
      setSelectedTags([]);
      setTagSearch('');
      setActionType('add');
      setDropdownOpen(false);
    }
  }, [isOpen]);

  // Limpa seleções ao mudar de aba
  const handleTabChange = (type) => {
    setActionType(type);
    setSelectedTags([]);
    setTagSearch('');
    setDropdownOpen(false);
  };

  // Fecha dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dropdownOpen]);

  if (!isOpen) return null;

  const handleToggleTag = (tag) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handleAddNewCustomTag = () => {
    const clean = tagSearch.trim();
    if (clean && !selectedTags.includes(clean)) {
      setSelectedTags(prev => [...prev, clean]);
      setTagSearch('');
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (selectedTags.length === 0) return;
    onConfirm(selectedTags.join(', '), actionType);
  };

  // Filtra as etiquetas disponíveis com base no que foi digitado
  const filteredAvailableTags = availableTags.filter(t =>
    t.toLowerCase().includes(tagSearch.toLowerCase())
  );

  const exactMatchExists = availableTags.some(
    t => t.toLowerCase() === tagSearch.trim().toLowerCase()
  ) || selectedTags.some(
    t => t.toLowerCase() === tagSearch.trim().toLowerCase()
  );

  return createPortal(
    <div className="fixed inset-0 z-[20000] flex items-center justify-center p-4 sm:p-6 select-none">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={onClose}
      />

      <div
        className="relative bg-white dark:bg-gray-800 rounded-3xl shadow-2xl max-w-md w-full overflow-visible transform transition-all animate-in zoom-in-95 fade-in duration-300 border border-gray-100 dark:border-gray-700"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`h-2 w-full transition-colors ${actionType === 'add' ? 'bg-gradient-to-r from-purple-600 via-fuchsia-600 to-pink-600' : 'bg-gradient-to-r from-rose-600 via-red-600 to-orange-600'}`} />

        <div className="p-8">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2">
                <div className={`p-2 rounded-xl transition-colors ${actionType === 'add' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400' : 'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400'}`}>
                  <FiTag size={18} />
                </div>
                Gerenciar Etiquetas
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 font-medium">
                Altere as etiquetas para{' '}
                <strong className="text-gray-700 dark:text-gray-200">
                  {selectAllPages ? `todos os ${count?.toLocaleString('pt-BR')}` : count}
                </strong>{' '}
                contato{count !== 1 ? 's' : ''} selecionado{count !== 1 ? 's' : ''}.
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
            >
              <FiX size={20} />
            </button>
          </div>

          {/* Abas de Adicionar vs Remover */}
          <div className="flex gap-2 p-1 bg-gray-100 dark:bg-gray-900/60 rounded-2xl mb-5">
            <button
              type="button"
              onClick={() => handleTabChange('add')}
              className={`flex-1 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                actionType === 'add'
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white'
              }`}
            >
              ➕ Adicionar Etiqueta
            </button>
            <button
              type="button"
              onClick={() => handleTabChange('remove')}
              className={`flex-1 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                actionType === 'remove'
                  ? 'bg-rose-600 text-white shadow-lg shadow-rose-500/20'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white'
              }`}
            >
              ➖ Remover Etiqueta
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">
                {actionType === 'add' ? 'Selecione ou Crie Etiquetas' : 'Selecione Etiqueta(s) a Remover'}
              </label>

              {/* Seletor Dropdown */}
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setDropdownOpen(o => !o)}
                  className={`w-full flex items-center justify-between gap-2 px-4 py-3 bg-gray-50 dark:bg-gray-900/50 border rounded-2xl outline-none transition-all text-sm font-medium ${
                    actionType === 'add'
                      ? 'border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-purple-500'
                      : 'border-rose-200 dark:border-rose-900/40 focus:ring-2 focus:ring-rose-500'
                  }`}
                >
                  <span className="flex items-center gap-2 truncate text-gray-900 dark:text-white font-bold">
                    <FiTag size={16} className={actionType === 'add' ? 'text-purple-500' : 'text-rose-500'} />
                    {selectedTags.length > 0
                      ? selectedTags.join(', ')
                      : (actionType === 'add' ? 'Escolha ou crie uma etiqueta...' : 'Escolha a etiqueta a remover...')}
                  </span>
                  <FiChevronDown size={16} className={`text-gray-400 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown Menu */}
                {dropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-2 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl overflow-hidden">
                    {/* Campo de Busca no Dropdown */}
                    <div className="p-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                      <div className="relative">
                        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                        <input
                          ref={searchInputRef}
                          type="text"
                          autoFocus
                          placeholder={actionType === 'add' ? "Buscar ou digitar nova etiqueta..." : "Buscar etiqueta..."}
                          value={tagSearch}
                          onChange={(e) => setTagSearch(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold focus:ring-2 focus:ring-purple-500 outline-none dark:text-gray-200"
                        />
                      </div>
                    </div>

                    {/* Lista de Opções */}
                    <div className="max-h-52 overflow-y-auto overflow-x-hidden p-2 space-y-1">
                      {/* Opção de Criar Nova Etiqueta (Apenas na aba Adicionar) */}
                      {actionType === 'add' && tagSearch.trim() && !exactMatchExists && (
                        <button
                          type="button"
                          onClick={handleAddNewCustomTag}
                          className="w-full flex items-center gap-2 px-3 py-2 bg-purple-50 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 rounded-xl text-xs font-bold hover:bg-purple-100 transition-all border border-dashed border-purple-300 dark:border-purple-700"
                        >
                          <FiPlus size={14} />
                          <span>Criar nova etiqueta: <strong className="underline">{tagSearch.trim()}</strong></span>
                        </button>
                      )}

                      {/* Lista de Etiquetas Cadastradas */}
                      {filteredAvailableTags.length > 0 ? (
                        filteredAvailableTags.map(tag => {
                          const isSelected = selectedTags.includes(tag);
                          return (
                            <button
                              key={tag}
                              type="button"
                              onClick={() => handleToggleTag(tag)}
                              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                                isSelected
                                  ? actionType === 'add'
                                    ? 'bg-purple-600 text-white shadow-sm'
                                    : 'bg-rose-600 text-white shadow-sm'
                                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/60'
                              }`}
                            >
                              <span className="truncate">{tag}</span>
                              {isSelected && <FiCheck size={14} />}
                            </button>
                          );
                        })
                      ) : (
                        (!tagSearch.trim() || (actionType === 'remove' && tagSearch.trim())) && (
                          <p className="text-center text-xs text-gray-400 py-4 font-medium">
                            Nenhuma etiqueta cadastrada encontrada.
                          </p>
                        )
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Tags Selecionadas (Badges) */}
              {selectedTags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {selectedTags.map(tag => (
                    <span
                      key={tag}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-extrabold ${
                        actionType === 'add'
                          ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'
                          : 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300'
                      }`}
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleToggleTag(tag)}
                        className="hover:text-black dark:hover:text-white"
                      >
                        <FiX size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-4 mt-8">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-3 rounded-2xl text-gray-700 dark:text-gray-300 font-bold hover:bg-gray-100 dark:hover:bg-gray-700 transition-all border border-gray-200 dark:border-gray-600 active:scale-95 text-xs"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSaving || selectedTags.length === 0}
                className={`px-8 py-3 text-white font-bold rounded-2xl shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2 min-w-[160px] text-xs uppercase tracking-wider ${
                  actionType === 'add'
                    ? 'bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 shadow-purple-500/20'
                    : 'bg-rose-600 hover:bg-rose-700 disabled:bg-rose-400 shadow-rose-500/20'
                }`}
              >
                {isSaving ? (
                  <>
                    <FiLoader className="animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <FiTag />
                    {actionType === 'add' ? 'Aplicar Etiqueta' : 'Remover Etiqueta'}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>,
    document.body
  );
}
