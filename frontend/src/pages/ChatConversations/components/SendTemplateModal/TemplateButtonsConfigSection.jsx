import React from 'react';
import { FiGitMerge, FiZap, FiSlash } from 'react-icons/fi';
import { getButtonInfo } from './templateHelpers';

export default function TemplateButtonsConfigSection({
  templateButtons,
  buttonActions,
  handleButtonActionChange,
  funnels
}) {
  if (!templateButtons || templateButtons.length === 0) return null;

  return (
    <div className="bg-white/3 border border-white/5 rounded-xl p-4 space-y-3">
      <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
        Botões do Template
      </div>
      <div className="flex flex-col gap-3">
        {templateButtons.map((btn, i) => {
          const info = getButtonInfo(btn);
          const btnText = btn.text;
          const actionCfg = buttonActions[btnText] || { type: 'none', funnel_id: null };

          return (
            <div key={i} className="flex flex-col gap-2">
              {/* Label do botão */}
              <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs ${info.bg} ${info.color}`}>
                <span className="shrink-0">{info.icon}</span>
                <span className="font-semibold">{btnText}</span>
                <span className="ml-auto text-[10px] opacity-60">{info.label}</span>
              </div>

              {/* Configuração de ação (apenas para QUICK_REPLY) */}
              {info.configurable && (
                <div className="ml-2 flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-gray-500">Se o contato clicar:</span>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleButtonActionChange(btnText, 'type', 'none')}
                        className={`text-[11px] px-2 py-1 rounded-lg border transition-all cursor-pointer ${
                          actionCfg.type === 'none' || !actionCfg.type
                            ? 'bg-white/10 border-white/20 text-white'
                            : 'bg-transparent border-white/10 text-gray-500 hover:text-gray-300'
                        }`}
                      >
                        Nenhuma
                      </button>
                      <button
                        type="button"
                        onClick={() => handleButtonActionChange(btnText, 'type', 'interaction')}
                        className={`flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg border transition-all cursor-pointer ${
                          actionCfg.type === 'interaction'
                            ? 'bg-green-500/20 border-green-500/40 text-green-300'
                            : 'bg-transparent border-white/10 text-gray-500 hover:text-green-400'
                        }`}
                      >
                        <FiZap size={10} /> Interação
                      </button>
                      <button
                        type="button"
                        onClick={() => handleButtonActionChange(btnText, 'type', 'block')}
                        className={`flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg border transition-all cursor-pointer ${
                          actionCfg.type === 'block'
                            ? 'bg-red-500/20 border-red-500/40 text-red-300'
                            : 'bg-transparent border-white/10 text-gray-500 hover:text-red-400'
                        }`}
                      >
                        <FiSlash size={10} /> Bloqueio
                      </button>
                    </div>
                  </div>

                  {/* Funil para ação de interação ou bloqueio */}
                  {(actionCfg.type === 'interaction' || actionCfg.type === 'block') && (
                    <div className="flex items-center gap-2">
                      <FiGitMerge size={11} className="text-purple-400 shrink-0" />
                      <select
                        value={actionCfg.funnel_id || ''}
                        onChange={(e) => handleButtonActionChange(btnText, 'funnel_id', e.target.value || null)}
                        className="flex-1 bg-[#0f172a] border border-white/10 text-white rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-purple-500"
                      >
                        <option value="">Nenhum funil (apenas ação principal)</option>
                        {funnels.map(f => (
                          <option key={f.id} value={f.id}>{f.name}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {actionCfg.type === 'block' && (
                    <p className="text-[11px] text-red-400/70">
                      O contato será adicionado aos bloqueados ao clicar neste botão.
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
