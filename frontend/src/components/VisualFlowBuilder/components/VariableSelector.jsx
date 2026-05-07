import React, { useState } from 'react';
import { FiGlobe, FiSearch, FiUser } from 'react-icons/fi';
import { GlobalVarsContext } from '../index';

const VariableSelector = ({ onSelect }) => {
    const vars = React.useContext(GlobalVarsContext);
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const CONTACT_VARS = [
        { id: 'cv-nome', name: 'nome', label: 'Nome do Contato' },
        { id: 'cv-tel', name: 'telefone', label: 'Telefone' },
        { id: 'cv-prod', name: 'produto', label: 'Nome do Produto' },
    ];

    const allVars = [
        ...CONTACT_VARS.map(cv => ({ ...cv, isContact: true })),
        ...(vars || []).map(v => ({ ...v, isGlobal: true }))
    ];

    const filteredVars = allVars.filter(v =>
        v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (v.label && v.label.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (v.value && v.value.toString().toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="relative inline-block ml-1">
            <button
                type="button"
                onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(!isOpen);
                    setSearchTerm('');
                }}
                className="p-1 text-blue-500 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-md transition-all group relative border border-transparent hover:border-blue-200 dark:hover:border-blue-800 shadow-sm"
                title="Inserir Variável"
            >
                <FiGlobe size={14} />
            </button>
            {isOpen && (
                <div className="absolute z-[110] top-full right-0 mt-1 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100 nodrag">
                    {/* Search Bar */}
                    <div className="p-2 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700">
                        <div className="relative">
                            <input
                                type="text"
                                autoFocus
                                placeholder="Procurar variável..."
                                className="w-full text-xs p-2 pl-7 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                            />
                            <FiSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={12} />
                        </div>
                    </div>

                    <div className="max-h-60 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-700">
                        {filteredVars.length > 0 ? (
                            filteredVars.map(v => (
                                <button
                                    key={v.id}
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onSelect(`{{${v.name}}}`);
                                        setIsOpen(false);
                                    }}
                                    className="w-full text-left px-3 py-2.5 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all border-b border-gray-50 dark:border-gray-700/50 last:border-0 group/item"
                                >
                                    <div className="font-bold text-blue-600 dark:text-blue-400 text-xs flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            {v.isContact ? <FiUser size={10} className="text-gray-400" /> : <FiGlobe size={10} className="text-gray-300" />}
                                            <span>{"{{"}{v.name}{"}}"}</span>
                                        </div>
                                        <span className="opacity-0 group-hover/item:opacity-100 text-[9px] bg-blue-100 dark:bg-blue-900 px-1.5 py-0.5 rounded text-blue-700 dark:text-blue-300 font-black uppercase">Inserir</span>
                                    </div>
                                    <div className="text-[10px] text-gray-400 truncate mt-0.5 font-medium">{v.label || v.value}</div>
                                </button>
                            ))
                        ) : (
                            <div className="p-4 text-center text-xs text-gray-500 italic">
                                Nenhuma variável encontrada.
                            </div>
                        )}
                    </div>

                    <div className="p-2 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 text-center">
                        <p className="text-[9px] text-gray-400 font-medium italic">Selecione uma variável para inserir</p>
                    </div>
                </div>
            )}
            {isOpen && <div className="fixed inset-0 z-[100]" onClick={(e) => { e.stopPropagation(); setIsOpen(false); }} />}
        </div>
    );
};

export default VariableSelector;
