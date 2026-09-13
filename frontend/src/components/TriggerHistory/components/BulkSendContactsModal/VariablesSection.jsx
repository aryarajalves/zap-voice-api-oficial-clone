import React from 'react';
import MediaHeaderUploader from '../../../BulkSender/common/MediaHeaderUploader';

export default function VariablesSection({ variables, templateParams, handleParamChange }) {
  if (!variables || variables.length === 0) return null;

  return (
    <div className="space-y-4 border-t border-slate-800/60 pt-4">
      <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">
        Preencha as Variáveis
      </h4>
      {variables.map(v => {
        if (v.isMedia) {
          return (
            <MediaHeaderUploader
              key={v.key}
              format={v.format}
              templateParams={templateParams}
              handleParamChange={handleParamChange}
            />
          );
        }
        return (
          <div key={v.key} className="space-y-1">
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">
              {v.label}
            </label>
            <input
              type="text"
              className="w-full p-3 bg-black/40 border border-slate-800 rounded-2xl focus:border-blue-500/50 outline-none text-white text-xs font-bold transition-all shadow-inner placeholder:text-slate-700"
              placeholder={`Digite o valor para ${v.label}`}
              value={templateParams[v.key] || ''}
              onChange={(e) => handleParamChange(v.key, e.target.value)}
            />
          </div>
        );
      })}
    </div>
  );
}
