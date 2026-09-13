import React from 'react';

export default function MappingItemTabs({ tabs, activeTab, setActiveTab }) {
  return (
    <div className="flex border-b border-gray-100 dark:border-white/5 bg-gray-50/30 dark:bg-white/[0.02] px-4 gap-1 overflow-x-auto">
      {tabs.map(tab => {
        const Icon = tab.icon;
        const active = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all -mb-px whitespace-nowrap cursor-pointer ${
              active
                ? 'border-blue-500 text-blue-500 dark:text-blue-400 bg-blue-500/5'
                : 'border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
            }`}
          >
            <Icon size={12} />
            <span>{tab.label}</span>
            {tab.badge > 0 && (
              <span className={`text-[9px] font-black px-1.5 py-0.2 rounded-full min-w-[16px] text-center leading-tight ${
                active ? 'bg-blue-500 text-white' : 'bg-blue-500/20 text-blue-400'
              }`}>
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
