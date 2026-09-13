import React from 'react';
import { FiSettings, FiClock } from 'react-icons/fi';
import SearchableSelect from '../../../SearchableSelect';

export default function FollowUpBasicSettings({
  mapping,
  mIndex,
  updateMapping,
  templates = []
}) {
  const templateOptions = templates.map(t => ({
    value: t.id,
    label: t.name,
    tags: t.tags,
    is_pinned: t.is_pinned
  }));

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* Escolha do Template de Follow-up */}
      <div className="space-y-2">
        <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest flex items-center gap-1.5 px-1">
          <FiSettings size={12} /> Template de Follow-up
        </label>
        <SearchableSelect
          options={templateOptions}
          value={mapping.followup_template_id}
          onChange={(val) => updateMapping(mIndex, 'followup_template_id', val)}
          placeholder="Selecione o segundo Template..."
          allowNone
        />
      </div>

      {/* Tempo de Espera */}
      <div className="space-y-2">
        <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest flex items-center gap-1.5 px-1">
          <FiClock size={12} /> Tempo de Espera
        </label>
        <div className="flex gap-2">
          <input
            type="number"
            min="1"
            value={mapping.followup_delay_value || ''}
            onChange={(e) => updateMapping(mIndex, 'followup_delay_value', parseInt(e.target.value) || 0)}
            className="w-2/3 bg-gray-50 dark:bg-[#0b1120] border border-gray-100 dark:border-white/5 rounded-xl px-4 py-3 text-xs font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 transition-all outline-none shadow-inner"
            placeholder="Tempo..."
          />
          <select
            value={mapping.followup_delay_unit || 'minutes'}
            onChange={(e) => updateMapping(mIndex, 'followup_delay_unit', e.target.value)}
            className="w-1/3 bg-gray-50 dark:bg-[#0b1120] border border-gray-100 dark:border-white/5 rounded-xl px-2 py-3 text-xs font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 transition-all outline-none shadow-inner"
          >
            <option value="minutes">Minutos</option>
            <option value="hours">Horas</option>
          </select>
        </div>
      </div>

      {/* Restringir ao Horário Comercial */}
      <div className="space-y-2 flex flex-col justify-end pb-3">
        <label className="relative inline-flex items-center cursor-pointer select-none">
          <input
            type="checkbox"
            className="sr-only peer"
            checked={mapping.followup_business_hours_active || false}
            onChange={(e) => updateMapping(mIndex, 'followup_business_hours_active', e.target.checked)}
          />
          <div className="w-10 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-indigo-600"></div>
          <span className="ml-3 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">
            Restringir ao Horário Comercial
          </span>
        </label>
      </div>
    </div>
  );
}
