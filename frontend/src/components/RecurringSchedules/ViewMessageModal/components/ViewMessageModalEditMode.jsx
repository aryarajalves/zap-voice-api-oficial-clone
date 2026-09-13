import React from 'react';
import { FiLink } from 'react-icons/fi';
import TemplatePreview from '../../../BulkSender/common/TemplatePreview';
import TemplateSelectorDropdown from '../../TemplateSelectorDropdown';
import ButtonActionsSection from '../../../BulkSender/steps/ButtonActionsSection';
import {
  extractTemplateButtons,
  extractTemplateVariables,
  getHeaderFormat
} from '../utils/templateParamUtils';

export default function ViewMessageModalEditMode({
  templates,
  selectedTemplateName,
  setSelectedTemplateName,
  selectedTemplateObj,
  templateParams,
  setTemplateParams,
  handleParamChange,
  buttonActions,
  setButtonActions,
  funnels
}) {
  const headerFormat = getHeaderFormat(selectedTemplateObj);
  const templateVars = extractTemplateVariables(selectedTemplateObj);
  const templateButtons = extractTemplateButtons(selectedTemplateObj);

  return (
    <div className="space-y-6">
      {/* Dropdown de Seleção de Template */}
      <TemplateSelectorDropdown 
        templates={templates}
        selectedTemplateName={selectedTemplateName}
        onSelect={(name) => {
          setSelectedTemplateName(name);
          setTemplateParams({});
        }}
      />

      {/* Inputs de Mídia e Variáveis do Template */}
      {selectedTemplateObj && (
        <div className="space-y-6 pt-4 border-t border-white/5">
          {/* Cabeçalho de Mídia se aplicável */}
          {['IMAGE', 'VIDEO', 'DOCUMENT'].includes(headerFormat) && (
            <div className="p-5 bg-slate-800/40 border border-white/5 rounded-3xl space-y-3">
              <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                <FiLink className="text-purple-400" />
                URL da Mídia do Cabeçalho ({headerFormat})
              </label>
              <input 
                type="text"
                value={templateParams['HEADER_0'] || ''}
                onChange={(e) => handleParamChange('HEADER_0', e.target.value)}
                placeholder={`Cole o link público da ${headerFormat.toLowerCase()}...`}
                className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-3 text-white font-medium text-xs outline-none focus:border-purple-500/50 shadow-inner"
              />
              <p className="text-[10px] text-slate-500 italic">
                Preencha com uma URL de imagem/vídeo direta para envio (ex: https://site.com/imagem.jpg).
              </p>
            </div>
          )}

          {/* Variáveis do Corpo */}
          {templateVars.length > 0 && (
            <div className="p-5 bg-slate-800/40 border border-white/5 rounded-3xl space-y-4">
              <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest">
                Variáveis Dinâmicas do Corpo
              </label>
              <div className="grid grid-cols-1 gap-4">
                {templateVars.map(v => {
                  const currentValue = templateParams[v.key] || '';
                  const isDynamic = ['{{nome}}', '{{name}}', '{{telefone}}', '{{phone}}', '{{primeiro_nome}}', '{{first_name}}'].includes(currentValue);
                  const selectValue = isDynamic 
                    ? (['{{nome}}', '{{name}}'].includes(currentValue) 
                        ? '{{nome}}' 
                        : (['{{primeiro_nome}}', '{{first_name}}'].includes(currentValue) ? '{{primeiro_nome}}' : '{{telefone}}'))
                    : (currentValue ? 'custom' : '');

                  return (
                    <div key={v.key} className="space-y-2 bg-black/20 p-4 rounded-2xl border border-white/5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-purple-400 uppercase tracking-wider pl-1">{v.label}</span>
                        <span className="text-[7px] font-bold text-slate-600 uppercase tracking-widest">Parâmetro de Corpo</span>
                      </div>
                      <div className="flex flex-col md:flex-row gap-3">
                        <div className="flex-1">
                          <select
                            value={selectValue}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === 'custom') {
                                handleParamChange(v.key, '');
                              } else {
                                handleParamChange(v.key, val);
                              }
                            }}
                            className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-xs font-bold text-white outline-none cursor-pointer focus:border-purple-500/50 shadow-inner"
                          >
                            <option value="">-- Mapear dinamicamente... --</option>
                            <option value="{{nome}}">Nome do Contato ({"{{nome}}"})</option>
                            <option value="{{primeiro_nome}}">Primeiro Nome do Contato ({"{{primeiro_nome}}"})</option>
                            <option value="{{telefone}}">Telefone do Contato ({"{{telefone}}"})</option>
                            <option value="custom">Texto Fixo / Personalizado</option>
                          </select>
                        </div>
                        {selectValue === 'custom' && (
                          <div className="flex-1 animate-in slide-in-from-right duration-200">
                            <input 
                              type="text"
                              value={isDynamic ? '' : currentValue}
                              onChange={(e) => handleParamChange(v.key, e.target.value)}
                              placeholder="Digite o texto personalizado fixo..."
                              className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-xs text-white placeholder-slate-600 outline-none focus:border-purple-500/50 shadow-inner"
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

          {/* Configuração de Ações de Botões se o template possuir botões */}
          {templateButtons.length > 0 && (
            <div className="pt-4 border-t border-white/5">
              <ButtonActionsSection 
                templateButtons={templateButtons} 
                buttonActions={buttonActions} 
                setButtonActions={setButtonActions} 
                funnels={funnels} 
              />
            </div>
          )}

          {/* Pré-visualização ao vivo */}
          <div className="space-y-3">
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">
              Visualização em Tempo Real
            </label>
            <TemplatePreview template={selectedTemplateObj} params={templateParams} />
          </div>
        </div>
      )}
    </div>
  );
}
