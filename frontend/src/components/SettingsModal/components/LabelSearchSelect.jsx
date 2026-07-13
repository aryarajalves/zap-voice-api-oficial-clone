import React from 'react';
import { FiChevronDown, FiSearch } from 'react-icons/fi';

const LabelSearchSelect = ({ label, name, value, availableLabels, onChange }) => {
    const [isOpen, setIsOpen] = React.useState(false);
    const [search, setSearch] = React.useState('');
    const containerRef = React.useRef(null);

    React.useEffect(() => {
        const handleClickOutside = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filtered = availableLabels.filter(lbl =>
        lbl.name.toLowerCase().includes(search.toLowerCase())
    );

    const handleSelect = (valName) => {
        onChange({ target: { name, value: valName } });
        setIsOpen(false);
        setSearch('');
    };

    return (
        <div className="space-y-2 relative" ref={containerRef}>
            <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">{label}</label>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full h-11 px-3.5 bg-white dark:bg-[#0f172a] border border-gray-200 dark:border-white/10 rounded-xl text-xs text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium flex items-center justify-between transition-colors shadow-sm"
            >
                <span className="truncate">{value || "Selecione uma etiqueta..."}</span>
                <FiChevronDown size={16} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute z-40 w-full min-w-[220px] md:min-w-[260px] mt-1.5 bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-white/10 rounded-xl shadow-xl max-h-56 flex flex-col overflow-hidden overflow-y-auto overflow-x-hidden animate-in fade-in duration-100">
                    <div className="p-2 border-b border-gray-100 dark:border-white/5 relative">
                        <FiSearch className="absolute left-4 top-4 text-gray-400" size={14} />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Buscar etiqueta..."
                            className="w-full pl-8 pr-3 py-1.5 bg-gray-50 dark:bg-[#0f172a] border border-gray-100 dark:border-white/5 rounded-lg text-xs text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                    </div>
                    <div className="overflow-y-auto overflow-x-hidden custom-scrollbar flex-1 max-h-40 py-1">
                        <button
                            type="button"
                            onClick={() => handleSelect("")}
                            className="w-full text-left px-3.5 py-2.5 text-xs text-red-500 hover:bg-gray-50 dark:hover:bg-white/5 font-medium transition-colors border-b border-gray-100 dark:border-white/5"
                        >
                            Nenhum (Limpar)
                        </button>
                        {filtered.map(lbl => (
                            <button
                                key={lbl.id || lbl.name}
                                type="button"
                                onClick={() => handleSelect(lbl.name)}
                                className="w-full text-left px-3.5 py-2.5 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 font-medium transition-colors flex items-center gap-2"
                            >
                                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: lbl.color || '#3b82f6' }} />
                                <span className="truncate flex-1 pr-1">{lbl.name}</span>
                            </button>
                        ))}
                        {filtered.length === 0 && (
                            <div className="px-3.5 py-3 text-xs text-gray-400 italic text-center">
                                Nenhuma etiqueta encontrada
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default LabelSearchSelect;
