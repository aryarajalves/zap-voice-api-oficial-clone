import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { FiX, FiCheck, FiPlus } from 'react-icons/fi';

const InternalTagsInput = ({ value, onChange, existingTags = [], placeholder = "Digite uma tag e aperte Enter..." }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const [coords, setCoords] = useState({ top: 0, bottom: 0, left: 0, width: 0 });
  const [direction, setDirection] = useState('down');

  const tags = React.useMemo(() => {
    return value ? value.split(',').map(t => t.trim()).filter(Boolean) : [];
  }, [value]);

  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      setDirection(spaceBelow < 200 ? 'up' : 'down');
      
      setCoords({
        top: rect.top,
        bottom: rect.bottom,
        left: rect.left,
        width: rect.width
      });
    }
  }, [isOpen]);

  const handleAddTag = (tagToAdd) => {
    const cleanedTag = tagToAdd.trim().replace(/,/g, '');
    if (!cleanedTag) return;
    
    if (!tags.includes(cleanedTag)) {
      const newTags = [...tags, cleanedTag];
      onChange(newTags.join(', '));
    }
    setInputValue("");
  };

  const handleRemoveTag = (tagToRemove) => {
    const newTags = tags.filter(t => t !== tagToRemove);
    onChange(newTags.join(', '));
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      handleAddTag(inputValue);
    } else if (e.key === ',' || e.key === ';') {
      e.preventDefault();
      e.stopPropagation();
      handleAddTag(inputValue);
    }
  };

  const filteredOptions = (existingTags || [])
    .filter(tag => {
      const isAlreadySelected = tags.includes(tag);
      const matchesSearch = tag.toLowerCase().includes(inputValue.toLowerCase());
      return !isAlreadySelected && matchesSearch;
    });

  const handleToggleOption = (tag) => {
    handleAddTag(tag);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  return (
    <div className="w-full">
      {/* Visualização das tags selecionadas no topo */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2 animate-in fade-in slide-in-from-top-1 duration-200">
          {tags.map(tag => (
            <span 
              key={tag} 
              className="bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-300 px-2.5 py-1 rounded-lg text-[10px] font-black flex items-center gap-1.5 border border-blue-500/20 hover:border-blue-500/40 transition-colors shadow-sm"
            >
              {tag}
              <button
                type="button"
                onClick={() => handleRemoveTag(tag)}
                className="hover:text-red-500 dark:hover:text-red-400 transition-colors cursor-pointer"
                title={`Remover tag ${tag}`}
              >
                <FiX size={10} />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Input container */}
      <div className="relative w-full" ref={containerRef}>
        <div
          className="flex items-center gap-2 w-full min-h-[38px] py-1.5 px-3 text-sm bg-gray-50 dark:bg-[#0b1120] text-gray-900 dark:text-white border border-gray-100 dark:border-white/5 rounded-xl outline-none focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500/40 transition-all shadow-inner"
          onClick={() => {
            setIsOpen(true);
            if (inputRef.current) inputRef.current.focus();
          }}
        >
          <input
            ref={inputRef}
            type="text"
            className="flex-1 bg-transparent border-none p-0 text-xs font-bold text-gray-900 dark:text-white placeholder-gray-400 focus:ring-0 outline-none"
            placeholder={tags.length === 0 ? placeholder : "Adicione outra tag..."}
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              setIsOpen(true);
            }}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsOpen(true)}
            onBlur={() => {
              // Pequeno delay para permitir o clique nas opções antes de fechar o dropdown
              setTimeout(() => setIsOpen(false), 200);
            }}
          />
          {inputValue.trim() && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleAddTag(inputValue);
              }}
              className="p-1 hover:bg-blue-500/10 rounded-lg text-blue-500 transition-colors"
            >
              <FiPlus size={14} />
            </button>
          )}
        </div>

        {/* Dropdown de tags existentes */}
        {isOpen && filteredOptions.length > 0 && createPortal(
          <>
            <div className="fixed inset-0 z-[99999]" onClick={() => setIsOpen(false)}></div>
            <div
              className="fixed bg-white dark:bg-[#0f172a] border border-gray-100 dark:border-white/5 rounded-xl shadow-2xl z-[100000] overflow-hidden"
              style={{
                left: coords.left,
                width: coords.width,
                maxHeight: '200px',
                ...(direction === 'up' 
                  ? { bottom: window.innerHeight - coords.top + 4 } 
                  : { top: coords.bottom + 4 })
              }}
            >
              <div className="p-1.5 bg-gray-50/50 dark:bg-white/[0.02] border-b border-gray-100 dark:border-white/5">
                <span className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest px-2">Tags Existentes</span>
              </div>
              <div className="max-h-40 overflow-y-auto p-1 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-white/10">
                {filteredOptions.map(tag => (
                  <div
                    key={tag}
                    className="p-2 text-xs font-bold rounded-lg cursor-pointer transition-colors flex items-center justify-between mb-0.5 last:mb-0 hover:bg-blue-50 dark:hover:bg-blue-900/40 text-gray-800 dark:text-gray-200"
                    onMouseDown={(e) => {
                      // Usar onMouseDown em vez de onClick para registrar antes do onBlur do input
                      e.preventDefault();
                      handleToggleOption(tag);
                    }}
                  >
                    <span>{tag}</span>
                    <span className="text-[9px] font-black text-blue-500 opacity-0 group-hover:opacity-100">Usar</span>
                  </div>
                ))}
              </div>
            </div>
          </>,
          document.body
        )}
      </div>
    </div>
  );
};

export default InternalTagsInput;
