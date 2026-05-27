import React, { useState } from 'react';
import { useClient } from '../contexts/ClientContext';
import DispatchesFinancial from './DispatchesFinancial';
import SalesFinancial from './SalesFinancial';

export default function Financial() {
  const { activeClient } = useClient();
  const [activeTab, setActiveTab] = useState('dispatches'); // 'dispatches' | 'sales'

  return (
    <div className="space-y-6">
      {/* Title & Tabs Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-gray-100 dark:border-gray-800">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Financeiro</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Acompanhe o faturamento de vendas e custos de mensagens.
          </p>
        </div>

        <div className="flex bg-gray-100 dark:bg-slate-800/80 p-1 rounded-xl border border-gray-200/50 dark:border-slate-700/50 w-fit">
          <button
            onClick={() => setActiveTab('dispatches')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'dispatches'
                ? 'bg-white dark:bg-slate-700 text-gray-800 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            💬 Custos de Disparos
          </button>
          <button
            onClick={() => setActiveTab('sales')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'sales'
                ? 'bg-white dark:bg-slate-700 text-gray-800 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            💰 Vendas de Webhooks
          </button>
        </div>
      </div>

      {!activeClient ? (
        <div className="text-center py-16 text-gray-400">
          Nenhum cliente ativo selecionado.
        </div>
      ) : activeTab === 'dispatches' ? (
        <DispatchesFinancial activeClient={activeClient} />
      ) : (
        <SalesFinancial activeClient={activeClient} />
      )}
    </div>
  );
}
