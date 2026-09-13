import React from 'react';
import { FiZap } from 'react-icons/fi';
import SearchableSelect from '../../../SearchableSelect';

export default function FollowUpTemplateVariables({
  mapping,
  mIndex,
  updateMapping,
  followupTemplateVars = [],
  dynamicBodyOptions,
  dynamicHeaderOptions,
  updateFollowupVariable
}) {
  if (!mapping.followup_template_id || followupTemplateVars.length === 0) {
    return null;
  }

  return (
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
  );
}
