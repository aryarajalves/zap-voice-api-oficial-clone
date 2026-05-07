import React from 'react';
import { FiLayout, FiRefreshCw } from 'react-icons/fi';
import Filters from './Filters';
import TemplateItem from './TemplateItem';

const TemplateList = ({ logic }) => {
    const { templates, fetchingTemplates, fetchTemplates, templateCategoryFilter, templateStatusFilter, templateSearch } = logic;

    const filteredTemplates = templates.filter(t =>
        (templateCategoryFilter === 'ALL' || t.category === templateCategoryFilter) &&
        (templateStatusFilter === 'ALL' || (templateStatusFilter === 'APPROVED' ? ['APPROVED', 'ACTIVE'].includes(t.status) : t.status === templateStatusFilter)) &&
        t.name.toLowerCase().includes(templateSearch.toLowerCase())
    );

    return (
        <div className="lg:col-span-4 space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 border border-gray-100 dark:border-gray-700 transition-all duration-300">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2">
                        <FiLayout size={18} /> Meus Templates
                    </h3>
                    <button
                        onClick={fetchTemplates}
                        disabled={fetchingTemplates}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all ${fetchingTemplates
                            ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                            : 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50'
                            }`}
                    >
                        <FiRefreshCw size={14} className={fetchingTemplates ? 'animate-spin' : ''} />
                        {fetchingTemplates ? 'Atualizando...' : 'Atualizar Lista'}
                    </button>
                </div>

                <Filters logic={logic} />

                <div className="space-y-3 max-h-[700px] overflow-y-auto pr-2 custom-scrollbar">
                    {filteredTemplates.length === 0 && !fetchingTemplates && (
                        <div className="text-center py-10 text-gray-400">
                            <p className="text-sm">Nenhum template encontrado.</p>
                        </div>
                    )}

                    {filteredTemplates.map((tpl) => (
                        <TemplateItem key={tpl.id} tpl={tpl} logic={logic} />
                    ))}
                </div>
            </div>
        </div>
    );
};

export default TemplateList;
