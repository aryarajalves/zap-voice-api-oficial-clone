import React from 'react';
import { FiSettings } from 'react-icons/fi';
import { TABS } from './constants';

export default function IntegrationFormModalHeader({
  editingIntegration,
  platform,
  activeTab,
  setActiveTab,
  mappingCount = 0,
  upsellCount = 0
}) {
  return (
    <div className="px-6 pt-6 pb-0 bg-white/50 dark:bg-[#0f172a]/50 backdrop-blur-md border-b border-gray-100 dark:border-white/5">
      <div className="flex items-center gap-4 mb-5">
        <div className="w-11 h-11 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-xl shadow-blue-600/20 shrink-0">
          <FiSettings size={22} />
        </div>
        <div>
          <h3 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">
            {editingIntegration ? 'Editar Integração' : 'Nova Integração'}
          </h3>
          <p className="text-[10px] text-gray-500 font-medium mt-0.5 uppercase tracking-widest">
            Automação para {platform || 'Plataforma'}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1">
        {TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          const badge = tab.id === 'gatilhos' ? mappingCount : tab.id === 'upsell' ? upsellCount : null;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex items-center gap-2 px-5 py-3 text-[11px] font-black uppercase tracking-widest transition-all rounded-t-xl border-b-2 cursor-pointer ${
                isActive
                  ? 'text-blue-500 border-blue-500 bg-blue-500/5'
                  : 'text-gray-400 border-transparent hover:text-gray-200 hover:bg-white/5'
              }`}
            >
              <Icon size={13} />
              {tab.label}
              {badge > 0 && (
                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-none ${
                  isActive ? 'bg-blue-500 text-white' : 'bg-white/10 text-gray-400'
                }`}>
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
