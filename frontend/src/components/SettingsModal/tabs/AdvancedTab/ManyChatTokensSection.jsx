import React, { useState } from 'react';
import { FiShare2, FiPlus, FiTrash2, FiEye, FiEyeOff } from 'react-icons/fi';

export default function ManyChatTokensSection({
  formData,
  handleChange,
  visibleFields
}) {
  const [visibleTokenKeys, setVisibleTokenKeys] = useState({});

  const getParsedTokens = () => {
    const rawKeys = formData?.MANYCHAT_API_KEYS;
    const rawSingle = formData?.MANYCHAT_API_KEY;

    if (rawKeys) {
      if (Array.isArray(rawKeys) && rawKeys.length > 0) return rawKeys;
      if (typeof rawKeys === 'string' && rawKeys.trim()) {
        try {
          const parsed = JSON.parse(rawKeys);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        } catch (e) {}
        const parts = rawKeys.split(/[\n,]+/).map(p => p.trim()).filter(Boolean);
        if (parts.length > 0) {
          return parts.map((p, idx) => ({ id: String(idx + 1), name: `Conta ${idx + 1}`, key: p }));
        }
      }
    }

    if (rawSingle && typeof rawSingle === 'string' && rawSingle.trim()) {
      const rawStr = rawSingle.trim();
      if (rawStr.startsWith('[') && rawStr.endsWith(']')) {
        try {
          const parsed = JSON.parse(rawStr);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        } catch (e) {}
      }

      const parts = rawStr.split(/[\n,]+/).map(p => p.trim()).filter(Boolean);
      return parts.map((p, idx) => ({
        id: String(idx + 1),
        name: parts.length > 1 ? `Conta ${idx + 1}` : 'Conta Principal',
        key: p
      }));
    }

    return [{ id: '1', name: 'Conta Principal', key: '' }];
  };

  const tokensList = getParsedTokens();

  const updateTokensInForm = (newTokens) => {
    const jsonStr = JSON.stringify(newTokens);
    const firstKey = newTokens.length > 0 ? (newTokens[0].key || '') : '';
    
    handleChange({ target: { name: 'MANYCHAT_API_KEYS', value: jsonStr, type: 'text' } });
    handleChange({ target: { name: 'MANYCHAT_API_KEY', value: firstKey, type: 'text' } });
  };

  const handleAddToken = () => {
    const newTokens = [
      ...tokensList,
      { id: Date.now().toString(), name: `Conta ${tokensList.length + 1}`, key: '' }
    ];
    updateTokensInForm(newTokens);
  };

  const handleRemoveToken = (indexToRemove) => {
    const newTokens = tokensList.filter((_, idx) => idx !== indexToRemove);
    updateTokensInForm(newTokens.length > 0 ? newTokens : [{ id: '1', name: 'Conta Principal', key: '' }]);
  };

  const handleTokenChange = (index, field, val) => {
    const newTokens = tokensList.map((t, idx) => {
      if (idx === index) {
        return { ...t, [field]: val };
      }
      return t;
    });
    updateTokensInForm(newTokens);
  };

  const toggleTokenVisibility = (idx) => {
    setVisibleTokenKeys(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  return (
    <div className="space-y-4 mb-8 bg-gray-50 dark:bg-white/5 p-4 rounded-xl border border-gray-200 dark:border-white/10">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="p-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
            <FiShare2 className="h-5 w-5" />
          </span>
          <div>
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200">Integração ManyChat</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">Cadastre um ou mais Tokens de API do ManyChat.</p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleAddToken}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-sm cursor-pointer"
        >
          <FiPlus size={14} />
          <span>Adicionar Token</span>
        </button>
      </div>

      <div className="space-y-3 mt-3">
        {tokensList.map((tokenItem, index) => (
          <div key={tokenItem.id || index} className="p-3 bg-white dark:bg-[#1a2234] border border-gray-200 dark:border-white/10 rounded-lg space-y-2">
            <div className="flex items-center justify-between gap-2">
              <input
                type="text"
                value={tokenItem.name || ''}
                onChange={(e) => handleTokenChange(index, 'name', e.target.value)}
                placeholder={`Nome da Conta (ex: Conta ${index + 1})`}
                className="text-xs font-semibold text-blue-600 dark:text-blue-400 bg-transparent border-b border-transparent hover:border-gray-300 dark:hover:border-white/20 focus:border-blue-500 outline-none px-1 py-0.5"
              />
              {tokensList.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleRemoveToken(index)}
                  className="text-xs text-red-500 hover:text-red-600 p-1 rounded hover:bg-red-500/10 transition-colors cursor-pointer"
                  title="Remover este Token"
                >
                  <FiTrash2 size={14} />
                </button>
              )}
            </div>

            <div className="relative">
              <input
                type={visibleTokenKeys[index] || visibleFields?.['MANYCHAT_API_KEY'] ? "text" : "password"}
                value={tokenItem.key || ''}
                onChange={(e) => handleTokenChange(index, 'key', e.target.value)}
                placeholder="976456:4994b0c91..."
                className="w-full p-2.5 pr-10 border border-gray-300 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all font-mono text-sm bg-gray-50 dark:bg-[#111827] text-gray-900 dark:text-white"
                autoComplete="off"
              />
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleTokenVisibility(index); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-500 transition-colors z-20 cursor-pointer"
                title={visibleTokenKeys[index] ? "Esconder" : "Visualizar"}
              >
                {visibleTokenKeys[index] ? <FiEyeOff size={18} /> : <FiEye size={18} />}
              </button>
            </div>
          </div>
        ))}
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400">Tokens gerados no ManyChat em Settings {'>'} API.</p>
    </div>
  );
}
