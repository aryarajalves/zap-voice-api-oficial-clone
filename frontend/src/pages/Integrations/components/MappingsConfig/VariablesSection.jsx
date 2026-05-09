import React from 'react';
import { FiZap, FiPlus, FiTrash2 } from 'react-icons/fi';
import SearchableSelect from '../SearchableSelect';
import { HEADER_VAR_OPTIONS, BODY_VAR_OPTIONS } from '../../constants';

const VariablesSection = ({ 
  mapping, 
  mIndex, 
  updateMapping, 
  updateVariable, 
  addVariable, 
  removeVariable,
  templateVars 
}) => {
  return (
    <div className="space-y-6">
      {/* Variáveis do Template Selecionado (Dinâmicas) */}
      {mapping.template_id && templateVars.length > 0 && (
        <div className="bg-blue-500/[0.02] dark:bg-blue-500/[0.03] border border-blue-500/10 rounded-2xl p-5 space-y-4 animate-in slide-in-from-top-2 duration-300">
          <div className="flex justify-between items-center px-1">
            <h5 className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-[0.2em] flex items-center gap-2">
              <FiZap size={14} className="fill-current" /> Variáveis do Template Detectadas
            </h5>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {templateVars.map((tplVar) => {
              const existingVarIdx = (mapping.variables_mapping || []).findIndex(v => v.key === tplVar.key && (v.type === tplVar.type || (tplVar.type === 'body' && !v.type)));
              const variable = existingVarIdx !== -1 ? mapping.variables_mapping[existingVarIdx] : { key: tplVar.key, value: '', type: tplVar.type };

              return (
                <div key={`${tplVar.type}-${tplVar.key}`} className="bg-white dark:bg-[#0b1120]/40 border border-gray-100 dark:border-white/5 rounded-xl p-3 flex flex-col gap-2 transition-all hover:border-blue-500/30 shadow-sm">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 bg-blue-500/10 rounded-lg flex items-center justify-center text-blue-500 text-[9px] font-black">
                        {tplVar.key}
                      </div>
                      <span className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">{tplVar.label}</span>
                    </div>
                    <div className="text-[7px] font-black text-blue-500/30 uppercase tracking-tighter">Variável Meta</div>
                  </div>

                  <div className="flex gap-2">
                    <div className="flex-1">
                      <SearchableSelect
                        options={tplVar.type.includes('header') ? HEADER_VAR_OPTIONS : BODY_VAR_OPTIONS}
                        value={variable.value}
                        onChange={(val) => {
                          if (existingVarIdx !== -1) {
                            updateVariable(mIndex, existingVarIdx, 'value', val);
                          } else {
                            const newVars = [...(mapping.variables_mapping || []), { ...variable, value: val }];
                            updateMapping(mIndex, 'variables_mapping', newVars);
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
                              updateVariable(mIndex, existingVarIdx, 'custom_value', e.target.value);
                            } else {
                              const newVars = [...(mapping.variables_mapping || []), { ...variable, custom_value: e.target.value }];
                              updateMapping(mIndex, 'variables_mapping', newVars);
                            }
                          }}
                          placeholder="Path (ex: customer.name)"
                          className="w-full h-[38px] bg-gray-50 dark:bg-[#0f172a] border border-blue-500/20 rounded-lg px-3 text-[10px] font-bold text-blue-600 dark:text-blue-400 outline-none focus:ring-1 focus:ring-blue-500/30 shadow-inner"
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

      {/* Variáveis Adicionais (Manuais) */}
      <div className="pt-6 border-t border-gray-50 dark:border-slate-800 space-y-4">
        <div className="flex justify-between items-center px-1">
          <h5 className="text-[11px] font-black text-gray-900 dark:text-white uppercase tracking-[0.2em] flex items-center gap-2">
            <FiPlus className="text-gray-400" /> Variáveis Adicionais / Cabeçalho
          </h5>
          <button
            type="button"
            onClick={() => addVariable(mIndex)}
            className="text-[10px] font-bold text-gray-500 hover:text-white hover:bg-gray-600 px-3 py-1.5 rounded-lg border border-gray-500/20 transition-all active:scale-95 flex items-center gap-1.5"
          >
            <FiPlus size={12} /> Outra Variável
          </button>
        </div>

        {(mapping.variables_mapping || []).filter(v => {
          return !templateVars.some(tv => tv.key === v.key && (tv.type === v.type || (tv.type === 'body' && !v.type)));
        }).length === 0 ? (
          <div className="bg-gray-50/50 dark:bg-white/[0.02] border border-gray-100 dark:border-slate-800 rounded-2xl p-4 text-center">
            <p className="text-[10px] text-gray-500 italic">Nenhuma variável adicional configurada.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {mapping.variables_mapping.filter(v => {
              return !templateVars.some(tv => tv.key === v.key && (tv.type === v.type || (tv.type === 'body' && !v.type)));
            }).map((variable) => {
              const actualVIndex = mapping.variables_mapping.findIndex(v => v === variable);
              return (
                <div key={actualVIndex} className="bg-white dark:bg-[#0b1120]/40 border border-gray-100 dark:border-white/5 rounded-xl p-3 flex flex-wrap lg:flex-nowrap items-center gap-4 transition-all hover:border-blue-500/20 group/var">
                  <div className="flex items-center gap-2 min-w-[120px]">
                    <div className="w-6 h-6 bg-gray-500/10 rounded-lg flex items-center justify-center text-gray-500 text-[10px] font-black">
                      {actualVIndex + 1}
                    </div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Manual</span>
                  </div>

                  <div className="w-full lg:w-48">
                    <select
                      value={variable.type || 'body'}
                      onChange={(e) => updateVariable(mIndex, actualVIndex, 'type', e.target.value)}
                      className="w-full bg-gray-50 dark:bg-[#0f172a] border border-gray-100 dark:border-white/5 rounded-lg px-3 py-2 text-[11px] font-bold text-gray-700 dark:text-gray-300 outline-none focus:ring-1 focus:ring-blue-500/20"
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
                      onChange={(e) => updateVariable(mIndex, actualVIndex, 'key', e.target.value)}
                      placeholder="Key (ex: 1)"
                      className="w-full bg-gray-50 dark:bg-[#0f172a] border border-gray-100 dark:border-white/5 rounded-lg px-3 py-2 text-[11px] font-mono font-bold text-blue-500 outline-none focus:ring-1 focus:ring-blue-500/20"
                    />
                  </div>

                  <div className="flex-1 min-w-[200px]">
                    <SearchableSelect
                      options={variable.type === 'header' ? HEADER_VAR_OPTIONS : BODY_VAR_OPTIONS}
                      value={variable.value}
                      onChange={(val) => updateVariable(mIndex, actualVIndex, 'value', val)}
                      placeholder="Mapear para campo..."
                    />
                  </div>

                  {variable.value === 'custom' && (
                    <div className="w-full lg:flex-1 min-w-[200px] animate-in slide-in-from-left-2 duration-300">
                      <input
                        type="text"
                        value={variable.custom_value || ''}
                        onChange={(e) => updateVariable(mIndex, actualVIndex, 'custom_value', e.target.value)}
                        placeholder="Valor fixo ou Path (ex: payload.id)"
                        className="w-full bg-blue-500/5 dark:bg-blue-500/10 border border-blue-500/20 rounded-lg px-3 py-2 text-[11px] font-medium text-blue-600 dark:text-blue-400 outline-none focus:ring-1 focus:ring-blue-500/30"
                      />
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => removeVariable(mIndex, actualVIndex)}
                    className="p-2 text-gray-400 hover:text-red-500 transition-all hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg ml-auto"
                  >
                    <FiTrash2 size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default VariablesSection;
