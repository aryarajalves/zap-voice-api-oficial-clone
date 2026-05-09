import React from 'react';
import { FiPlay, FiTrash2, FiChevronDown, FiZap, FiSettings } from 'react-icons/fi';
import SearchableSelect from '../SearchableSelect';
import { EVENT_TYPES } from '../../constants';
import ManyChatSection from './ManyChatSection';
import SmartCancelSection from './SmartCancelSection';
import VariablesSection from './VariablesSection';

const MappingItem = ({ 
  mapping, 
  mIndex, 
  isExpanded, 
  toggleMapping, 
  updateMapping, 
  removeMapping,
  templates,
  chatwootLabels,
  updateVariable,
  addVariable,
  removeVariable,
  templateVars
}) => {
  return (
    <div className="group bg-white dark:bg-[#1e293b]/40 rounded-2xl border border-gray-100 dark:border-white/5 overflow-hidden hover:border-blue-500/30 transition-all duration-300">
      {/* Header do Gatilho */}
      <div 
        className="px-6 py-4 bg-gray-50/50 dark:bg-white/[0.03] border-b border-gray-100 dark:border-white/5 flex justify-between items-center cursor-pointer hover:bg-gray-100/50 dark:hover:bg-white/[0.05] transition-colors"
        onClick={() => toggleMapping(mIndex)}
      >
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${isExpanded ? 'bg-blue-500/20 text-blue-500' : 'bg-gray-500/10 text-gray-500'}`}>
            <FiPlay size={14} className={isExpanded ? 'fill-current' : ''} />
          </div>
          <div>
            <span className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-widest">
              Gatilho #{mIndex + 1}: {EVENT_TYPES.find(e => e.value === mapping.event_type)?.label || 'Evento'}
            </span>
            {!isExpanded && mapping.template_id && (
              <div className="text-[9px] text-gray-500 font-bold mt-0.5">
                Template: {templates.find(t => t.id === mapping.template_id)?.name || '...'}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={mapping.is_active}
              onChange={(e) => updateMapping(mIndex, 'is_active', e.target.checked)}
            />
            <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-600 peer-checked:bg-blue-600"></div>
          </label>
          <button
            type="button"
            onClick={() => removeMapping(mIndex)}
            className="p-2 text-gray-400 hover:text-red-500 transition-all hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
          >
            <FiTrash2 size={16} />
          </button>
          <div className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
            <FiChevronDown size={18} className="text-gray-400" />
          </div>
        </div>
      </div>

      {/* Corpo do Gatilho */}
      {isExpanded && (
        <div className="p-5 space-y-6 animate-in slide-in-from-top-4 duration-500">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Evento */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest flex items-center gap-1.5 px-1">
                <FiZap size={12} /> Evento na Plataforma
              </label>
              <select
                value={mapping.event_type}
                onChange={(e) => updateMapping(mIndex, 'event_type', e.target.value)}
                className="w-full bg-gray-50 dark:bg-[#0b1120] border border-gray-100 dark:border-white/5 rounded-xl px-4 py-3 text-xs font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 transition-all outline-none shadow-inner"
              >
                {EVENT_TYPES.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* Template */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest flex items-center gap-1.5 px-1">
                <FiSettings size={12} /> Template ZapVoice
              </label>
              <SearchableSelect
                options={templates.map(t => ({ value: t.id, label: t.name }))}
                value={mapping.template_id}
                onChange={(val) => updateMapping(mIndex, 'template_id', val)}
                placeholder="Selecione um Template..."
                allowNone
              />
            </div>

            {/* Delay */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest flex items-center gap-1.5 px-1">
                <FiSettings size={12} /> Atraso no Envio (Minutos)
              </label>
              <input
                type="number"
                min="0"
                value={mapping.delay_minutes}
                onChange={(e) => updateMapping(mIndex, 'delay_minutes', parseInt(e.target.value) || 0)}
                className="w-full bg-gray-50 dark:bg-[#0b1120] border border-gray-100 dark:border-white/5 rounded-xl px-4 py-3 text-xs font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 transition-all outline-none shadow-inner"
                placeholder="0"
              />
            </div>
          </div>

          {/* Variáveis Section */}
          <VariablesSection 
            mapping={mapping}
            mIndex={mIndex}
            updateMapping={updateMapping}
            updateVariable={updateVariable}
            addVariable={addVariable}
            removeVariable={removeVariable}
            templateVars={templateVars}
          />

          {/* Configurações Avançadas de Gatilho */}
          <div className="pt-6 border-t border-gray-50 dark:border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
            <div className="space-y-4">
              {mapping.template_id && (
                <div className="flex items-center justify-between p-2.5 bg-gray-50/50 dark:bg-white/[0.02] rounded-xl border border-gray-100 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-300">
                  <div>
                    <span className="text-[10px] font-bold text-gray-700 dark:text-gray-300">Nota Privada Chatwoot</span>
                    <p className="text-[8px] text-gray-500">Log na conversa</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={mapping.private_note === "true"}
                      onChange={(e) => updateMapping(mIndex, 'private_note', e.target.checked ? "true" : "false")}
                    />
                    <div className="w-8 h-4 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all dark:border-slate-600 peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              )}

              <div className="flex items-center justify-between p-2.5 bg-blue-500/5 dark:bg-blue-500/10 rounded-xl border border-blue-500/10">
                <div>
                  <span className="text-[10px] font-bold text-blue-700 dark:text-blue-400">Disparar Memória</span>
                  <p className="text-[8px] text-gray-500">Sincronizar com IA</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={mapping.publish_external_event}
                    onChange={(e) => updateMapping(mIndex, 'publish_external_event', e.target.checked)}
                  />
                  <div className="w-8 h-4 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all dark:border-slate-600 peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest flex items-center gap-1.5 px-1">
                <FiSettings size={12} /> Etiquetas a aplicar no Chatwoot
              </label>
              <SearchableSelect
                isMulti={true}
                options={[...new Set((chatwootLabels || []).map(l => typeof l === 'object' ? (l.title || l.name || l.label) : l))].filter(Boolean).map(l => ({ value: l, label: l }))}
                value={mapping.chatwoot_label || []}
                onChange={(val) => updateMapping(mIndex, 'chatwoot_label', val)}
                placeholder="Adicione etiquetas..."
                colorClass="focus-within:ring-purple-500/20"
              />
            </div>
          </div>

          {/* ManyChat Integration Section */}
          <ManyChatSection mapping={mapping} mIndex={mIndex} updateMapping={updateMapping} />

          {/* Smart Interruption */}
          <SmartCancelSection mapping={mapping} mIndex={mIndex} updateMapping={updateMapping} />
        </div>
      )}
    </div>
  );
};

export default MappingItem;
