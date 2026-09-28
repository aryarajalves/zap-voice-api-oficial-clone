import React, { useState, useRef, useEffect, useMemo } from 'react';
import { FiChevronDown, FiCheck, FiX, FiStar, FiFastForward, FiSearch } from 'react-icons/fi';

const INDIVIDUAL_OPTIONS = [
  { value: 'skipped', label: 'Pulou Avaliação (Sem nota / Ignorado)', shortLabel: 'Pulou', icon: '⏩' },
  { value: '5', label: '5 Estrelas (⭐⭐⭐⭐⭐)', shortLabel: '5 Estrelas', stars: 5 },
  { value: '4', label: '4 Estrelas (⭐⭐⭐⭐)', shortLabel: '4 Estrelas', stars: 4 },
  { value: '3', label: '3 Estrelas (⭐⭐⭐)', shortLabel: '3 Estrelas', stars: 3 },
  { value: '2', label: '2 Estrelas (⭐⭐)', shortLabel: '2 Estrelas', stars: 2 },
  { value: '1', label: '1 Estrela (⭐)', shortLabel: '1 Estrela', stars: 1 },
];

export const parseFilterStringToArray = (val) => {
  if (!val || val === 'all') return [];
  const tokens = String(val).split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
  const result = new Set();
  tokens.forEach(tok => {
    if (tok.includes('-') || tok.includes('..')) {
      const sep = tok.includes('-') ? '-' : '..';
      const [start, end] = tok.split(sep).map(n => parseInt(n.trim(), 10));
      if (!isNaN(start) && !isNaN(end)) {
        const min = Math.min(start, end);
        const max = Math.max(start, end);
        for (let i = min; i <= max; i++) result.add(String(i));
        return;
      }
    }
    result.add(tok);
  });
  return Array.from(result);
};

export const formatFeedbackFilterDisplay = (val) => {
  const arr = parseFilterStringToArray(val);
  if (arr.length === 0) return 'Qualquer Avaliação (Padrão - Todos)';
  
  const hasSkipped = arr.includes('skipped');
  const numericStars = arr.filter(v => v !== 'skipped').map(Number).filter(n => !isNaN(n)).sort((a, b) => a - b);
  
  const labels = [];
  if (numericStars.length > 0) {
    if (numericStars.length === 5) {
      labels.push('⭐ 1 a 5 Estrelas (Todas)');
    } else if (numericStars.length === 3 && numericStars[0] === 1 && numericStars[2] === 3) {
      labels.push('⭐ 1 a 3 Estrelas (Baixas)');
    } else if (numericStars.length === 2 && numericStars[0] === 4 && numericStars[1] === 5) {
      labels.push('⭐ 4 e 5 Estrelas (Altas)');
    } else {
      labels.push(`⭐ ${numericStars.join(', ')} Estrelas`);
    }
  }
  
  if (hasSkipped) {
    labels.push('⏩ Pulou');
  }
  
  return labels.join(' + ');
};

