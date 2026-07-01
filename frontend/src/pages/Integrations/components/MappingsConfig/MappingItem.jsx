import React, { useState } from 'react';
import { FiPlay, FiTrash2, FiChevronDown, FiZap, FiSettings, FiRefreshCw, FiInfo, FiDatabase, FiUser, FiCode, FiSliders } from 'react-icons/fi';
import SearchableSelect from '../SearchableSelect';
import InternalTagsInput from './InternalTagsInput';
import { EVENT_TYPES, PLATFORM_EVENT_TYPES } from '../../constants';
import ManyChatSection from './ManyChatSection';
import SmartCancelSection from './SmartCancelSection';
import VariablesSection from './VariablesSection';
import FollowUpSection from './FollowUpSection';
import ContactSaveFieldsSection from './ContactSaveFieldsSection';
import TemplatePreview from '../../../../components/BulkSender/common/TemplatePreview';
import ButtonActionsSection from '../../../../components/BulkSender/steps/ButtonActionsSection';

const EVENT_HINTS = {
  compra_aprovada: '✅ Disparado no momento em que o pagamento é confirmado pela plataforma. É o evento mais usado — ideal para enviar boas-vindas, acesso ao produto e próximos passos imediatamente após a compra.',
  compra_concluida: '⏳ Disparado quando o prazo de garantia encerra e o cliente não pediu reembolso — ou seja, a venda é definitiva. Útil para enviar bônus ou conteúdo exclusivo após a garantia. Atenção: não confundir com "Compra Aprovada", que dispara no momento do pagamento.',
  compra_aprovada_upsell: '🔀 Disparado quando a compra é identificada como Upsell com base nos produtos configurados na aba "Upsell" desta integração.',
  compra_aprovada_ob: '📦 Disparado quando o produto vendido é ele próprio um Order Bump (produto adicional comprado junto à oferta principal).',
  compra_aprovada_com_ob: '📦 Disparado quando a compra principal veio acompanhada de um ou mais Order Bumps.',
  alteracao_vencimento: '📅 Disparado pela Hotmart quando a data de cobrança de uma assinatura é alterada (evento UPDATE_SUBSCRIPTION_CHARGE_DATE).',
  troca_de_plano: '🔄 Disparado pela Hotmart quando o assinante muda de plano (evento SWITCH_PLAN).',
};

const TABS = [
  { id: 'disparo',   label: 'Disparo',   icon: FiZap },
  { id: 'variaveis', label: 'Variáveis', icon: FiCode },
  { id: 'contato',   label: 'Contato',   icon: FiUser },
  { id: 'avancado',  label: 'Avançado',  icon: FiSliders },
];

