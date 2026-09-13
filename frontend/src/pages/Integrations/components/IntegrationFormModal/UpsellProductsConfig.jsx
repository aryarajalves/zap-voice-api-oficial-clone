import React, { useState, useRef } from 'react';
import { FiX, FiZap, FiTag } from 'react-icons/fi';

export default function UpsellProductsConfig({ upsellProducts = [], discoveredProducts = [], onChange }) {
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef(null);

  const addProduct = (name) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (upsellProducts.some(p => p.toLowerCase() === trimmed.toLowerCase())) return;
    onChange([...upsellProducts, trimmed]);
    setInputValue('');
    inputRef.current?.focus();
  };

  const removeProduct = (name) => {
    onChange(upsellProducts.filter(p => p !== name));
  };

  const suggestions = discoveredProducts.filter(
    p => !upsellProducts.some(u => u.toLowerCase() === p.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <FiZap className="text-yellow-400" size={14} />
        <span className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]">Produtos Upsell</span>
      </div>
      <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-relaxed">
        Quando uma compra chegar com um produto cujo nome esteja nesta lista, ela será identificada automaticamente como <span className="text-yellow-400 font-bold">Compra Aprovada (Upsell)</span>.
      </p>

      {/* Tag chips de produtos já adicionados */}
      {upsellProducts.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {upsellProducts.map(name => (
            <span
              key={name}
              className="inline-flex items-center gap-1.5 bg-yellow-500/10 border border-yellow-500/30 text-yellow-300 text-[10px] font-bold px-3 py-1.5 rounded-full"
            >
              <FiZap size={9} />
              {name}
              <button
                type="button"
                onClick={() => removeProduct(name)}
                className="text-yellow-400/60 hover:text-yellow-200 transition-colors ml-0.5"
              >
                <FiX size={10} />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Input para adicionar manualmente */}
      <div className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') { e.preventDefault(); addProduct(inputValue); }
          }}
          placeholder="Digite o nome exato do produto upsell..."
          className="flex-1 bg-white dark:bg-[#0b1120] border border-gray-100 dark:border-white/5 rounded-xl px-4 py-2.5 text-xs font-bold text-gray-900 dark:text-white focus:ring-4 focus:ring-yellow-500/10 focus:border-yellow-500 transition-all outline-none shadow-inner placeholder-gray-400"
        />
        <button
          type="button"
          onClick={() => addProduct(inputValue)}
          disabled={!inputValue.trim()}
          className="bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/30 text-yellow-300 px-4 py-2.5 rounded-xl text-xs font-black transition-all disabled:opacity-40 uppercase tracking-widest"
        >
          Adicionar
        </button>
      </div>

      {/* Sugestões dos produtos descobertos */}
      {suggestions.length > 0 && (
        <div className="space-y-2">
          <p className="text-[9px] text-gray-500 uppercase tracking-widest font-bold flex items-center gap-1.5">
            <FiTag size={9} />
            Produtos detectados no histórico (clique para adicionar)
          </p>
          <div className="flex flex-wrap gap-1.5">
            {suggestions.map(name => (
              <button
                key={name}
                type="button"
                onClick={() => addProduct(name)}
                className="inline-flex items-center gap-1 bg-white/5 hover:bg-yellow-500/10 border border-white/10 hover:border-yellow-500/30 text-gray-400 hover:text-yellow-300 text-[10px] font-bold px-2.5 py-1 rounded-full transition-all"
              >
                + {name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
