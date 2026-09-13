import React from 'react';
import SearchableSelect from '../../../BulkSender/common/SearchableSelect';

export default function ButtonActionsSection({
  templateButtons,
  buttonActions,
  handleButtonActionChange,
  funnelOptions
}) {
  if (!templateButtons || templateButtons.length === 0) return null;

  return (
    <div className="space-y-4 border-t border-slate-800/60 pt-4">
      <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">
        Ações dos Botões
      </h4>
      {templateButtons.map(btn => {
        const action = buttonActions[btn.index] || {};
        return (
          <div key={btn.index} className="p-4 bg-slate-950/30 border border-slate-800/60 rounded-2xl space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs font-black text-white uppercase tracking-wider">
                Botão: {btn.text}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[9px] font-black text-slate-500 uppercase tracking-wider mb-1">
                  Tipo de Ação
                </label>
                <SearchableSelect
                  options={[
                    { label: 'NENHUMA AÇÃO', value: '' },
                    { label: 'FUNIL DE INTERAÇÃO', value: 'interaction' },
                    { label: 'FUNIL DE BLOQUEIO', value: 'block' }
                  ]}
                  value={action.type || ''}
                  onChange={(val) => handleButtonActionChange(btn.index, 'type', val)}
                  placeholder="NENHUMA AÇÃO"
                />
              </div>
              {action.type && (
                <div>
                  <label className="block text-[9px] font-black text-slate-500 uppercase tracking-wider mb-1">
                    Funil Iniciado
                  </label>
                  <SearchableSelect
                    options={funnelOptions}
                    value={action.funnel_id || ''}
                    onChange={(val) => handleButtonActionChange(btn.index, 'funnel_id', val)}
                    placeholder="ESCOLHA O FUNIL"
                  />
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