const MappingItem = ({
  mapping,
  mIndex,
  isExpanded,
  toggleMapping,
  updateMapping,
  removeMapping,
  templates,
  funnels,
  chatwootLabels,
  updateVariable,
  addVariable,
  removeVariable,
  templateVars,
  customFieldsMapping,
  followupTemplateVars,
  addFollowupVariable,
  removeFollowupVariable,
  updateFollowupVariable,
  discoveredProducts,
  existingInternalTags,
  platform
}) => {
  const [activeTab, setActiveTab] = useState('disparo');
  const allowedEvents = platform && PLATFORM_EVENT_TYPES[platform]
    ? EVENT_TYPES.filter(e => PLATFORM_EVENT_TYPES[platform].includes(e.value))
    : null;

  const selectedTpl = templates.find(t => String(t.id) === String(mapping.template_id));

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
              Gatilho #{mIndex + 1}: {EVENT_TYPES.find(e => e.value === mapping.event_type)?.label || 'Evento'}{mapping.product_name ? ` (${mapping.product_name})` : ''}
            </span>
            {!isExpanded && mapping.template_id && (
              <div className="text-[9px] text-gray-500 font-bold mt-0.5">
                Template: {templates.find(t => String(t.id) === String(mapping.template_id))?.name || '...'}
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
        <div className="animate-in slide-in-from-top-4 duration-300">
          {/* Tab Bar */}
          <div className="flex border-b border-gray-100 dark:border-white/5 bg-gray-50/30 dark:bg-white/[0.02] px-4">
            {TABS.map(tab => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all -mb-px ${
                    active
                      ? 'border-blue-500 text-blue-500 dark:text-blue-400'
                      : 'border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                  }`}
                >
                  <Icon size={11} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Tab: Disparo */}
          {activeTab === 'disparo' && (
            <div className="p-5 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                {/* Evento */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest flex items-center gap-1.5 px-1">
                    <FiZap size={12} /> Evento
                  </label>
                  {!platform ? (
                    <div className="w-full bg-yellow-500/10 border border-yellow-500/30 rounded-xl px-4 py-3 text-xs font-bold text-yellow-400 text-center">
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
                  {EVENT_HINTS[mapping.event_type] && (
                    <div className="flex items-start gap-2 mt-2 p-2.5 bg-blue-500/5 border border-blue-500/20 rounded-xl text-[10px] text-blue-300/80 leading-relaxed">
                      <FiInfo size={12} className="text-blue-400 shrink-0 mt-0.5" />
                      <span>{EVENT_HINTS[mapping.event_type]}</span>
                    </div>
                  )}
                </div>

                {/* Produto */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest flex items-center gap-1.5 px-1">
                    <FiSettings size={12} /> Produto
                  </label>
                  <select
                    value={mapping.product_name || ''}
                    onChange={(e) => updateMapping(mIndex, 'product_name', e.target.value || null)}
                    className="w-full bg-gray-50 dark:bg-[#0b1120] border border-gray-100 dark:border-white/5 rounded-xl px-4 py-3 text-xs font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 transition-all outline-none shadow-inner cursor-pointer"
                  >
                    <option value="">Todos os Produtos</option>
                    {(discoveredProducts || []).map(prod => (
                      <option key={prod} value={prod}>{prod}</option>
                    ))}
                  </select>
                </div>

                {/* Template */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest flex items-center gap-1.5 px-1">
                    <FiSettings size={12} /> Template
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
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest flex items-center gap-1.5 px-1">
                    <FiRefreshCw size={12} /> Funil
                  </label>
                  <SearchableSelect
                    options={(funnels || []).map(f => ({ value: f.id, label: `${f.is_pinned ? '📌 ' : ''}${f.name}${f.tag ? ` [${f.tag}]` : ''}` }))}
                    value={mapping.funnel_id}
                    onChange={(val) => updateMapping(mIndex, 'funnel_id', val)}
                    placeholder="Selecione um Funil..."
                    allowNone
                  />
                </div>

                {/* Atraso */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest flex items-center gap-1.5 px-1">
                    <FiSettings size={12} /> Atraso (min)
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

              {/* Preview do Template */}
              {selectedTpl?.components && (
                <div className="pt-2">
                  <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                    <FiSettings size={12} /> Prévia
                  </p>
                  <TemplatePreview template={selectedTpl} params={{}} />
                </div>
              )}

              {/* Ações dos Botões */}
              {(() => {
                const buttonsComponent = selectedTpl?.components?.find(c => c.type === 'BUTTONS');
                const templateButtons = buttonsComponent?.buttons?.map(b => b.text) || [];
                if (templateButtons.length === 0) return null;
                return (
                  <div className="pt-4 border-t border-white/5 mt-4">
                    <ButtonActionsSection
                      templateButtons={templateButtons}
                      buttonActions={mapping.button_actions || {}}
                      setButtonActions={(newActions) => {
                        const updated = typeof newActions === 'function' ? newActions(mapping.button_actions || {}) : newActions;
                        updateMapping(mIndex, 'button_actions', updated);
                      }}
                      funnels={funnels || []}
                    />
                  </div>
                );
              })()}
            </div>
          )}

          {/* Tab: Variáveis */}
          {activeTab === 'variaveis' && (
            <div className="p-5">
              <VariablesSection
                mapping={mapping}
                mIndex={mIndex}
                updateMapping={updateMapping}
                updateVariable={updateVariable}
                addVariable={addVariable}
                removeVariable={removeVariable}
                templateVars={templateVars}
                customFieldsMapping={customFieldsMapping}
                templates={templates}
              />
            </div>
          )}

          {/* Tab: Contato */}
          {activeTab === 'contato' && (
            <div className="p-5 space-y-4">
              {/* Toggle: Atualizar contato */}
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-white/[0.03] rounded-xl border border-gray-100 dark:border-white/5">
                <div>
                  <p className="text-xs font-black text-gray-700 dark:text-gray-200 uppercase tracking-widest">
                    Atualizar contato na aba Contatos
                  </p>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    Quando ativado, o contato é criado/atualizado na aba Contatos ao disparar este gatilho
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer ml-4 flex-shrink-0">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={mapping.update_contact_on_trigger !== false}
                    onChange={(e) => updateMapping(mIndex, 'update_contact_on_trigger', e.target.checked)}
                  />
                  <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-600 peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Etiquetas Chat */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest flex items-center gap-1.5 px-1">
                    <FiSettings size={12} /> Etiquetas na conversa (Chat Local)
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

                {/* Etiquetas Internas */}
                {mapping.update_contact_on_trigger !== false && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest flex items-center gap-1.5 px-1">
                      <FiSettings size={12} /> Etiquetas Internas (ZapVoice)
                    </label>
                    <InternalTagsInput
                      value={mapping.internal_tags || ''}
                      onChange={(val) => updateMapping(mIndex, 'internal_tags', val)}
                      existingTags={existingInternalTags}
                      placeholder="Digite uma tag e aperte Enter..."
                    />
                  </div>
                )}
              </div>

              {/* Campos do contato */}
              {mapping.update_contact_on_trigger !== false && (
                <ContactSaveFieldsSection mapping={mapping} mIndex={mIndex} updateMapping={updateMapping} />
              )}
            </div>
          )}

          {/* Tab: Avançado */}
          {activeTab === 'avancado' && (
            <div className="p-5 space-y-4">
              <ManyChatSection mapping={mapping} mIndex={mIndex} updateMapping={updateMapping} />
              <SmartCancelSection mapping={mapping} mIndex={mIndex} updateMapping={updateMapping} />
              <FollowUpSection
                mapping={mapping}
                mIndex={mIndex}
                updateMapping={updateMapping}
                templates={templates}
                followupTemplateVars={followupTemplateVars}
                addFollowupVariable={addFollowupVariable}
                removeFollowupVariable={removeFollowupVariable}
                updateFollowupVariable={updateFollowupVariable}
                customFieldsMapping={customFieldsMapping}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MappingItem;
