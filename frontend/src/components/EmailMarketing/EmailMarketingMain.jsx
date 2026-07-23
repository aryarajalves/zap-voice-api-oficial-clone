import React, { useState } from 'react';
import { FiZap, FiFileText, FiShield, FiClock, FiMail } from 'react-icons/fi';
import EmailConfigTab from './EmailConfigTab';
import EmailTemplatesTab from './EmailTemplatesTab';
import EmailBulkTab from './EmailBulkTab';
import EmailHistoryTab from './EmailHistoryTab';

export default function EmailMarketingMain() {
  const [activeTab, setActiveTab] = useState('bulk');

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-800/80 backdrop-blur-md p-6 rounded-2xl border border-gray-100 dark:border-white/10 shadow-md">
        <div>
          <h1 className="text-2xl font-black text-gray-800 dark:text-white flex items-center gap-3">
            <div className="p-2.5 bg-blue-600/10 text-blue-600 dark:text-blue-400 rounded-xl">
              <FiMail size={24} />
            </div>
            E-mail Marketing
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Envie e-mails corporativos em massa via Amazon SES, Resend ou SMTP utilizando as etiquetas da sua <b>Aba de Contatos</b>.
          </p>
        </div>

        {/* Abas Internas */}
        <div className="flex items-center gap-2 bg-gray-100 dark:bg-slate-900 p-1.5 rounded-xl border border-gray-200 dark:border-gray-800 self-start md:self-auto overflow-x-auto">
          <button
            onClick={() => setActiveTab('bulk')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'bulk'
                ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white'
            }`}
          >
            <FiZap /> Disparo em Massa
          </button>

          <button
            onClick={() => setActiveTab('templates')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'templates'
                ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white'
            }`}
          >
            <FiFileText /> Templates
          </button>

          <button
            onClick={() => setActiveTab('config')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'config'
                ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white'
            }`}
          >
            <FiShield /> Provedores / SMTP
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'history'
                ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white'
            }`}
          >
            <FiClock /> Histórico
          </button>
        </div>
      </div>

      {/* Conteúdo da Aba Ativa */}
      <div>
        {activeTab === 'bulk' && <EmailBulkTab onNavigateHistory={() => setActiveTab('history')} />}
        {activeTab === 'templates' && <EmailTemplatesTab />}
        {activeTab === 'config' && <EmailConfigTab />}
        {activeTab === 'history' && <EmailHistoryTab />}
      </div>
    </div>
  );
}
