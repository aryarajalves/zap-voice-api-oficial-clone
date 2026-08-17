import React from 'react';
import { formatDddOption, formatDdiOption } from '../../../utils/dddInfo';

export default function ContactsModalFilters({
  title,
  isTemplate,
  contactsTypeFilter,
  setContactsTypeFilter,
  contactsFilter,
  failureReasons = [],
  contactsErrorFilter,
  setContactsErrorFilter,
  onClose,
  contactsSearchPhone,
  setContactsSearchPhone,
  contactsFilterDdi,
  setContactsFilterDdi,
  contactsFilterDdd,
  setContactsFilterDdd,
  contactsDdiOptions = [],
  contactsDddOptions = [],
  setPage
}) {
  return (
    <>
      {/* Header */}
      <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50">
        <div className="flex items-center gap-4 flex-wrap">
          <h3 className="font-bold text-gray-800 dark:text-white text-lg">{title}</h3>
          {isTemplate && (
            <select
              value={contactsTypeFilter}
              onChange={(e) => { setContactsTypeFilter(e.target.value); setPage(1); }}
              className="text-[10px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1.5 outline-none font-black uppercase tracking-widest text-gray-700 dark:text-gray-300 shadow-sm focus:ring-2 focus:ring-blue-500/20 transition-all cursor-pointer"
            >
              <option value="all">✨ Todos os Tipos</option>
              <option value="template">💳 Pagos (Template)</option>
              <option value="free">🆓 Gratuitos (Livre)</option>
            </select>
          )}
          {((contactsFilter === 'failed' || contactsFilter === 'blocked') && failureReasons.length > 0) && (
            <select
              id="contacts-error-filter"
              value={contactsErrorFilter}
              onChange={(e) => { setContactsErrorFilter(e.target.value); setPage(1); }}
              className="text-[10px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1.5 outline-none font-black uppercase tracking-widest text-gray-700 dark:text-gray-300 shadow-sm focus:ring-2 focus:ring-blue-500/20 transition-all max-w-[200px] truncate cursor-pointer"
            >
              <option value="all">
                {contactsFilter === 'blocked' ? '🚫 Todos os Bloqueios' : '⚠️ Todos os Erros'}
              </option>
              {failureReasons.map((reason, idx) => (
                <option key={idx} value={reason}>
                  {reason === 'BLOCKED_VIA_BUTTON' ? 'BLOQUEOU O BOT' : reason}
                </option>
              ))}
            </select>
          )}
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition cursor-pointer"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      {/* Barra de Filtros Adicionais (Telefone, DDI, DDD) */}
      <div className="px-4 py-3 bg-gray-50/50 dark:bg-gray-900/20 border-b border-gray-100 dark:border-gray-700 flex flex-wrap gap-2.5 items-center">
        <div className="flex-1 min-w-[200px] relative">
          <input 
            type="text" 
            value={contactsSearchPhone || ''} 
            onChange={e => { setContactsSearchPhone(e.target.value); setPage(1); }} 
            placeholder="Buscar por número..."
            className="w-full pl-3 pr-8 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg text-xs text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/20 transition-all placeholder:text-gray-400"
          />
          {contactsSearchPhone && (
            <button 
              onClick={() => { setContactsSearchPhone(''); setPage(1); }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xs cursor-pointer"
            >
              ×
            </button>
          )}
        </div>
        
        <div className="w-[140px] relative">
          <select
            value={contactsFilterDdi || ''}
            onChange={e => { setContactsFilterDdi(e.target.value); setPage(1); }}
            className="w-full px-2 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg text-xs text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/20 transition-all cursor-pointer disabled:opacity-50"
            disabled={(contactsDdiOptions || []).length === 0}
          >
            <option value="">Todos DDIs</option>
            {(contactsDdiOptions || []).map(ddi => (
              <option key={ddi} value={ddi}>{formatDdiOption(ddi)}</option>
            ))}
          </select>
        </div>

        <div className="w-[140px] relative">
          <select
            value={contactsFilterDdd || ''}
            onChange={e => { setContactsFilterDdd(e.target.value); setPage(1); }}
            className="w-full px-2 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg text-xs text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/20 transition-all cursor-pointer disabled:opacity-50"
            disabled={(contactsDddOptions || []).length === 0}
          >
            <option value="">Todos DDDs</option>
            {(contactsDddOptions || []).map(ddd => (
              <option key={ddd} value={ddd}>{formatDddOption(ddd)}</option>
            ))}
          </select>
        </div>
      </div>
    </>
  );
}
