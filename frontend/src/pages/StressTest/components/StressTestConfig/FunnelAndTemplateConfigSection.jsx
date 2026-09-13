import React from 'react';

export default function FunnelAndTemplateConfigSection({
  testType,
  funnelId,
  setFunnelId,
  templateName,
  setTemplateName,
  pricingCategory,
  setPricingCategory,
  interactionFunnelId,
  setInteractionFunnelId,
  blockFunnelId,
  setBlockFunnelId,
  funnels,
  loadingFunnels
}) {
  if (testType === 'funnel') {
    return (
      <div>
        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Funil de Teste</label>
        <select
          value={funnelId}
          onChange={(e) => setFunnelId(e.target.value)}
          className="w-full bg-gray-900/50 border border-white/10 rounded-xl p-3 text-sm text-white focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all outline-none"
          disabled={loadingFunnels}
        >
          {funnels.map(f => (
            <option key={f.id} value={f.id} className="bg-[#131722] text-white">
              {f.is_pinned ? '📌 ' : ''}{f.name}{f.tag ? ` [${f.tag}]` : ''}
            </option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Nome do Template</label>
        <input
          type="text"
          value={templateName}
          onChange={(e) => setTemplateName(e.target.value)}
          placeholder="Ex: welcome_message"
          className="w-full bg-gray-900/50 border border-white/10 rounded-xl p-3 text-sm text-white focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all outline-none"
        />
      </div>
      <div>
        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Categoria do Template (Custo)</label>
        <div className="flex gap-2 bg-gray-100 dark:bg-gray-800/50 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setPricingCategory('marketing')}
            className={`flex-1 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
              pricingCategory === 'marketing'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            Marketing (R$ 0,35)
          </button>
          <button
            type="button"
            onClick={() => setPricingCategory('utility')}
            className={`flex-1 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
              pricingCategory === 'utility'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            Utility (R$ 0,07)
          </button>
        </div>
      </div>
      <div>
        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Funil de Interação</label>
        <select
          value={interactionFunnelId}
          onChange={(e) => setInteractionFunnelId(e.target.value)}
          className="w-full bg-gray-900/50 border border-white/10 rounded-xl p-3 text-sm text-white focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all outline-none"
        >
          <option value="" className="bg-[#131722] text-white">Nenhum (Apenas envia template)</option>
          {funnels.map(f => (
            <option key={f.id} value={f.id} className="bg-[#131722] text-white">
              {f.is_pinned ? '📌 ' : ''}{f.name}{f.tag ? ` [${f.tag}]` : ''}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Funil de Bloqueio</label>
        <select
          value={blockFunnelId}
          onChange={(e) => setBlockFunnelId(e.target.value)}
          className="w-full bg-gray-950/50 border border-white/10 rounded-xl p-3 text-sm text-white focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all outline-none"
        >
          <option value="" className="bg-[#131722] text-white">Nenhum</option>
          {funnels.map(f => (
            <option key={f.id} value={f.id} className="bg-[#131722] text-white">
              {f.is_pinned ? '📌 ' : ''}{f.name}{f.tag ? ` [${f.tag}]` : ''}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
