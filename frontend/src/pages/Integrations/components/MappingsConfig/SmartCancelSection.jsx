import React from 'react';
import { FiShield } from 'react-icons/fi';
import SearchableSelect from '../SearchableSelect';
import { EVENT_TYPES } from '../../constants';

const SmartCancelSection = ({ mapping, mIndex, updateMapping }) => {
  return (
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
  );
};

export default SmartCancelSection;
