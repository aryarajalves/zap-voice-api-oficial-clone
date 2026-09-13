import React from 'react';
import { FiPlay, FiTrash2, FiChevronDown } from 'react-icons/fi';
import { EVENT_TYPES } from '../../../constants';

export default function MappingItemHeader({
  mapping,
  mIndex,
  isExpanded,
  toggleMapping,
  updateMapping,
  removeMapping,
  templates,
}) {
  const eventLabel = EVENT_TYPES.find(e => e.value === mapping.event_type)?.label || 'Evento';
  const selectedTemplate = templates.find(t => String(t.id) === String(mapping.template_id));

  return (
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
            Gatilho #{mIndex + 1}: {eventLabel}{mapping.product_name ? ` (${mapping.product_name})` : ''}
          </span>
          {!isExpanded && mapping.template_id && (
            <div className="text-[9px] text-gray-500 font-bold mt-0.5">
              Template: {selectedTemplate?.name || '...'}
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
  );
}
