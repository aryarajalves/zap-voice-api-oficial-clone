import React from 'react';

const TABS = [
  { id: 'total', label: 'Total', icon: '🚀' },
  { id: 'all', label: 'Todos', icon: '📋' },
  { id: 'sent', label: 'Enviados', icon: '✅' },
  { id: 'free', label: 'Gratuita', icon: '🆓' },
  { id: 'template', label: 'Template', icon: '📝' },
  { id: 'delivered', label: 'Interações', icon: '📬' },
  { id: 'read', label: 'Viram', icon: '👀' },
  { id: 'interaction', label: 'Interagiram', icon: '👆' },
  { id: 'blocked', label: 'Bloquearam', icon: '🚫' },
  { id: 'failed', label: 'Falharam', icon: '❌' },
  { id: 'remaining', label: 'Restantes', icon: '⏳' },
];

export default function ContactsModalTabs({
  contactsModal,
  contactsFilter,
  setContactsFilter,
  setPage
}) {
  if (!contactsModal.showTabs || !contactsModal.isTemplate) {
    return null;
  }

  return (
    <div className="px-4 pt-2 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 flex gap-2 overflow-x-auto no-scrollbar">
      {TABS.map(tab => {
        const count = contactsModal.counts?.[tab.id] || 0;
        const isActive = contactsFilter === tab.id;

        return (
          <button
            key={tab.id}
            onClick={() => {
              setContactsFilter(tab.id);
              setPage(1);
            }}
            className={`pb-2 px-3 text-sm font-medium border-b-2 transition whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
              isActive
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
            {count > 0 && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                isActive
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-500'
              }`}>
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
