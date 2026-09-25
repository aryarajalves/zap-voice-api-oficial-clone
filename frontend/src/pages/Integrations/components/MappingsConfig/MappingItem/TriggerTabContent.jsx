import React, { useState } from 'react';
import { FiZap, FiSettings, FiInfo, FiFileText, FiEye } from 'react-icons/fi';
import SearchableSelect from '../../SearchableSelect';
import TemplatePreview from '../../../../../components/BulkSender/common/TemplatePreview';
import { EVENT_HINTS } from './eventHints';
import BussolaPdfPreviewModal from '../../BussolaPdfPreviewModal';

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
  integrationId,
  onGoToButtonsTab,
}) {
  const [isBussolaPdfModalOpen, setIsBussolaPdfModalOpen] = useState(false);

  const isBussolaPlatform = ['bussola_quiz', 'quiz_bussola', 'landing_page_bussola_quiz'].includes(platform);
  const isBussolaPdfActive = (mapping.variables_mapping || []).some(
    v =>
      (v.type === 'header' || !v.type) &&
      ['bussola_pdf_auto', 'bussola_cover_auto'].includes(v.value || v.custom_value)
  );

  const handleToggleBussolaPdf = () => {
    const newVars = [...(mapping.variables_mapping || [])];
    const existingIdx = newVars.findIndex(
      v =>
        (v.type === 'header' || !v.type) &&
        ['bussola_pdf_auto', 'bussola_cover_auto'].includes(v.value || v.custom_value)
    );

    if (existingIdx !== -1) {
      newVars.splice(existingIdx, 1);
    } else {
      const headerIdx = newVars.findIndex(v => v.type === 'header');
      const newEntry = { type: 'header', key: '0', value: 'bussola_pdf_auto', custom_value: 'bussola_pdf_auto' };
      if (headerIdx !== -1) {
        newVars[headerIdx] = newEntry;
      } else {
        newVars.push(newEntry);
      }
    }
    updateMapping(mIndex, 'variables_mapping', newVars);
  };

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

            {/* Card Especial da Bússola Quiz: Geração de PDF e Visualizador */}
            {isBussolaPlatform && (
              <div className="pt-3 border-t border-gray-100 dark:border-white/5 space-y-3">
                <div className="p-3.5 rounded-xl bg-blue-500/[0.04] border border-blue-500/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                        <FiFileText size={15} />
                      </div>
                      <div>
                        <h5 className="text-xs font-bold text-gray-900 dark:text-white">
                          Gerar PDF da Leitura Astrológica
                        </h5>
                        <p className="text-[10px] text-gray-400">
                          Cria um PDF minimalista usando a 'mensagem' do JSON e anexa ao template
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      aria-label="Alternar geração de PDF da Bússola"
                      onClick={handleToggleBussolaPdf}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        isBussolaPdfActive ? 'bg-blue-600' : 'bg-gray-700'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                          isBussolaPdfActive ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-blue-500/10">
                    <span className="text-[10px] text-blue-400 font-semibold">
                      {isBussolaPdfActive ? '✅ PDF ativo para envio no template' : 'Ative para anexar o PDF automaticamente'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsBussolaPdfModalOpen(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all shadow-md shadow-blue-600/20 active:scale-95 cursor-pointer"
                    >
                      <FiEye size={12} />
                      <span>Visualizar PDF</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
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

            {isBussolaPlatform && (
              <div className="mt-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center justify-between text-xs text-blue-300">
                <span className="font-semibold flex items-center gap-1.5">
                  <FiFileText size={14} className="text-blue-400" /> PDF Bússola Quiz
                </span>
                <button
                  type="button"
                  onClick={() => setIsBussolaPdfModalOpen(true)}
                  className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer"
                >
                  Ver Renderização →
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <BussolaPdfPreviewModal
        isOpen={isBussolaPdfModalOpen}
        onClose={() => setIsBussolaPdfModalOpen(false)}
        integrationId={integrationId}
      />
    </div>
  );
}
