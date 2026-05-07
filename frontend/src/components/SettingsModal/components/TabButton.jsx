import React from 'react';

const TabButton = ({ id, activeTab, onClick, label, icon: Icon }) => {
    const isActive = activeTab === id;
    
    return (
        <button
            type="button"
            onClick={() => onClick(id)}
            className={`flex items-center gap-2 px-6 py-2.5 text-sm font-bold rounded-lg transition-all whitespace-nowrap ${
                isActive 
                ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm' 
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
        >
            {Icon && <Icon className="w-4 h-4" />}
            {label}
        </button>
    );
};

export default TabButton;
