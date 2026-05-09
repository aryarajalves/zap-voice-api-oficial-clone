import React from 'react';
import { FiPlus, FiZap, FiShare2 } from 'react-icons/fi';
import MappingItem from './MappingItem';
import { EVENT_TYPES } from '../../constants';

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
          variables_mapping: [],
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
    mapping.variables_mapping = [...(mapping.variables_mapping || []), { key: '', value: '', type: 'body' }];
    newMappings[mIndex] = mapping;
    setFormData({ ...formData, mappings: newMappings });
  };

  const removeVariable = (mIndex, vIndex) => {
    const newMappings = [...formData.mappings];
    const mapping = { ...newMappings[mIndex] };
    const newVars = [...mapping.variables_mapping];
    newVars.splice(vIndex, 1);
    mapping.variables_mapping = newVars;
    newMappings[mIndex] = mapping;
    setFormData({ ...formData, mappings: newMappings });
  };

  const updateVariable = (mIndex, vIndex, field, value) => {
    const newMappings = [...formData.mappings];
    const mapping = { ...newMappings[mIndex] };
    const newVars = [...mapping.variables_mapping];
    newVars[vIndex] = { ...newVars[vIndex], [field]: value };
    mapping.variables_mapping = newVars;
    newMappings[mIndex] = mapping;
    setFormData({ ...formData, mappings: newMappings });
  };

  const getTemplateVars = (templateId) => {
    const tpl = templates.find(t => t.id === templateId || String(t.id) === String(templateId));
    if (!tpl) return [];
    
    const vars = [];
    
    // Body Vars
    if (tpl.body_text) {
      const matches = tpl.body_text.match(/\{\{(\d+)\}\}/g);
      if (matches) {
        const unique = [...new Set(matches.map(m => m.replace(/\{\{|\}\}/g, '')))];
        unique.forEach(v => vars.push({ key: v, type: 'body', label: `Corpo {{${v}}}` }));
      }
    }
    
    // Header Vars
    if (tpl.header_text) {
      const matches = tpl.header_text.match(/\{\{(\d+)\}\}/g);
      if (matches) {
        const unique = [...new Set(matches.map(m => m.replace(/\{\{|\}\}/g, '')))];
        unique.forEach(v => vars.push({ key: v, type: 'header_text', label: `Cabeçalho {{${v}}}` }));
      }
    }

    return vars.sort((a, b) => a.key - b.key);
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
          formData.mappings.map((mapping, mIndex) => (
            <MappingItem 
              key={mapping.id || mIndex}
              mapping={mapping}
              mIndex={mIndex}
              isExpanded={expandedMappings[mIndex] !== false}
              toggleMapping={toggleMapping}
              updateMapping={updateMapping}
              removeMapping={removeMapping}
              templates={templates}
              chatwootLabels={chatwootLabels}
              updateVariable={updateVariable}
              addVariable={addVariable}
              removeVariable={removeVariable}
              templateVars={getTemplateVars(mapping.template_id)}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default MappingsConfig;
