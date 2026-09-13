import React from 'react';
import { FiZap, FiSettings, FiInfo } from 'react-icons/fi';
import SearchableSelect from '../../SearchableSelect';
import TemplatePreview from '../../../../../components/BulkSender/common/TemplatePreview';
import { EVENT_HINTS } from './eventHints';

export default function TriggerTabContent({
  mapping,
  mIndex,
  updateMapping,
  templates,
  funnels,
  discoveredProducts,
  platform,
  allowedEvents,
  selectedTpl,
  templateButtons,
  onGoToButtonsTab,
}) {
  return (
    <div className="p-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Coluna Esquerda: Configuração e Regras do Disparo (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Bloco 1: Regra do Webhook */}
          <div className="bg-gray-50/50 dark:bg-white/[0.02] p-4 rounded-2xl border border-gray-100 dark:border-white/5 space-y-4">
            <h4 className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest flex items-center gap-2">
              <FiZap className="text-blue-500" size={13} /> 1. Regra do Gatilho (Origem)
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Evento */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Evento da Plataforma
                </label>
                {!platform ? (
                  <div className="w-full bg-yellow-500/10 border border-yellow-500/30 rounded-xl px-3 py-2 text-xs font-bold text-yellow-400 text-center">
                    ⚠️ Selecione uma plataforma primeiro
                  </div>
                ) : (
                  <SearchableSelect
                    options={allowedEvents}
                    value={mapping.event_type}
                    onChange={(val) => updateMapping(mIndex, 'event_type', val)}
                    placeholder="Selecione o evento..."
                  />
                )}
              </div>

              {/* Produto */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Produto / Grupo
                </label>
                <select
                  value={mapping.product_name || ''}
                  onChange={(e) => updateMapping(mIndex, 'product_name', e.target.value || null)}
                  className="w-full bg-white dark:bg-[#0b1120] border border-gray-200 dark:border-white/10 rounded-xl px-3.5 py-2.5 text-xs font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 transition-all outline-none shadow-inner cursor-pointer"
                >
                  <option value="">Todos os Produtos / Grupos</option>
                  {(discoveredProducts || []).map(prod => (
                    <option key={prod} value={prod}>{prod}</option>
                  ))}
                </select>
              </div>
            </div>

            {EVENT_HINTS[mapping.event_type] && (
              <div className="flex items-start gap-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-[11px] text-blue-300 leading-relaxed">
                <FiInfo size={14} className="text-blue-400 shrink-0 mt-0.5" />
                <span>{EVENT_HINTS[mapping.event_type]}</span>
              </div>
            )}
          </div>

          {/* Bloco 2: Ação de Envio */}
          <div className="bg-gray-50/50 dark:bg-white/[0.02] p-4 rounded-2xl border border-gray-100 dark:border-white/5 space-y-4">
            <h4 className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest flex items-center gap-2">
              <FiSettings className="text-blue-500" size={13} /> 2. Ação e Mensagem
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Template */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Template do WhatsApp
                </label>
                <SearchableSelect
                  options={templates.map(t => ({ value: t.id, label: t.name, tags: t.tags, is_pinned: t.is_pinned }))}
                  value={mapping.template_id}
                  onChange={(val) => updateMapping(mIndex, 'template_id', val)}
                  placeholder="Selecione um Template..."
                  allowNone
                />
              </div>

              {/* Funil */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Funil Automático (Opcional)
                </label>
                <SearchableSelect
                  options={(funnels || []).map(f => ({ value: f.id, label: `${f.is_pinned ? '📌 ' : ''}${f.name}${f.tag ? ` [${f.tag}]` : ''}` }))}
                  value={mapping.funnel_id}
                  onChange={(val) => updateMapping(mIndex, 'funnel_id', val)}
                  placeholder="Selecione um Funil..."
                  allowNone
                />
              </div>
            </div>

            {/* Atraso */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Atraso no Envio (Minutos)
                </label>
                <span className="text-blue-400 font-mono text-[11px] font-bold">
                  {mapping.delay_minutes ? `Disparar após ${mapping.delay_minutes} minuto(s)` : 'Disparo Imediato'}
                </span>
              </div>
              <input
                type="number"
                min="0"
                value={mapping.delay_minutes ?? 0}
                onChange={(e) => updateMapping(mIndex, 'delay_minutes', parseInt(e.target.value) || 0)}
                className="w-full bg-white dark:bg-[#0b1120] border border-gray-200 dark:border-white/10 rounded-xl px-3.5 py-2.5 text-xs font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 transition-all outline-none shadow-inner"
                placeholder="0 para envio imediato"
              />
            </div>
          </div>
        </div>

        {/* Coluna Direita: Prévia do Template (5 cols) */}
        <div className="lg:col-span-5 flex flex-col">
          <div className="bg-gray-50/50 dark:bg-white/[0.02] p-4 rounded-2xl border border-gray-100 dark:border-white/5 flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest flex items-center gap-2">
                📱 Prévia do Template
              </h4>
              {selectedTpl && (
                <span className="text-[9px] font-bold px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  {selectedTpl.name}
                </span>
              )}
            </div>

            {selectedTpl?.components ? (
              <div className="flex-1 flex flex-col justify-between space-y-4">
                <div className="overflow-hidden rounded-xl">
                  <TemplatePreview template={selectedTpl} params={{}} />
                </div>
                {templateButtons.length > 0 && (
                  <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center justify-between text-xs text-blue-300">
                    <span className="font-semibold">Template com {templateButtons.length} botão(ões)</span>
                    <button
                      type="button"
                      onClick={onGoToButtonsTab}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 shadow-md shadow-blue-600/20 cursor-pointer"
                    >
                      Configurar Botões →
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center border border-dashed border-gray-200 dark:border-white/10 rounded-xl min-h-[220px]">
                <FiZap size={32} className="text-gray-400 dark:text-gray-600 mb-2 opacity-50" />
                <p className="text-xs font-bold text-gray-400">Nenhum template selecionado</p>
                <p className="text-[10px] text-gray-500 mt-1">Selecione um template para ver a prévia</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
