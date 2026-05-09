import React from 'react';
import { FiLink } from 'react-icons/fi';
import SearchableSelect from '../SearchableSelect';
import { BODY_VAR_OPTIONS } from '../../constants';

const ManyChatSection = ({ mapping, mIndex, updateMapping }) => {
  return (
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
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[10px]">+</div>
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
  );
};

export default ManyChatSection;
