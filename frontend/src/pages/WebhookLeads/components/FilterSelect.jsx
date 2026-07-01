import React, { useState, useRef, useEffect } from 'react';
import { FiSearch, FiChevronDown, FiX } from 'react-icons/fi';

const COLOR_CLASSES = {
  blue: 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-200 dark:shadow-blue-900/40',
  purple: 'bg-purple-600 text-white border-purple-600 shadow-md shadow-purple-200 dark:shadow-purple-900/40',
  green: 'bg-green-600 text-white border-green-600 shadow-md shadow-green-200 dark:shadow-green-900/40',
};

const ACTIVE_ITEM_CLASSES = {
  blue: 'bg-blue-600 text-white',
  purple: 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300',
  green: 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300',
};

const HOVER_ITEM_CLASSES = {
  blue: 'hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-700',
  purple: 'hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:text-purple-700',
  green: 'hover:bg-green-50 dark:hover:bg-green-900/20 hover:text-green-700',
};

const FOCUS_RING_CLASSES = {
  blue: 'focus:ring-blue-500',
  purple: 'focus:ring-purple-500',
  green: 'focus:ring-green-500',
};

/**
 * Dropdown de filtro (seleção única) com o mesmo visual/comportamento do
 * dropdown de Etiquetas: botão + painel com busca + lista de opções.
 * Substitui os antigos <select> nativos para deixar todos os filtros
 * consistentes visualmente.
 */
export default function FilterSelect({
  icon: Icon,
  placeholder,
  value,
  onChange,
  options, // [{ value, label, icon? }]
  searchable = true,
  color = 'blue',
  disabled = false,
  emptyLabel,
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef(null);
  const searchRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
        setSearch('');
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      setTimeout(() => searchRef.current?.focus(), 50);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const selected = options.find(o => String(o.value) === String(value));
  const filteredOptions = options.filter(o =>
    !search || o.label.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (val) => {
    onChange(val);
    setOpen(false);
    setSearch('');
  };

  const activeClasses = COLOR_CLASSES[color] || COLOR_CLASSES.blue;
  const activeItemClasses = ACTIVE_ITEM_CLASSES[color] || ACTIVE_ITEM_CLASSES.blue;
  const hoverItemClasses = HOVER_ITEM_CLASSES[color] || HOVER_ITEM_CLASSES.blue;
  const focusRingClasses = FOCUS_RING_CLASSES[color] || FOCUS_RING_CLASSES.blue;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => !disabled && setOpen(o => !o)}
        disabled={disabled}
        className={`w-full flex items-center justify-between gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all outline-none disabled:opacity-50 disabled:cursor-not-allowed
          ${selected
            ? activeClasses
            : 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-blue-400'
          }`}
      >
        <span className="flex items-center gap-2 truncate">
          {Icon && <Icon size={15} className="flex-shrink-0" />}
          <span className="truncate">{selected ? selected.label : placeholder}</span>
        </span>
        <FiChevronDown
          size={15}
          className={`flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div
          className="absolute top-full left-0 right-0 mt-2 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl overflow-hidden"
          style={{ minWidth: '220px' }}
        >
          {searchable && (
            <div className="p-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={13} />
                <input
                  ref={searchRef}
                  type="text"
                  placeholder="Buscar..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className={`w-full pl-8 pr-8 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 ${focusRingClasses} outline-none transition-all`}
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <FiX size={12} />
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="max-h-60 overflow-y-auto p-2 space-y-0.5">
            <button
              type="button"
              onClick={() => handleSelect('')}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors
                ${!value ? activeItemClasses : `text-gray-700 dark:text-gray-300 ${hoverItemClasses}`}`}
            >
              {emptyLabel || placeholder}
            </button>

            {filteredOptions.length > 0 && (
              <div className="mx-1 my-1 border-t border-dashed border-gray-100 dark:border-gray-700" />
            )}

            {filteredOptions.map(opt => (
              <button
                type="button"
                key={opt.value}
                onClick={() => handleSelect(opt.value)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors truncate
                  ${String(value) === String(opt.value) ? activeItemClasses : `text-gray-700 dark:text-gray-300 ${hoverItemClasses}`}`}
                title={opt.label}
              >
                <span className="truncate">{opt.label}</span>
              </button>
            ))}

            {search && filteredOptions.length === 0 && (
              <p className="text-center text-xs text-gray-400 py-4">Nenhum resultado encontrado</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