export default function FeedbackFilterMultiSelect({ value, onChange, disabled = false }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [rangeStart, setRangeStart] = useState('1');
  const [rangeEnd, setRangeEnd] = useState('3');
  const containerRef = useRef(null);

  const selectedArray = useMemo(() => parseFilterStringToArray(value), [value]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const toggleOption = (optVal) => {
    let newArr;
    if (selectedArray.includes(optVal)) {
      newArr = selectedArray.filter(v => v !== optVal);
    } else {
      newArr = [...selectedArray, optVal];
    }
    onChange(newArr.length === 0 ? '' : newArr.join(','));
  };

  const handleSelectAllGeneric = () => {
    onChange('');
  };

  const handleApplyPreset = (presetValues) => {
    onChange(presetValues.join(','));
  };

  const handleApplyCustomRange = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const start = parseInt(rangeStart, 10);
    const end = parseInt(rangeEnd, 10);
    const min = Math.min(start, end);
    const max = Math.max(start, end);
    const rangeVals = [];
    for (let i = min; i <= max; i++) {
      rangeVals.push(String(i));
    }
    // Mantém 'skipped' se já estava selecionado
    if (selectedArray.includes('skipped')) {
      rangeVals.push('skipped');
    }
    onChange(rangeVals.join(','));
  };

  const filteredOptions = useMemo(() => {
    if (!searchTerm.trim()) return INDIVIDUAL_OPTIONS;
    const term = searchTerm.toLowerCase();
    return INDIVIDUAL_OPTIONS.filter(o => 
      o.label.toLowerCase().includes(term) || o.value.toLowerCase().includes(term)
    );
  }, [searchTerm]);

  const displayText = formatFeedbackFilterDisplay(value);
  const isGeneric = selectedArray.length === 0;

  return (
    <div className="relative w-full" ref={containerRef}>
      {/* Botão de Trigger */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between px-3 py-2 bg-white dark:bg-[#0b1120] border rounded-xl text-xs font-medium transition-all text-left ${
          isOpen
            ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-md'
            : 'border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <div className="flex items-center gap-2 overflow-hidden mr-2">
          <span className="truncate text-gray-900 dark:text-gray-100 font-semibold">
            {displayText}
          </span>
          {!isGeneric && (
            <span className="shrink-0 bg-blue-500/20 text-blue-400 font-bold px-1.5 py-0.5 rounded-full text-[10px]">
              {selectedArray.length} {selectedArray.length === 1 ? 'sel' : 'sels'}
            </span>
          )}
        </div>
        <FiChevronDown
          className={`shrink-0 text-gray-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-blue-500' : ''
          }`}
          size={14}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-[#0f172a] border border-gray-700/80 rounded-2xl shadow-2xl overflow-hidden p-3 animate-in fade-in zoom-in-95 duration-150 backdrop-blur-xl">
          
          {/* Presets Rápidos de Range */}
          <div className="mb-2 pb-2 border-b border-gray-800">
            <span className="block text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-1.5">
              ⚡ Ranges e Atalhos Rápidos:
            </span>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => handleApplyPreset(['1', '2', '3'])}
                className="px-2 py-1 bg-amber-500/10 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 rounded-lg text-[10px] font-bold transition-colors cursor-pointer"
                title="Disparar para quem avaliou com 1, 2 ou 3 estrelas"
              >
                ⭐ 1 a 3 Estrelas (Baixas)
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset(['4', '5'])}
                className="px-2 py-1 bg-emerald-500/10 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 rounded-lg text-[10px] font-bold transition-colors cursor-pointer"
                title="Disparar para quem avaliou com 4 ou 5 estrelas"
              >
                ⭐ 4 e 5 Estrelas (Altas)
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset(['skipped'])}
                className="px-2 py-1 bg-purple-500/10 hover:bg-purple-500/25 text-purple-300 border border-purple-500/30 rounded-lg text-[10px] font-bold transition-colors cursor-pointer"
                title="Disparar apenas para quem pulou a avaliação"
              >
                ⏩ Pulou Avaliação
              </button>
              <button
                type="button"
                onClick={handleSelectAllGeneric}
                className="px-2 py-1 bg-gray-700/50 hover:bg-gray-700 text-gray-300 border border-gray-600 rounded-lg text-[10px] font-bold transition-colors cursor-pointer"
                title="Limpar seleção e disparar para qualquer leitura"
              >
                🌐 Qualquer (Limpar)
              </button>
            </div>

            {/* Seletor Customizado de Range (De X a Y) */}
            <div className="mt-2 pt-2 border-t border-gray-800/60 flex items-center gap-1.5 text-[11px] text-gray-300">
              <span className="text-[10px] text-gray-400 font-semibold">Range customizado:</span>
              <span className="text-gray-400">De</span>
              <select
                value={rangeStart}
                onChange={(e) => setRangeStart(e.target.value)}
                className="bg-gray-800 border border-gray-700 rounded px-1.5 py-0.5 text-xs text-white"
              >
                {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n} ★</option>)}
              </select>
              <span className="text-gray-400">até</span>
              <select
                value={rangeEnd}
                onChange={(e) => setRangeEnd(e.target.value)}
                className="bg-gray-800 border border-gray-700 rounded px-1.5 py-0.5 text-xs text-white"
              >
                {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n} ★</option>)}
              </select>
              <button
                type="button"
                onClick={handleApplyCustomRange}
                className="px-2 py-0.5 bg-blue-600 hover:bg-blue-500 text-white rounded font-bold text-[10px] ml-auto transition-colors cursor-pointer"
              >
                Aplicar Range
              </button>
            </div>
          </div>

          {/* Campo de Busca */}
          <div className="relative mb-2">
            <FiSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={12} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Digite para filtrar opções..."
              className="w-full bg-gray-900/90 border border-gray-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Lista de Opções Individuais */}
          <div className="max-h-48 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
            {/* Opção Qualquer Avaliação */}
            <div
              onClick={handleSelectAllGeneric}
              className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs cursor-pointer transition-colors ${
                isGeneric
                  ? 'bg-blue-600 text-white font-bold'
                  : 'text-gray-300 hover:bg-gray-800/80 font-medium'
              }`}
            >
              <span>Qualquer Avaliação (Padrão - Todos)</span>
              {isGeneric && <FiCheck size={14} className="text-white" />}
            </div>

            {/* Opções específicas */}
            {filteredOptions.map((opt) => {
              const isSelected = selectedArray.includes(opt.value);
              return (
                <div
                  key={opt.value}
                  onClick={() => toggleOption(opt.value)}
                  className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-blue-600/90 text-white font-bold'
                      : 'text-gray-300 hover:bg-gray-800/80 font-medium'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}} // controlado pelo onClick do container
                      className="rounded border-gray-600 text-blue-600 focus:ring-0 cursor-pointer pointer-events-none"
                    />
                    <span>{opt.label}</span>
                  </div>
                  {isSelected && <FiCheck size={14} className="text-white shrink-0" />}
                </div>
              );
            })}
          </div>

          {/* Footer com contador e botão Concluir */}
          <div className="mt-2 pt-2 border-t border-gray-800 flex items-center justify-between">
            <span className="text-[10px] text-gray-400">
              {isGeneric ? 'Gatilho geral (todos)' : `${selectedArray.length} selecionado(s)`}
            </span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-2.5 py-1 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
            >
              Fechar
            </button>
          </div>

        </div>
      )}
    </div>
  );
}
