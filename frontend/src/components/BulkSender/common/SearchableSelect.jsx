import React from 'react';
import { createPortal } from 'react-dom';
import { FiChevronDown, FiX, FiCheck } from 'react-icons/fi';

const SearchableSelect = ({ options, value, onChange, placeholder, icon: Icon, colorClass, isMulti }) => {
    const [isOpen, setIsOpen] = React.useState(false);
    const [searchTerm, setSearchTerm] = React.useState("");
    const containerRef = React.useRef(null);
    const [coords, setCoords] = React.useState({ top: 0, bottom: 0, left: 0, width: 0 });
    const [direction, setDirection] = React.useState('up');
 
    React.useEffect(() => {
        if (isOpen && containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            const spaceBelow = window.innerHeight - rect.bottom;
            setDirection('up');
            setCoords({ top: rect.top, bottom: rect.bottom, left: rect.left, width: rect.width });
        }
    }, [isOpen]);
 
    const filteredOptions = options.filter(opt =>
        opt.label.toLowerCase().includes(searchTerm.toLowerCase())
    );
 
    const isSelected = (optValue) => {
        if (isMulti) return Array.isArray(value) && value.includes(optValue);
        return String(value) === String(optValue);
    };
 
    const currentValues = isMulti
        ? (Array.isArray(value) ? value : (typeof value === 'string' && value.trim() ? value.split(',').map(v => v.trim()) : []))
        : [value];
    const selectedOptions = options.filter(opt => currentValues.some(v => String(v) === String(opt.value)));
 
    const handleToggle = (optValue) => {
        if (isMulti) {
            const newValue = currentValues.includes(optValue)
                ? currentValues.filter(v => v !== optValue)
                : [...currentValues, optValue];
            onChange(newValue);
        } else {
            onChange(optValue);
            setIsOpen(false);
            setSearchTerm("");
        }
    };
 
    return (
        <div className="relative w-full" ref={containerRef}>
            <div
                className={`flex items-center gap-2 w-full min-h-[44px] py-2 px-4 text-sm bg-slate-900/60 text-white border border-white/10 rounded-2xl outline-none focus-within:ring-2 ${colorClass || 'focus-within:ring-blue-500/20'} cursor-pointer group/sel flex-wrap transition-all hover:bg-slate-900/80`}
                onClick={() => setIsOpen(!isOpen)}
            >
                {Icon && <Icon className={colorClass?.includes('purple') ? 'text-purple-400' : 'text-blue-400'} size={14} />}
                <div className="flex flex-wrap gap-1 flex-1 overflow-hidden">
                    {selectedOptions.length > 0 ? (
                        isMulti ? (
                            selectedOptions.map(opt => (
                                <span key={opt.value} className="bg-blue-500/20 text-blue-300 px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 border border-blue-500/30">
                                    {opt.label}
                                    <FiX className="hover:text-white cursor-pointer" onClick={(e) => { e.stopPropagation(); handleToggle(opt.value); }} />
                                </span>
                            ))
                        ) : (
                            <span className="truncate font-bold text-white">{selectedOptions[0].label}</span>
                        )
                    ) : (
                        <span className="text-slate-500 font-bold uppercase tracking-widest text-[9px]">{placeholder}</span>
                    )}
                </div>
                <FiChevronDown className={`ml-auto text-slate-500 group-hover/sel:text-slate-300 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </div>
 
            {isOpen && createPortal(
                <>
                    <div className="fixed inset-0 z-[10000]" onClick={() => setIsOpen(false)}></div>
                    <div
                        className="fixed bg-slate-900 border border-white/10 rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.5)] z-[10001] overflow-hidden backdrop-blur-xl"
                        style={{
                            left: coords.left,
                            width: coords.width,
                            maxHeight: '300px',
                            ...(direction === 'up' 
                                ? { bottom: window.innerHeight - coords.top + 8 } 
                                : { top: coords.bottom + 8 })
                        }}
                    >
                        <div className="p-3 border-b border-white/5 bg-white/5">
                            <input
                                autoFocus
                                type="text"
                                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-500/20 text-white placeholder:text-slate-600"
                                placeholder="Digite para buscar..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                            />
                        </div>
                        <div className="max-h-60 overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-slate-700">
                            {filteredOptions.length === 0 ? (
                                <div className="p-4 text-center text-slate-500 text-[10px] font-black uppercase tracking-widest italic">Nenhum resultado</div>
                            ) : (
                                filteredOptions.map(opt => {
                                    const active = isSelected(opt.value);
                                    return (
                                        <div
                                            key={opt.value}
                                            className={`p-3 text-xs rounded-xl cursor-pointer transition-all flex items-center justify-between mb-1 last:mb-0 ${active ? 'bg-blue-600 text-white font-black shadow-lg shadow-blue-900/20' : 'hover:bg-white/5 text-slate-300'}`}
                                            onClick={(e) => { e.stopPropagation(); handleToggle(opt.value); }}
                                        >
                                            <span className="uppercase tracking-wider font-bold">{opt.label}</span>
                                            {active && <FiCheck size={14} strokeWidth={4} />}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                        {isMulti && (
                            <div className="p-3 border-t border-white/5 bg-white/5 flex justify-end">
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="text-[10px] font-black text-blue-400 bg-blue-500/10 px-5 py-2 rounded-xl border border-blue-500/20 hover:bg-blue-500 hover:text-white transition-all uppercase tracking-widest"
                                >
                                    Concluir
                                </button>
                            </div>
                        )}
                    </div>
                </>,
                document.body
            )}
        </div>
    );
};

export default SearchableSelect;
