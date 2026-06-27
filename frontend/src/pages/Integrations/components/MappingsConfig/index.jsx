import React from 'react';
import { FiPlus, FiZap, FiShare2, FiChevronLeft, FiChevronRight, FiFilter } from 'react-icons/fi';
import MappingItem from './MappingItem';
import { EVENT_TYPES } from '../../constants';

const PAGE_SIZE_OPTIONS = [5, 10, 20];

const MappingsConfig = ({ formData, setFormData, templates, funnels, chatwootLabels, setIsMappingGuideOpen, discoveredProducts, existingInternalTags }) => {
  const [expandedMappings, setExpandedMappings] = React.useState({});
  const [pageSize, setPageSize]   = React.useState(5);
  const [page, setPage]           = React.useState(0);
  const [filterEvent, setFilterEvent] = React.useState('');

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
          funnel_id: '',
          delay_minutes: 0,
          is_active: true,
          private_note: "true",
          note_template: '',
          chatwoot_label: [],
          cancel_pending_on_trigger: false,
          cancel_event_types: [],
          publish_external_event: true,
          variables_mapping: [],
          manychat_active: false,
          manychat_name: '',
          manychat_phone: '',
          manychat_tag: '',
          followup_active: false,
          followup_template_id: '',
          followup_delay_value: 0,
          followup_delay_unit: 'minutes',
          followup_variables_mapping: []
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
    
    if (field === 'followup_template_id') {
      const selectedTpl = templates.find(t => t.id === value || String(t.id) === String(value));
      newMappings[index].followup_template_name = selectedTpl ? selectedTpl.name : '';
    }
    
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
    const newVars = [...(mapping.variables_mapping || [])];
    newVars.splice(vIndex, 1);
    mapping.variables_mapping = newVars;
    newMappings[mIndex] = mapping;
    setFormData({ ...formData, mappings: newMappings });
  };

  const updateVariable = (mIndex, vIndex, field, value) => {
    const newMappings = [...formData.mappings];
    const mapping = { ...newMappings[mIndex] };
    const newVars = [...(mapping.variables_mapping || [])];
    newVars[vIndex] = { ...newVars[vIndex], [field]: value };
    mapping.variables_mapping = newVars;
    newMappings[mIndex] = mapping;
    setFormData({ ...formData, mappings: newMappings });
  };

  const addFollowupVariable = (mIndex) => {
    const newMappings = [...formData.mappings];
    const mapping = { ...newMappings[mIndex] };
    mapping.followup_variables_mapping = [...(mapping.followup_variables_mapping || []), { key: '', value: '', type: 'body' }];
    newMappings[mIndex] = mapping;
    setFormData({ ...formData, mappings: newMappings });
  };

  const removeFollowupVariable = (mIndex, vIndex) => {
    const newMappings = [...formData.mappings];
    const mapping = { ...newMappings[mIndex] };
    const newVars = [...(mapping.followup_variables_mapping || [])];
    newVars.splice(vIndex, 1);
    mapping.followup_variables_mapping = newVars;
    newMappings[mIndex] = mapping;
    setFormData({ ...formData, mappings: newMappings });
  };

  const updateFollowupVariable = (mIndex, vIndex, field, value) => {
    const newMappings = [...formData.mappings];
    const mapping = { ...newMappings[mIndex] };
    const newVars = [...(mapping.followup_variables_mapping || [])];
    newVars[vIndex] = { ...newVars[vIndex], [field]: value };
    mapping.followup_variables_mapping = newVars;
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

  // Filtro + índices reais para edição
  const allMappings = formData.mappings || [];
  const filteredIndices = allMappings
    .map((m, i) => ({ m, i }))
    .filter(({ m }) => !filterEvent || m.event_type === filterEvent);

  const totalPages  = Math.max(1, Math.ceil(filteredIndices.length / pageSize));
  const safePage    = Math.min(page, totalPages - 1);
  const pageItems   = filteredIndices.slice(safePage * pageSize, safePage * pageSize + pageSize);

  const handlePageSizeChange = (newSize) => {
    setPageSize(newSize);
    setPage(0);
  };
  const handleFilterChange = (val) => {
    setFilterEvent(val);
    setPage(0);
  };

  // Tipos de evento presentes nos gatilhos configurados (para o filtro)
  const presentEventTypes = React.useMemo(() => {
    const set = new Set(allMappings.map(m => m.event_type).filter(Boolean));
    return EVENT_TYPES.filter(et => set.has(et.value));
  }, [allMappings]);

  return (
    <div className="space-y-4">
      {/* Cabeçalho */}
      <div className="flex flex-wrap justify-between items-center gap-3 bg-gray-50/50 dark:bg-[#0f172a]/50 p-4 rounded-2xl border border-gray-100 dark:border-white/5">
        <div>
          <h4 className="text-sm font-black text-gray-900 dark:text-white flex items-center gap-2 uppercase tracking-tight">
            <FiZap className="text-yellow-500" /> Gatilhos e Automações
          </h4>
          <p className="text-[10px] text-gray-500 font-medium mt-0.5">Configure quais eventos disparam mensagens automáticas</p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
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

      {/* Barra de filtro + paginação */}
      {allMappings.length > 0 && (
        <div className="flex flex-wrap items-center gap-3">
          {/* Filtro por tipo de evento */}
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <FiFilter size={12} className="text-gray-400 shrink-0" />
            <select
              value={filterEvent}
              onChange={e => handleFilterChange(e.target.value)}
              className="flex-1 bg-white dark:bg-[#0b1120] border border-gray-100 dark:border-white/5 rounded-xl px-3 py-2 text-[10px] font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 outline-none shadow-inner"
            >
              <option value="">Todos os eventos ({allMappings.length})</option>
              {presentEventTypes.map(et => {
                const count = allMappings.filter(m => m.event_type === et.value).length;
                return (
                  <option key={et.value} value={et.value}>{et.label} ({count})</option>
                );
              })}
            </select>
          </div>

          {/* Por página */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest whitespace-nowrap">Por página</span>
            <div className="flex rounded-xl overflow-hidden border border-white/5 bg-[#0b1120]">
              {PAGE_SIZE_OPTIONS.map(n => (
                <button
                  key={n}
                  type="button"
                  onClick={() => handlePageSizeChange(n)}
                  className={`px-3 py-1.5 text-[10px] font-black transition-all ${
                    pageSize === n
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Lista */}
      <div className="space-y-4">
        {allMappings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 bg-gray-50/30 dark:bg-white/[0.02] rounded-2xl border-2 border-dashed border-gray-100 dark:border-slate-800/50">
            <div className="w-12 h-12 bg-gray-100 dark:bg-[#0b1120] rounded-full flex items-center justify-center mb-3 text-gray-300 dark:text-slate-700">
              <FiZap size={24} />
            </div>
            <p className="text-xs text-gray-500 font-bold">Nenhum gatilho configurado</p>
            <p className="text-[9px] text-gray-400 mt-1">Adicione um gatilho para começar a automatizar seus envios.</p>
          </div>
        ) : pageItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 bg-white/[0.02] rounded-2xl border border-dashed border-white/5">
            <p className="text-xs text-gray-500 font-bold">Nenhum gatilho para este filtro</p>
          </div>
        ) : (
          pageItems.map(({ m: mapping, i: mIndex }) => (
            <MappingItem
              key={mapping.id || mIndex}
              mapping={mapping}
              mIndex={mIndex}
              isExpanded={expandedMappings[mIndex] !== false}
              toggleMapping={toggleMapping}
              updateMapping={updateMapping}
              removeMapping={removeMapping}
              templates={templates}
              funnels={funnels}
              chatwootLabels={chatwootLabels}
              updateVariable={updateVariable}
              addVariable={addVariable}
              removeVariable={removeVariable}
              templateVars={getTemplateVars(mapping.template_id)}
              customFieldsMapping={formData.custom_fields_mapping}
              followupTemplateVars={getTemplateVars(mapping.followup_template_id)}
              addFollowupVariable={addFollowupVariable}
              removeFollowupVariable={removeFollowupVariable}
              updateFollowupVariable={updateFollowupVariable}
              discoveredProducts={discoveredProducts || []}
              existingInternalTags={existingInternalTags}
            />
          ))
        )}
      </div>

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <span className="text-[10px] text-gray-400 font-bold">
            {safePage * pageSize + 1}–{Math.min(safePage * pageSize + pageSize, filteredIndices.length)} de {filteredIndices.length} gatilhos
            {filterEvent && ' (filtrado)'}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={safePage === 0}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed text-gray-300 transition-all"
            >
              <FiChevronLeft size={14} />
            </button>
            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setPage(i)}
                className={`w-8 h-8 text-[10px] font-black rounded-lg transition-all ${
                  i === safePage
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                    : 'bg-white/5 hover:bg-white/10 text-gray-400'
                }`}
              >
                {i + 1}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={safePage === totalPages - 1}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed text-gray-300 transition-all"
            >
              <FiChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MappingsConfig;
