import React, { useState } from 'react';
import { FiChevronDown, FiSearch } from 'react-icons/fi';
import { ddiOptions, sanitizePhoneNumber } from '../constants/ddiOptions';

export default function DdiDropdown({
  ddi,
  setDdi,
  setPhone
}) {
  const [ddiDropdownOpen, setDdiDropdownOpen] = useState(false);
  const [ddiSearch, setDdiSearch] = useState('');

  const selectedCountry = ddiOptions.find(o => o.dialCode === ddi) || ddiOptions[0];

  const filteredDdiOptions = ddiOptions.filter(opt => {
    if (!ddiSearch.trim()) return true;
    const term = ddiSearch.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const nameNorm = opt.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const codeNorm = opt.code.toLowerCase();
    const dialNorm = opt.dialCode.replace(/\D/g, '');
    const termDigits = term.replace(/\D/g, '');

    return nameNorm.includes(term) ||
           codeNorm.includes(term) ||
           opt.dialCode.includes(term) ||
           (termDigits && dialNorm.includes(termDigits));
  });

  return (
    <div className="relative">
      {/* Botão Gatilho */}
      <button
        type="button"
        onClick={() => setDdiDropdownOpen(!ddiDropdownOpen)}
        className="h-full flex items-center justify-between gap-1.5 px-3 py-3.5 bg-[#141b2d] border border-gray-700/60 rounded-xl text-white hover:border-blue-500 focus:outline-none focus:border-blue-500 transition-all text-sm font-medium cursor-pointer min-w-[120px]"
      >
        <span className="text-base">{selectedCountry.flag}</span>
        <span className="font-mono text-xs text-gray-300 font-bold">{selectedCountry.dialCode}</span>
        <FiChevronDown className={`text-gray-400 transition-transform ${ddiDropdownOpen ? 'rotate-180' : ''}`} size={14} />
      </button>

      {/* Modal/Menu suspenso com campo de busca */}
      {ddiDropdownOpen && (
        <>
          {/* Backdrop para fechar ao clicar fora */}
          <div className="fixed inset-0 z-40" onClick={() => setDdiDropdownOpen(false)} />

          <div className="absolute left-0 top-full mt-2 w-72 max-h-80 bg-[#0e1322] border border-gray-700/80 rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-100">
            {/* Campo de Busca Sticky */}
            <div className="p-2.5 border-b border-gray-800 bg-[#141b2d]">
              <div className="relative">
                <FiSearch className="absolute left-3 top-2.5 text-gray-400" size={14} />
                <input
                  type="text"
                  value={ddiSearch}
                  onChange={(e) => setDdiSearch(e.target.value)}
                  placeholder="Buscar por país ou DDI (ex: 55, Brasil)..."
                  autoFocus
                  className="w-full pl-8 pr-3 py-1.5 bg-[#0e1322] border border-gray-700 rounded-lg text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Lista de Países Filtrados */}
            <div className="overflow-y-auto divide-y divide-gray-800/40 max-h-60">
              {filteredDdiOptions.length === 0 ? (
                <div className="p-4 text-center text-xs text-gray-400">Nenhum país encontrado</div>
              ) : (
                filteredDdiOptions.map((opt) => (
                  <button
                    key={`${opt.code}-${opt.dialCode}`}
                    type="button"
                    onClick={() => {
                      setDdi(opt.dialCode);
                      setPhone(prev => sanitizePhoneNumber(prev, opt.dialCode));
                      setDdiDropdownOpen(false);
                      setDdiSearch('');
                    }}
                    className={`w-full px-3 py-2.5 flex items-center justify-between text-left hover:bg-blue-600/20 transition-colors text-xs cursor-pointer ${opt.dialCode === ddi ? 'bg-blue-600/30 text-white font-semibold' : 'text-gray-300'}`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="text-base">{opt.flag}</span>
                      <span className="font-medium truncate">{opt.name}</span>
                    </div>
                    <span className="font-mono text-gray-400 font-bold ml-2 shrink-0">{opt.dialCode}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
