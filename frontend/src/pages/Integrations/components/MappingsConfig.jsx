import React from 'react';
import { FiPlus, FiTrash2, FiZap, FiSettings, FiPlay, FiCheckCircle, FiChevronDown, FiShare2, FiShield, FiLink } from 'react-icons/fi';
import SearchableSelect from './SearchableSelect';
import { EVENT_TYPES, HEADER_VAR_OPTIONS, BODY_VAR_OPTIONS } from '../constants';

const MappingsConfig = ({ formData, setFormData, templates, chatwootLabels, setIsMappingGuideOpen }) => {
  const [expandedMappings, setExpandedMappings] = React.useState({});

  const toggleMapping = (index) => {
    const isExpanded = expandedMappings[index] !== false;
    setExpandedMappings(prev => ({
      ...prev,
      [index]: !isExpanded
    }));
  };

  const addMapping = () => {
    setFormData({
      ...formData,
      mappings: [
        ...formData.mappings,
        {
          id: Date.now(),
          event_type: 'compra_aprovada',
          template_id: '',
          delay_minutes: 0,
          is_active: true,
          private_note: "false",
          note_template: '',
          chatwoot_label: [],
          cancel_pending_on_trigger: false,
          cancel_event_types: [],
          publish_external_event: false,
          variables: [],
          manychat_active: false,
          manychat_name: '',
          manychat_phone: '',
          manychat_tag: ''
        }
      ]
    });
  };

  const removeMapping = (index) => {
    const newMappings = [...formData.mappings];
    newMappings.splice(index, 1);
    setFormData({ ...formData, mappings: newMappings });
  };

  const updateMapping = (index, field, value) => {
    const newMappings = [...formData.mappings];
    newMappings[index] = { ...newMappings[index], [field]: value };
    setFormData({ ...formData, mappings: newMappings });
  };

  const addVariable = (mIndex) => {
    const newMappings = [...formData.mappings];
    const mapping = { ...newMappings[mIndex] };
    mapping.variables = [...(mapping.variables || []), { key: '', value: '', type: 'body' }];
    newMappings[mIndex] = mapping;
    setFormData({ ...formData, mappings: newMappings });
  };

  const removeVariable = (mIndex, vIndex) => {
    const newMappings = [...formData.mappings];
    const mapping = { ...newMappings[mIndex] };
    const newVars = [...mapping.variables];
    newVars.splice(vIndex, 1);
    mapping.variables = newVars;
    newMappings[mIndex] = mapping;
    setFormData({ ...formData, mappings: newMappings });
  };

  const updateVariable = (mIndex, vIndex, field, value) => {
    const newMappings = [...formData.mappings];
    const mapping = { ...newMappings[mIndex] };
    const newVars = [...mapping.variables];
    newVars[vIndex] = { ...newVars[vIndex], [field]: value };
    mapping.variables = newVars;
    newMappings[mIndex] = mapping;
    setFormData({ ...formData, mappings: newMappings });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-gray-50/50 dark:bg-[#0f172a]/50 p-4 rounded-2xl border border-gray-100 dark:border-white/5">
        <div>
          <h4 className="text-sm font-black text-gray-900 dark:text-white flex items-center gap-2 uppercase tracking-tight">
            <FiZap className="text-yellow-500" /> Gatilhos e Automações
          </h4>
          <p className="text-[10px] text-gray-500 font-medium mt-0.5">Configure quais eventos disparam mensagens automáticas</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setIsMappingGuideOpen(true)}
            className="text-[10px] font-bold text-indigo-500 hover:text-indigo-600 dark:text-indigo-400 dark:hover:text-indigo-300 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 transition-all"
          >
            <FiShare2 size={12} /> Como funciona?
          </button>
          <button
            type="button"
            onClick={addMapping}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all active:scale-95 shadow-lg shadow-blue-600/20 uppercase tracking-widest"
          >
            <FiPlus size={14} /> Novo Gatilho
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {formData.mappings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 bg-gray-50/30 dark:bg-white/[0.02] rounded-2xl border-2 border-dashed border-gray-100 dark:border-slate-800/50">
            <div className="w-12 h-12 bg-gray-100 dark:bg-[#0b1120] rounded-full flex items-center justify-center mb-3 text-gray-300 dark:text-slate-700">
              <FiZap size={24} />
            </div>
            <p className="text-xs text-gray-500 font-bold">Nenhum gatilho configurado</p>
            <p className="text-[9px] text-gray-400 mt-1">Adicione um gatilho para começar a automatizar seus envios.</p>
          </div>
        ) : (
          formData.mappings.map((mapping, mIndex) => {
            const isExpanded = expandedMappings[mIndex] !== false;

            return (
            <div key={mapping.id || mIndex} className="group bg-white dark:bg-[#1e293b]/40 rounded-2xl border border-gray-100 dark:border-white/5 overflow-hidden hover:border-blue-500/30 transition-all duration-300">
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
                      Gatilho #{mIndex + 1}: {EVENT_TYPES.find(e => e.value === mapping.event_type)?.label || 'Evento'}
                    </span>
                    {!isExpanded && mapping.template_id && (
                      <div className="text-[9px] text-gray-500 font-bold mt-0.5">
                        Template: {templates.find(t => t.id === mapping.template_id)?.name || '...'}
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
                <div className="p-5 space-y-6 animate-in slide-in-from-top-4 duration-500">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Evento */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest flex items-center gap-1.5 px-1">
                        <FiZap size={12} /> Evento na Plataforma
                      </label>
                      <select
                        value={mapping.event_type}
                        onChange={(e) => updateMapping(mIndex, 'event_type', e.target.value)}
                        className="w-full bg-gray-50 dark:bg-[#0b1120] border border-gray-100 dark:border-white/5 rounded-xl px-4 py-3 text-xs font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 transition-all outline-none shadow-inner"
                      >
                        {EVENT_TYPES.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>

                    {/* Template */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest flex items-center gap-1.5 px-1">
                        <FiSettings size={12} /> Template ZapVoice
                      </label>
                      <SearchableSelect
                        options={templates.map(t => ({ value: t.id, label: t.name }))}
                        value={mapping.template_id}
                        onChange={(val) => updateMapping(mIndex, 'template_id', val)}
                        placeholder="Selecione um Template..."
                        allowNone
                      />
                    </div>

                    {/* Delay */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest flex items-center gap-1.5 px-1">
                        <FiSettings size={12} /> Atraso no Envio (Minutos)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={mapping.delay_minutes}
                        onChange={(e) => updateMapping(mIndex, 'delay_minutes', parseInt(e.target.value) || 0)}
                        className="w-full bg-gray-50 dark:bg-[#0b1120] border border-gray-100 dark:border-white/5 rounded-xl px-4 py-3 text-xs font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 transition-all outline-none shadow-inner"
                        placeholder="0"
                      />
                    </div>
                  </div>

                  {/* Configurações Avançadas de Gatilho */}
                  <div className="pt-6 border-t border-gray-50 dark:border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                    {/* Nota Privada e Disparar Memória */}
                    <div className="space-y-4">
                      {mapping.template_id && (
                        <div className="flex items-center justify-between p-2.5 bg-gray-50/50 dark:bg-white/[0.02] rounded-xl border border-gray-100 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-300">
                          <div>
                            <span className="text-[10px] font-bold text-gray-700 dark:text-gray-300">Nota Privada Chatwoot</span>
                            <p className="text-[8px] text-gray-500">Log na conversa</p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              className="sr-only peer"
                              checked={mapping.private_note === "true"}
                              onChange={(e) => updateMapping(mIndex, 'private_note', e.target.checked ? "true" : "false")}
                            />
                            <div className="w-8 h-4 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all dark:border-slate-600 peer-checked:bg-blue-600"></div>
                          </label>
                        </div>
                      )}

                      <div className="flex items-center justify-between p-2.5 bg-blue-500/5 dark:bg-blue-500/10 rounded-xl border border-blue-500/10">
                        <div>
                          <span className="text-[10px] font-bold text-blue-700 dark:text-blue-400">Disparar Memória</span>
                          <p className="text-[8px] text-gray-500">Sincronizar com IA</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={mapping.publish_external_event}
                            onChange={(e) => updateMapping(mIndex, 'publish_external_event', e.target.checked)}
                          />
                          <div className="w-8 h-4 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all dark:border-slate-600 peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                    </div>

                    {/* Etiquetas Chatwoot */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest flex items-center gap-1.5 px-1">
                        <FiSettings size={12} /> Etiquetas a aplicar no Chatwoot
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
                  </div>

                  {/* ManyChat Integration Section */}
                  <div className="pt-6 border-t border-gray-50 dark:border-slate-800">
                    <div className="bg-indigo-500/5 dark:bg-indigo-500/[0.03] border border-indigo-500/10 rounded-2xl p-5 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-indigo-500/10 rounded-lg flex items-center justify-center text-indigo-500">
                            <FiLink size={16} />
                          </div>
                          <div>
                            <h5 className="text-[11px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-tight">Integração ManyChat</h5>
                            <p className="text-[9px] text-gray-500">Sincronize leads e aplique tags automaticamente</p>
                          </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={mapping.manychat_active}
                            onChange={(e) => updateMapping(mIndex, 'manychat_active', e.target.checked)}
                          />
                          <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-600 peer-checked:bg-indigo-600"></div>
                        </label>
                      </div>

                      {mapping.manychat_active && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 animate-in slide-in-from-top-2 duration-300">
                          <div className="space-y-1.5">
                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-1">Nome no ManyChat</label>
                            <SearchableSelect
                              options={BODY_VAR_OPTIONS}
                              value={mapping.manychat_name}
                              onChange={(val) => updateMapping(mIndex, 'manychat_name', val)}
                              placeholder="Mapear Nome..."
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-1">Telefone no ManyChat</label>
                            <SearchableSelect
                              options={BODY_VAR_OPTIONS}
                              value={mapping.manychat_phone}
                              onChange={(val) => updateMapping(mIndex, 'manychat_phone', val)}
                              placeholder="Mapear Telefone..."
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-1">Tag a Aplicar</label>
                            <div className="relative group">
                              <FiPlus className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[10px]" />
                              <input
                                type="text"
                                value={mapping.manychat_tag || ''}
                                onChange={(e) => updateMapping(mIndex, 'manychat_tag', e.target.value)}
                                className="w-full bg-white dark:bg-[#0b1120] border border-gray-100 dark:border-white/5 rounded-lg pl-8 pr-3 py-2 text-[11px] font-bold text-gray-700 dark:text-gray-200 outline-none focus:ring-1 focus:ring-indigo-500/30 shadow-inner"
                                placeholder="Nome da Tag..."
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Cancelamento Inteligente */}
                  <div className="pt-6 border-t border-gray-50 dark:border-slate-800">
                    <div className="bg-red-500/5 border border-red-500/10 rounded-2xl p-5 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-red-500/10 rounded-lg flex items-center justify-center text-red-500">
                            <FiShield size={16} />
                          </div>
                          <div>
                            <h5 className="text-[11px] font-black text-red-600 dark:text-red-400 uppercase tracking-tight">Interrupção Inteligente</h5>
                            <p className="text-[9px] text-gray-500">Cancele mensagens de outros gatilhos quando este for disparado</p>
                          </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={mapping.cancel_pending_on_trigger}
                            onChange={(e) => updateMapping(mIndex, 'cancel_pending_on_trigger', e.target.checked)}
                          />
                          <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-600 peer-checked:bg-red-600"></div>
                        </label>
                      </div>

                      {mapping.cancel_pending_on_trigger && (
                        <div className="pt-2 animate-in slide-in-from-top-2 duration-300">
                          <label className="text-[9px] font-black text-red-400/80 uppercase tracking-[0.2em] mb-2 block">Gatilhos a cancelar:</label>
                          <SearchableSelect
                            isMulti={true}
                            options={EVENT_TYPES.map(e => ({ value: e.value, label: e.label }))}
                            value={mapping.cancel_event_types || []}
                            onChange={(val) => updateMapping(mIndex, 'cancel_event_types', val)}
                            placeholder="Escolha os eventos..."
                            colorClass="focus-within:ring-red-500/20"
                          />
                          <p className="mt-2 text-[9px] text-red-400/60 italic font-medium leading-tight">
                            * Quando o evento {EVENT_TYPES.find(e => e.value === mapping.event_type)?.label} ocorrer, qualquer mensagem pendente na fila dos eventos selecionados acima será cancelada automaticamente para este contato.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Variáveis Dinâmicas */}
                  <div className="pt-6 border-t border-gray-50 dark:border-slate-800 space-y-4">
                    <div className="flex justify-between items-center px-1">
                      <h5 className="text-[11px] font-black text-gray-900 dark:text-white uppercase tracking-[0.2em] flex items-center gap-2">
                        <FiSettings className="text-blue-500" /> Variáveis Dinâmicas ({mapping.variables?.length || 0})
                      </h5>
                      <button
                        type="button"
                        onClick={() => addVariable(mIndex)}
                        className="text-[10px] font-bold text-blue-600 hover:text-white hover:bg-blue-600 px-3 py-1.5 rounded-lg border border-blue-500/20 transition-all active:scale-95 flex items-center gap-1.5"
                      >
                        <FiPlus size={12} /> Adicionar Variável
                      </button>
                    </div>

                    {(!mapping.variables || mapping.variables.length === 0) ? (
                      <div className="bg-gray-50/50 dark:bg-white/[0.02] border border-gray-100 dark:border-slate-800 rounded-2xl p-4 text-center">
                        <p className="text-[10px] text-gray-500 italic">Nenhuma variável configurada. A mensagem será enviada exatamente como está no template.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-3">
                        {mapping.variables.map((variable, vIndex) => (
                          <div key={vIndex} className="bg-white dark:bg-[#0b1120]/40 border border-gray-100 dark:border-white/5 rounded-xl p-3 flex flex-wrap lg:flex-nowrap items-center gap-4 transition-all hover:border-blue-500/20 group/var">
                            <div className="flex items-center gap-2 min-w-[120px]">
                              <div className="w-6 h-6 bg-blue-500/10 rounded-lg flex items-center justify-center text-blue-500 text-[10px] font-black">
                                {vIndex + 1}
                              </div>
                              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Variável</span>
                            </div>

                            <div className="w-full lg:w-48">
                              <select
                                value={variable.type || 'body'}
                                onChange={(e) => updateVariable(mIndex, vIndex, 'type', e.target.value)}
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
                                onChange={(e) => updateVariable(mIndex, vIndex, 'key', e.target.value)}
                                placeholder="Key (ex: 1)"
                                className="w-full bg-gray-50 dark:bg-[#0f172a] border border-gray-100 dark:border-white/5 rounded-lg px-3 py-2 text-[11px] font-mono font-bold text-blue-500 outline-none focus:ring-1 focus:ring-blue-500/20"
                              />
                            </div>

                            <div className="flex-1 min-w-[200px]">
                              <SearchableSelect
                                options={variable.type === 'header' ? HEADER_VAR_OPTIONS : BODY_VAR_OPTIONS}
                                value={variable.value}
                                onChange={(val) => updateVariable(mIndex, vIndex, 'value', val)}
                                placeholder="Mapear para campo..."
                              />
                            </div>

                            {variable.value === 'custom' && (
                              <div className="w-full lg:flex-1 min-w-[200px] animate-in slide-in-from-left-2 duration-300">
                                <input
                                  type="text"
                                  value={variable.custom_value || ''}
                                  onChange={(e) => updateVariable(mIndex, vIndex, 'custom_value', e.target.value)}
                                  placeholder="Valor fixo ou Path (ex: payload.id)"
                                  className="w-full bg-blue-500/5 dark:bg-blue-500/10 border border-blue-500/20 rounded-lg px-3 py-2 text-[11px] font-medium text-blue-600 dark:text-blue-400 outline-none focus:ring-1 focus:ring-blue-500/30"
                                />
                              </div>
                            )}

                            <button
                              type="button"
                              onClick={() => removeVariable(mIndex, vIndex)}
                              className="p-2 text-gray-400 hover:text-red-500 transition-all hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg ml-auto"
                            >
                              <FiTrash2 size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default MappingsConfig;
