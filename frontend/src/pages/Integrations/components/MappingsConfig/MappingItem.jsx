import React, { useState } from 'react';
import { FiPlay, FiTrash2, FiChevronDown, FiZap, FiSettings, FiRefreshCw, FiInfo, FiDatabase, FiUser, FiCode, FiSliders, FiMessageSquare, FiTag } from 'react-icons/fi';
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
  checkout_pre_populado: '🛒 Disparado quando o lead acessa o checkout pré-populado ou abandona o carrinho com dados já preenchidos (PURCHASE_OUT_OF_SHOPPING_CART).',
  voto_enquete: '📊 Disparado pelo ZapGroup quando um participante vota em uma enquete do grupo. Extrai {{titulo_enquete}} e {{opcao_marcada}}.',
  lead_extraido: '👥 Disparado pelo ZapGroup quando um participante é extraído do grupo do WhatsApp.',
  alteracao_vencimento: '📅 Disparado pela Hotmart quando a data de cobrança de uma assinatura é alterada (evento UPDATE_SUBSCRIPTION_CHARGE_DATE).',
  troca_de_plano: '🔄 Disparado pela Hotmart quando o assinante muda de plano (evento SWITCH_PLAN).',
};

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
  const buttonsComponent = selectedTpl?.components?.find(c => c.type === 'BUTTONS');
  const templateButtons = buttonsComponent?.buttons?.map(b => b.text) || [];

  const tabs = [
    { id: 'disparo',   label: 'Disparo',   icon: FiZap },
    { 
      id: 'botoes', 
      label: 'Ação dos Botões', 
      icon: FiMessageSquare, 
      badge: templateButtons.length > 0 ? templateButtons.length : null 
    },
    { 
      id: 'variaveis', 
      label: 'Variáveis', 
      icon: FiCode, 
      badge: (templateVars || []).length > 0 ? (templateVars || []).length : null 
    },
    { id: 'contato',   label: 'Contato & Tags', icon: FiUser },
    { id: 'avancado',  label: 'Avançado',  icon: FiSliders },
  ];

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
          <div className="flex border-b border-gray-100 dark:border-white/5 bg-gray-50/30 dark:bg-white/[0.02] px-4 gap-1 overflow-x-auto">
            {tabs.map(tab => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all -mb-px whitespace-nowrap ${
                    active
                      ? 'border-blue-500 text-blue-500 dark:text-blue-400 bg-blue-500/5'
                      : 'border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                  }`}
                >
                  <Icon size={12} />
                  <span>{tab.label}</span>
                  {tab.badge > 0 && (
                    <span className={`text-[9px] font-black px-1.5 py-0.2 rounded-full min-w-[16px] text-center leading-tight ${
                      active ? 'bg-blue-500 text-white' : 'bg-blue-500/20 text-blue-400'
                    }`}>
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Tab: Disparo */}
          {activeTab === 'disparo' && (
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
                              onClick={() => setActiveTab('botoes')}
                              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 shadow-md shadow-blue-600/20"
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
          )}

          {/* Tab: Ação dos Botões */}
          {activeTab === 'botoes' && (
            <div className="p-6">
              {templateButtons.length > 0 ? (
                <div className="space-y-4">
                  <div className="bg-blue-500/5 border border-blue-500/20 p-3.5 rounded-xl flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-blue-300">Ações Interativas dos Botões</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">Defina o que o sistema deve fazer quando o lead clicar em cada botão deste template.</p>
                    </div>
                    <span className="text-xs font-black px-2.5 py-1 rounded-lg bg-blue-500/20 text-blue-400">
                      {templateButtons.length} Botão(ões)
                    </span>
                  </div>

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
              ) : (
                <div className="flex flex-col items-center justify-center p-12 text-center bg-gray-50/50 dark:bg-white/[0.02] rounded-2xl border border-gray-100 dark:border-white/5">
                  <FiMessageSquare size={36} className="text-gray-400 dark:text-gray-600 mb-3 opacity-60" />
                  <h4 className="text-sm font-bold text-gray-300">Sem botões interativos</h4>
                  <p className="text-xs text-gray-500 max-w-sm mt-1">
                    O template selecionado atualmente não possui botões. Para configurar ações de clique, escolha um template com botões de resposta rápida.
                  </p>
                </div>
              )}
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
