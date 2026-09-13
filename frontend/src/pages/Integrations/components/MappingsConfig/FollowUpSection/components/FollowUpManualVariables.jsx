import React from 'react';
import { FiPlus, FiTrash2 } from 'react-icons/fi';
import SearchableSelect from '../../../SearchableSelect';

export default function FollowUpManualVariables({
  mapping,
  mIndex,
  needsConfig,
  followupTemplateVars = [],
  dynamicBodyOptions,
  dynamicHeaderOptions,
  addFollowupVariable,
  updateFollowupVariable,
  removeFollowupVariable
}) {
  if (!mapping.followup_template_id) {
    return null;
  }

  const manualVars = (mapping.followup_variables_mapping || []).filter(v => {
    return !followupTemplateVars.some(
      tv => tv.key === v.key && (tv.type === v.type || (tv.type === 'body' && !v.type))
    );
  });

  return (
    <>
      {/* Botão de adicionar variável manual/mídia caso a lista manual esteja vazia */}
      {needsConfig && manualVars.length === 0 && (
        <div className="flex justify-start px-1 pt-2">
          <button
            type="button"
            onClick={() => addFollowupVariable(mIndex)}
            className="text-[10px] font-bold text-indigo-500 hover:text-white hover:bg-indigo-600 px-4 py-2 rounded-xl border border-indigo-500/20 transition-all active:scale-95 flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <FiPlus size={12} /> Configurar Mídias / Variáveis Manuais (Follow-up)
          </button>
        </div>
      )}

      {/* Variáveis Adicionais / Cabeçalho do Follow-up (Manuais) */}
      {manualVars.length > 0 && (
        <div className="pt-6 border-t border-gray-50 dark:border-slate-800 space-y-4">
          <div className="flex justify-between items-center px-1">
            <h5 className="text-[11px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.2em] flex items-center gap-2">
              <FiPlus className="text-indigo-400" /> Variáveis Adicionais / Cabeçalho (Follow-up)
            </h5>
            <button
              type="button"
              onClick={() => addFollowupVariable(mIndex)}
              className="text-[10px] font-bold text-indigo-500 hover:text-white hover:bg-indigo-600 px-3 py-1.5 rounded-lg border border-indigo-500/20 transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
            >
              <FiPlus size={12} /> Outra Variável
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {manualVars.map((variable) => {
              const actualVIndex = (mapping.followup_variables_mapping || []).findIndex(v => v === variable);
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
                    className="p-2 text-gray-400 hover:text-red-500 transition-all hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg ml-auto cursor-pointer"
                  >
                    <FiTrash2 size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
