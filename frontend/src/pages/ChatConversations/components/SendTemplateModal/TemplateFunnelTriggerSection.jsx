import React from 'react';
import { FiGitMerge } from 'react-icons/fi';

export default function TemplateFunnelTriggerSection({
  selectedFunnelId,
  setSelectedFunnelId,
  funnels,
  loadingFunnels
}) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-2">
      <div className="flex items-center gap-2">
        <FiGitMerge size={13} className="text-purple-400" />
        <span className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
          Disparar Funil após envio
        </span>
        <span className="text-[10px] text-gray-600 ml-auto">Opcional</span>
      </div>
      <select
        id="select-funnel-after-template"
        value={selectedFunnelId}
        onChange={(e) => setSelectedFunnelId(e.target.value)}
        className="w-full bg-[#0f172a] border border-white/10 text-white rounded-lg px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-purple-500 text-sm"
      >
        <option value="">Nenhum funil</option>
        {loadingFunnels ? (
          <option disabled>Carregando funis...</option>
        ) : (
          funnels.map(f => (
            <option key={f.id} value={f.id}>{f.name}</option>
          ))
        )}
      </select>
      {selectedFunnelId && (
        <p className="text-[11px] text-purple-300/70">
          O funil será disparado automaticamente após o envio do template.
        </p>
      )}
    </div>
  );
}
