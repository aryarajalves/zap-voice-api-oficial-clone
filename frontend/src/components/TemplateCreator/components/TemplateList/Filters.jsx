import React from 'react';
import { FiSearch, FiChevronDown } from 'react-icons/fi';

const Filters = ({ logic }) => {
    const { 
        templateSearch, setTemplateSearch, 
        templateCategoryFilter, setTemplateCategoryFilter,
        templateStatusFilter, setTemplateStatusFilter,
        openFilterDropdown, setOpenFilterDropdown 
    } = logic;

    return (
        <div className="mb-4 space-y-2">
            <div className="relative">
                <FiSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                    type="text"
                    placeholder="Pesquisar por nome..."
                    value={templateSearch}
                    onChange={e => setTemplateSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 text-[12px] rounded-xl bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-500 transition-all"
                />
            </div>
            <div className="flex gap-2">
                <div className="relative flex-1">
                    <button
                        type="button"
                        onClick={() => setOpenFilterDropdown(openFilterDropdown === 'category' ? null : 'category')}
                        className="w-full flex items-center justify-between gap-1 py-1.5 px-2.5 text-[11px] font-bold rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-200 hover:border-indigo-400 dark:hover:border-indigo-500 transition-all"
                    >
                        <span className="truncate">{templateCategoryFilter === 'ALL' ? 'Categoria: Todas' : templateCategoryFilter}</span>
                        <FiChevronDown size={11} className={`shrink-0 transition-transform duration-200 ${openFilterDropdown === 'category' ? 'rotate-180' : ''}`} />
                    </button>
                    {openFilterDropdown === 'category' && (
                        <div className="absolute top-full left-0 mt-1 w-full z-50 rounded-xl overflow-hidden shadow-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800">
                            {[
                                { value: 'ALL', label: 'Todas' },
                                { value: 'MARKETING', label: 'MARKETING' },
                                { value: 'UTILITY', label: 'UTILITY' },
                                { value: 'AUTHENTICATION', label: 'AUTHENTICATION' },
                            ].map(opt => (
                                <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => { setTemplateCategoryFilter(opt.value); setOpenFilterDropdown(null); }}
                                    className={`w-full text-left px-3 py-2 text-[11px] font-bold transition-colors ${templateCategoryFilter === opt.value ? 'bg-indigo-600 text-white' : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
                <div className="relative flex-1">
                    <button
                        type="button"
                        onClick={() => setOpenFilterDropdown(openFilterDropdown === 'status' ? null : 'status')}
                        className="w-full flex items-center justify-between gap-1 py-1.5 px-2.5 text-[11px] font-bold rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-200 hover:border-indigo-400 dark:hover:border-indigo-500 transition-all"
                    >
                        <span className="truncate">
                            {templateStatusFilter === 'ALL' ? 'Status: Todos' :
                             templateStatusFilter === 'APPROVED' ? 'Aprovado' :
                             templateStatusFilter === 'PENDING' ? 'Em Análise' :
                             templateStatusFilter === 'PAUSED' ? 'Pausado' :
                             templateStatusFilter === 'REJECTED' ? 'Rejeitado' : templateStatusFilter}
                        </span>
                        <FiChevronDown size={11} className={`shrink-0 transition-transform duration-200 ${openFilterDropdown === 'status' ? 'rotate-180' : ''}`} />
                    </button>
                    {openFilterDropdown === 'status' && (
                        <div className="absolute top-full left-0 mt-1 w-full z-50 rounded-xl overflow-hidden shadow-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800">
                            {[
                                { value: 'ALL', label: 'Todos', color: '' },
                                { value: 'APPROVED', label: 'Aprovado', color: 'text-green-500' },
                                { value: 'PENDING', label: 'Em Análise', color: 'text-yellow-500' },
                                { value: 'PAUSED', label: 'Pausado', color: 'text-amber-500' },
                                { value: 'REJECTED', label: 'Rejeitado', color: 'text-red-500' },
                            ].map(opt => (
                                <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => { setTemplateStatusFilter(opt.value); setOpenFilterDropdown(null); }}
                                    className={`w-full text-left px-3 py-2 text-[11px] font-bold transition-colors ${templateStatusFilter === opt.value ? 'bg-indigo-600 text-white' : `${opt.color || 'text-gray-700 dark:text-gray-200'} hover:bg-gray-100 dark:hover:bg-gray-700`}`}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Filters;
