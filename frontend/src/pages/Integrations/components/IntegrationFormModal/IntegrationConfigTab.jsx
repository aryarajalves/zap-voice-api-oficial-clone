import React from 'react';
import { FiSettings, FiShare2 } from 'react-icons/fi';
import PlatformSelect from './PlatformSelect';

export default function IntegrationConfigTab({ formData, setFormData }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <div className="space-y-3">
        <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] px-1">
          Nome da Integração (Interno)
        </label>
        <div className="relative group">
          <FiSettings className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
          <input
            type="text"
            required
            value={formData.name || ''}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full bg-white dark:bg-[#0b1120] border border-gray-100 dark:border-white/5 rounded-xl pl-12 pr-4 py-3 text-xs font-bold text-gray-900 dark:text-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none shadow-inner"
            placeholder="Ex: Hotmart - Produto VIP"
          />
        </div>
      </div>

      <div className="space-y-3">
        <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] px-1">
          Slug Personalizado (URL Amigável)
        </label>
        <div className="relative group">
          <FiShare2 className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
          <input
            type="text"
            value={formData.custom_slug || ''}
            onChange={(e) => setFormData({ ...formData, custom_slug: e.target.value })}
            className="w-full bg-white dark:bg-[#0b1120] border border-gray-100 dark:border-white/5 rounded-xl pl-12 pr-4 py-3 text-xs font-bold text-gray-900 dark:text-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none shadow-inner"
            placeholder="Ex: vendas-vips (Opcional)"
          />
        </div>
      </div>

      <div className="space-y-3">
        <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] px-1">
          Plataforma de Origem
        </label>
        <PlatformSelect
          value={formData.platform}
          onChange={(val) => setFormData({ ...formData, platform: val })}
        />
      </div>
    </div>
  );
}
