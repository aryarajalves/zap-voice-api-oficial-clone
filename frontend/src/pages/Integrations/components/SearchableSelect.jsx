import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { FiChevronDown, FiX, FiCheck } from 'react-icons/fi';

const SearchableSelect = ({ options, value, onChange, placeholder, icon: Icon, colorClass, isMulti, allowNone }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const containerRef = useRef(null);
  const [coords, setCoords] = useState({ top: 0, bottom: 0, left: 0, width: 0 });
  const [direction, setDirection] = useState('down');

  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      // Se tiver menos de 250px livres embaixo, abrir para cima
      setDirection(spaceBelow < 250 ? 'up' : 'down');
      
      setCoords({
        top: rect.top,
        bottom: rect.bottom,
        left: rect.left,
        width: rect.width
      });
    }
  }, [isOpen]);

  const rawOptions = options || [];
  const filteredOptions = rawOptions.filter(opt =>
    opt && opt.label && String(opt.label).toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Se permitir "Nenhum" e não estiver filtrando (ou "Nenhum" bate com o filtro)
  const displayOptions = [...filteredOptions];
  if (allowNone && !isMulti && (!searchTerm || "nenhum".includes(searchTerm.toLowerCase()))) {
    displayOptions.unshift({ value: "", label: "Nenhum" });
  }

  const isSelected = (optValue) => {
    if (isMulti) {
      return Array.isArray(value) && value.includes(optValue);
    }
    return String(value) === String(optValue);
  };

  const currentValues = isMulti
    ? (Array.isArray(value) ? value : (typeof value === 'string' && value.trim() ? value.split(',').map(v => v.trim()) : []))
    : [value];
  const selectedOptions = rawOptions.filter(opt => opt && currentValues.some(v => String(v) === String(opt.value)));

  const handleToggle = (optValue) => {
    if (isMulti) {
      const newValue = currentValues.includes(optValue)
        ? currentValues.filter(v => v !== optValue)
        : [...currentValues, optValue];
      onChange(newValue);
    } else {
      onChange(optValue);
      setIsOpen(false);
      setSearchTerm("");
    }
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      <div
        className={`flex items-center gap-2 w-full min-h-[38px] py-1.5 px-3 text-sm bg-white dark:bg-[#0b1120] text-gray-900 dark:text-white border border-gray-200 dark:border-white/5 rounded-lg outline-none focus-within:ring-2 ${colorClass || 'focus-within:ring-blue-500/20'} cursor-pointer group/sel flex-wrap shadow-inner`}
        onClick={() => setIsOpen(!isOpen)}
      >
        {Icon && <Icon className={colorClass?.includes('purple') ? 'text-purple-500' : 'text-blue-500'} size={14} />}

        <div className="flex flex-wrap gap-1 flex-1 overflow-hidden">
          {selectedOptions.length > 0 ? (
            isMulti ? (
              selectedOptions.map(opt => (
                <span key={opt.value} className="bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-md text-[10px] font-bold flex items-center gap-1">
                  {opt.label}
                  <FiX
                    className="hover:text-blue-900 dark:hover:text-white"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggle(opt.value);
                    }}
                  />
                </span>
              ))
            ) : (
              <span className="truncate font-medium">{selectedOptions[0].label}</span>
            )
          ) : (
            <span className="text-gray-400 font-normal">{placeholder}</span>
          )}
        </div>

        <FiChevronDown className={`ml-auto text-gray-400 group-hover/sel:text-gray-600 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {isOpen && createPortal(
        <>
          <div className="fixed inset-0 z-[99999]" onClick={() => setIsOpen(false)}></div>
          <div
            className="fixed bg-white dark:bg-[#0f172a] border border-gray-100 dark:border-white/5 rounded-xl shadow-2xl z-[100000] overflow-hidden"
            style={{
              left: coords.left,
              width: coords.width,
              maxHeight: '300px',
              ...(direction === 'up' 
                ? { bottom: window.innerHeight - coords.top + 4 } 
                : { top: coords.bottom + 4 })
            }}
          >
            <div className="p-2 border-b border-gray-50 dark:border-white/5">
              <input
                autoFocus
                type="text"
                className="w-full bg-gray-50 dark:bg-[#0b1120] border-none rounded-lg px-3 py-1.5 text-xs outline-none focus:ring-1 focus:ring-blue-500/30 text-gray-900 dark:text-white shadow-inner"
                placeholder="Digite para buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
            <div className="max-h-60 overflow-y-auto p-1 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-white/10">
              {displayOptions.length === 0 ? (
                <div className="p-3 text-center text-gray-500 text-[10px] italic">Nenhum resultado encontrado</div>
              ) : (
                displayOptions.map(opt => {
                  const active = isSelected(opt.value);
                  const isNone = opt.value === "";
                  return (
                    <div
                      key={opt.value}
                      className={`p-2.5 text-xs rounded-lg cursor-pointer transition-colors flex items-center justify-between mb-0.5 last:mb-0 ${active ? 'bg-blue-500 text-white font-bold' : isNone ? 'text-gray-500 italic hover:bg-gray-100 dark:hover:bg-white/5' : 'hover:bg-blue-50 dark:hover:bg-blue-900/40 text-gray-800 dark:text-gray-200'}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggle(opt.value);
                      }}
                    >
                      <span>{opt.label}</span>
                      {active && <FiCheck size={12} />}
                    </div>
                  );
                })
              )}
            </div>
            {isMulti && (
              <div className="p-2 border-t border-gray-50 dark:border-white/5 bg-gray-50 dark:bg-[#0b1120]/50 flex justify-end">
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-[10px] font-bold text-blue-600 bg-white dark:bg-[#1e293b] px-4 py-1.5 rounded-lg border border-blue-500/20 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors"
                >
                  Concluir
                </button>
              </div>
            )}
          </div>
        </>,
        document.body
      )}
    </div>
  );
};

export default SearchableSelect;
