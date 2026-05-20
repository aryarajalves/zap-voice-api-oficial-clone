import React from 'react';
import { FiClock, FiSettings, FiZap, FiPlus, FiTrash2, FiCalendar } from 'react-icons/fi';
import SearchableSelect from '../SearchableSelect';
import { HEADER_VAR_OPTIONS, BODY_VAR_OPTIONS } from '../../constants';

const FollowUpSection = ({
  mapping,
  mIndex,
  updateMapping,
  templates,
  followupTemplateVars,
  addFollowupVariable,
  removeFollowupVariable,
  updateFollowupVariable,
  customFieldsMapping = {}
}) => {
  const isActive = mapping.followup_active || false;
  const selectedTemplate = templates.find(
    t => t.id === mapping.followup_template_id || String(t.id) === String(mapping.followup_template_id)
  );
  const hasVars = followupTemplateVars && followupTemplateVars.length > 0;
  const hasMedia = selectedTemplate && ['IMAGE', 'VIDEO', 'DOCUMENT'].includes(selectedTemplate.header_type);
  const needsConfig = hasVars || hasMedia;

  // Opções para o dropdown de variáveis customizadas
  const customOptions = Object.keys(customFieldsMapping || {}).map(key => ({
    value: key,
    label: `Personalizado: {{${key}}}`
  }));

  const getDynamicOptions = (baseOptions) => {
    const options = [...baseOptions];
    const customIdx = options.findIndex(opt => opt.value === 'custom');
    if (customIdx !== -1) {
      options.splice(customIdx, 0, ...customOptions);
    } else {
      options.push(...customOptions);
    }
    return options;
  };

  const dynamicBodyOptions = getDynamicOptions(BODY_VAR_OPTIONS);
  const dynamicHeaderOptions = getDynamicOptions(HEADER_VAR_OPTIONS);

  return (
    <div className="pt-6 border-t border-gray-50 dark:border-slate-800 space-y-4">
      {/* Switch Principal */}
      <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-500/5 to-indigo-500/5 dark:from-blue-500/10 dark:to-indigo-500/10 rounded-2xl border border-blue-500/10 dark:border-blue-500/20">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${isActive ? 'bg-indigo-500/20 text-indigo-500 shadow-md shadow-indigo-500/10' : 'bg-gray-500/10 text-gray-500'}`}>
            <FiClock size={16} />
          </div>
          <div>
            <span className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-wider">
              Disparar Mensagem de Follow-up (Recorrência de Template)
            </span>
            <p className="text-[9px] text-gray-500 dark:text-gray-400 mt-0.5">
              Caso o contato não responda à mensagem inicial, envie um segundo template automaticamente.
            </p>
          </div>
        </div>
        <label className="relative inline-flex items-center cursor-pointer select-none">
          <input
            type="checkbox"
            className="sr-only peer"
            checked={isActive}
            onChange={(e) => updateMapping(mIndex, 'followup_active', e.target.checked)}
          />
          <div className="w-10 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-indigo-600"></div>
        </label>
      </div>

      {/* Configurações Adicionais do Follow-up (Só exibe se ativado) */}
      {isActive && (
        <div className="p-5 bg-gray-50/50 dark:bg-white/[0.01] border border-gray-100 dark:border-white/5 rounded-2xl space-y-6 animate-in slide-in-from-top-3 duration-500">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Escolha do Template de Follow-up */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest flex items-center gap-1.5 px-1">
                <FiSettings size={12} /> Template de Follow-up
              </label>
              <SearchableSelect
                options={templates.map(t => ({ value: t.id, label: t.name }))}
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

          {/* Configurações detalhadas de Horário Comercial */}
          {mapping.followup_business_hours_active && (
            <div className="bg-indigo-500/[0.02] dark:bg-indigo-500/[0.03] border border-indigo-500/10 rounded-2xl p-5 space-y-4 animate-in slide-in-from-top-2 duration-300">
              <div className="flex justify-between items-center px-1">
                <h5 className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.2em] flex items-center gap-2">
                  <FiCalendar size={14} /> Definição do Horário Comercial do Follow-up
                </h5>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Dias da Semana */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest px-1 block">
                    Dias da Semana Permitidos
                  </label>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {[
                      { id: 0, label: 'Seg' },
                      { id: 1, label: 'Ter' },
                      { id: 2, label: 'Qua' },
                      { id: 3, label: 'Qui' },
                      { id: 4, label: 'Sex' },
                      { id: 5, label: 'Sáb' },
                      { id: 6, label: 'Dom' }
                    ].map((day) => {
                      const daysList = mapping.followup_business_hours_days || [0, 1, 2, 3, 4];
                      const isActive = daysList.includes(day.id);
                      return (
                        <button
                          key={day.id}
                          type="button"
                          onClick={() => {
                            let newDays;
                            if (isActive) {
                              newDays = daysList.filter(d => d !== day.id);
                            } else {
                              newDays = [...daysList, day.id].sort();
                            }
                            updateMapping(mIndex, 'followup_business_hours_days', newDays);
                          }}
                          className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                            isActive 
                            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10' 
                            : 'bg-gray-50 dark:bg-[#0b1120] text-gray-400 border border-gray-100 dark:border-white/5 hover:border-indigo-500/20'
                          }`}
                        >
                          {day.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Intervalo de Horário */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest px-1 block">
                      Horário Inicial
                    </label>
                    <input
                      type="time"
                      value={mapping.followup_business_hours_start || '08:00'}
                      onChange={(e) => updateMapping(mIndex, 'followup_business_hours_start', e.target.value)}
                      className="w-full bg-gray-50 dark:bg-[#0b1120] border border-gray-100 dark:border-white/5 rounded-xl px-4 py-3 text-xs font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 transition-all outline-none shadow-inner font-mono"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest px-1 block">
                      Horário Final
                    </label>
                    <input
                      type="time"
                      value={mapping.followup_business_hours_end || '18:00'}
                      onChange={(e) => updateMapping(mIndex, 'followup_business_hours_end', e.target.value)}
                      className="w-full bg-gray-50 dark:bg-[#0b1120] border border-gray-100 dark:border-white/5 rounded-xl px-4 py-3 text-xs font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 transition-all outline-none shadow-inner font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Mapeamento de Variáveis do Template de Follow-up */}
          {mapping.followup_template_id && followupTemplateVars.length > 0 && (
            <div className="bg-indigo-500/[0.02] dark:bg-indigo-500/[0.03] border border-indigo-500/10 rounded-2xl p-5 space-y-4 animate-in slide-in-from-top-2 duration-300">
              <div className="flex justify-between items-center px-1">
                <h5 className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.2em] flex items-center gap-2">
                  <FiZap size={14} className="fill-current" /> Variáveis do Template de Follow-up Detectadas
                </h5>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {followupTemplateVars.map((tplVar) => {
                  const existingVarIdx = (mapping.followup_variables_mapping || []).findIndex(
                    v => v.key === tplVar.key && (v.type === tplVar.type || (tplVar.type === 'body' && !v.type))
                  );
                  const variable = existingVarIdx !== -1 
                    ? mapping.followup_variables_mapping[existingVarIdx] 
                    : { key: tplVar.key, value: '', type: tplVar.type };

                  return (
                    <div key={`fu-${tplVar.type}-${tplVar.key}`} className="bg-white dark:bg-[#0b1120]/40 border border-gray-100 dark:border-white/5 rounded-xl p-3 flex flex-col gap-2 transition-all hover:border-indigo-500/30 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 bg-indigo-500/10 rounded-lg flex items-center justify-center text-indigo-500 text-[9px] font-black">
                            {tplVar.key}
                          </div>
                          <span className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">{tplVar.label}</span>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <div className="flex-1">
                          <SearchableSelect
                            options={tplVar.type.includes('header') ? dynamicHeaderOptions : dynamicBodyOptions}
                            value={variable.value}
                            onChange={(val) => {
                              if (existingVarIdx !== -1) {
                                updateFollowupVariable(mIndex, existingVarIdx, 'value', val);
                              } else {
                                const newVars = [...(mapping.followup_variables_mapping || []), { ...variable, value: val }];
                                updateMapping(mIndex, 'followup_variables_mapping', newVars);
                              }
                            }}
                            placeholder="Mapear campo..."
                          />
                        </div>
                        {variable.value === 'custom' && (
                          <div className="w-1/2 animate-in slide-in-from-right-2 duration-300">
                            <input
                              type="text"
                              value={variable.custom_value || ''}
                              onChange={(e) => {
                                if (existingVarIdx !== -1) {
                                  updateFollowupVariable(mIndex, existingVarIdx, 'custom_value', e.target.value);
                                } else {
                                  const newVars = [...(mapping.followup_variables_mapping || []), { ...variable, custom_value: e.target.value }];
                                  updateMapping(mIndex, 'followup_variables_mapping', newVars);
                                }
                              }}
                              placeholder="Path (ex: customer.name)"
                              className="w-full h-[38px] bg-gray-50 dark:bg-[#0f172a] border border-indigo-500/20 rounded-lg px-3 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 outline-none focus:ring-1 focus:ring-indigo-500/30 shadow-inner"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Botão de adicionar variável manual/mídia caso a lista manual esteja vazia */}
          {mapping.followup_template_id && needsConfig && ((mapping.followup_variables_mapping || []).filter(v => {
            return !followupTemplateVars.some(tv => tv.key === v.key && (tv.type === v.type || (tv.type === 'body' && !v.type)));
          })).length === 0 && (
            <div className="flex justify-start px-1 pt-2">
              <button
                type="button"
                onClick={() => addFollowupVariable(mIndex)}
                className="text-[10px] font-bold text-indigo-500 hover:text-white hover:bg-indigo-600 px-4 py-2 rounded-xl border border-indigo-500/20 transition-all active:scale-95 flex items-center gap-1.5 shadow-sm"
              >
                <FiPlus size={12} /> Configurar Mídias / Variáveis Manuais (Follow-up)
              </button>
            </div>
          )}

          {/* Variáveis Adicionais / Cabeçalho do Follow-up (Manuais) */}
          {mapping.followup_template_id && ((mapping.followup_variables_mapping || []).filter(v => {
            return !followupTemplateVars.some(tv => tv.key === v.key && (tv.type === v.type || (tv.type === 'body' && !v.type)));
          })).length > 0 && (
            <div className="pt-6 border-t border-gray-50 dark:border-slate-800 space-y-4">
              <div className="flex justify-between items-center px-1">
                <h5 className="text-[11px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.2em] flex items-center gap-2">
                  <FiPlus className="text-indigo-400" /> Variáveis Adicionais / Cabeçalho (Follow-up)
                </h5>
                <button
                  type="button"
                  onClick={() => addFollowupVariable(mIndex)}
                  className="text-[10px] font-bold text-indigo-500 hover:text-white hover:bg-indigo-600 px-3 py-1.5 rounded-lg border border-indigo-500/20 transition-all active:scale-95 flex items-center gap-1.5"
                >
                  <FiPlus size={12} /> Outra Variável
                </button>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {(mapping.followup_variables_mapping || []).filter(v => {
                  return !followupTemplateVars.some(tv => tv.key === v.key && (tv.type === v.type || (tv.type === 'body' && !v.type)));
                }).map((variable) => {
                  const actualVIndex = mapping.followup_variables_mapping.findIndex(v => v === variable);
                  return (
                    <div key={`fu-manual-${actualVIndex}`} className="bg-white dark:bg-[#0b1120]/40 border border-gray-100 dark:border-white/5 rounded-xl p-3 flex flex-wrap lg:flex-nowrap items-center gap-4 transition-all hover:border-indigo-500/20 group/var">
                      <div className="flex items-center gap-2 min-w-[120px]">
                        <div className="w-6 h-6 bg-indigo-500/10 rounded-lg flex items-center justify-center text-indigo-500 text-[10px] font-black">
                          {actualVIndex + 1}
                        </div>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Manual</span>
                      </div>

                      <div className="w-full lg:w-48">
                        <select
                          value={variable.type || 'body'}
                          onChange={(e) => updateFollowupVariable(mIndex, actualVIndex, 'type', e.target.value)}
                          className="w-full bg-gray-50 dark:bg-[#0f172a] border border-gray-100 dark:border-white/5 rounded-lg px-3 py-2 text-[11px] font-bold text-gray-700 dark:text-gray-300 outline-none focus:ring-1 focus:ring-indigo-500/20"
                        >
                          <option value="body">Corpo ({"{{1}}"})</option>
                          <option value="header">Cabeçalho (Mídia)</option>
                          <option value="button">Botão (Link)</option>
                        </select>
                      </div>

                      <div className="w-full lg:w-32">
                        <input
                          type="text"
                          value={variable.key}
                          onChange={(e) => updateFollowupVariable(mIndex, actualVIndex, 'key', e.target.value)}
                          placeholder="Key (ex: 1)"
                          className="w-full bg-gray-50 dark:bg-[#0f172a] border border-gray-100 dark:border-white/5 rounded-lg px-3 py-2 text-[11px] font-mono font-bold text-indigo-500 outline-none focus:ring-1 focus:ring-indigo-500/20"
                        />
                      </div>

                      <div className="flex-1 min-w-[200px]">
                        <SearchableSelect
                          options={variable.type === 'header' ? dynamicHeaderOptions : dynamicBodyOptions}
                          value={variable.value}
                          onChange={(val) => updateFollowupVariable(mIndex, actualVIndex, 'value', val)}
                          placeholder="Mapear para campo..."
                        />
                      </div>

                      {variable.value === 'custom' && (
                        <div className="w-full lg:flex-1 min-w-[200px] animate-in slide-in-from-left-2 duration-300">
                          <input
                            type="text"
                            value={variable.custom_value || ''}
                            onChange={(e) => updateFollowupVariable(mIndex, actualVIndex, 'custom_value', e.target.value)}
                            placeholder="Valor fixo ou Path (ex: payload.id)"
                            className="w-full bg-indigo-500/5 dark:bg-indigo-500/10 border border-indigo-500/20 rounded-lg px-3 py-2 text-[11px] font-medium text-indigo-600 dark:text-indigo-400 outline-none focus:ring-1 focus:ring-indigo-500/30"
                          />
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => removeFollowupVariable(mIndex, actualVIndex)}
                        className="p-2 text-gray-400 hover:text-red-500 transition-all hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg ml-auto"
                      >
                        <FiTrash2 size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FollowUpSection;
