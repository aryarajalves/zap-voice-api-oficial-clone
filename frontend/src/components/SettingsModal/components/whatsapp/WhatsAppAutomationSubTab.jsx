import React, { useState, useRef, useEffect } from 'react';
import { FiX, FiZap } from 'react-icons/fi';
import LabelSearchSelect from '../LabelSearchSelect';
import WhatsAppAutoReplySection from '../WhatsAppAutoReplySection';

export default function WhatsAppAutomationSubTab({
    formData,
    handleChange,
    availableLabels
}) {
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selectedLabels = formData.WA_WINDOW_CLOSED_REMOVE_LABELS
        ? formData.WA_WINDOW_CLOSED_REMOVE_LABELS.split(',').map(s => s.trim()).filter(Boolean)
        : [];

    const handleAddLabel = (labelName) => {
        if (!selectedLabels.includes(labelName)) {
            const newLabels = [...selectedLabels, labelName].join(',');
            handleChange({ target: { name: 'WA_WINDOW_CLOSED_REMOVE_LABELS', value: newLabels } });
        }
        setSearchQuery('');
    };

    const handleRemoveLabel = (labelName) => {
        const newLabels = selectedLabels.filter(l => l !== labelName).join(',');
        handleChange({ target: { name: 'WA_WINDOW_CLOSED_REMOVE_LABELS', value: newLabels } });
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-200">
            {/* Janela de 24 Horas */}
            <div className="space-y-4 p-5 bg-purple-50/30 dark:bg-purple-900/10 rounded-2xl border border-purple-100 dark:border-purple-900/30 shadow-sm">
                <div className="flex items-center gap-2">
                    <FiX className="text-purple-500 w-5 h-5" />
                    <h4 className="text-sm font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wide">Janela de 24 Horas</h4>
                </div>
                
                <div className="grid grid-cols-1 gap-5 mt-3">
                    <div className="space-y-1.5 relative" ref={dropdownRef}>
                        <label className="text-[10px] uppercase tracking-wider font-bold text-gray-400 dark:text-gray-500 ml-1">
                            Selecione as etiquetas a serem removidas quando a janela fechar
                        </label>
                        
                        <div 
                            className="w-full bg-white dark:bg-[#1f2937]/50 border border-gray-300 dark:border-white/10 rounded-xl p-2.5 flex flex-wrap gap-2 cursor-text focus-within:ring-2 focus-within:ring-purple-500 focus-within:border-purple-500 transition-all min-h-[42px]"
                            onClick={() => setIsDropdownOpen(true)}
                        >
                            {selectedLabels.map(lbl => {
                                const match = availableLabels.find(al => al.name.toLowerCase() === lbl.toLowerCase());
                                const bgColor = match?.color || '#8B5CF6';
                                return (
                                    <span 
                                        key={lbl}
                                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold text-white shadow-sm"
                                        style={{ backgroundColor: bgColor }}
                                    >
                                        {lbl}
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleRemoveLabel(lbl);
                                            }}
                                            className="hover:bg-black/20 rounded p-0.5 transition-colors"
                                        >
                                            <FiX size={10} />
                                        </button>
                                    </span>
                                );
                            })}
                            
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => {
                                    setSearchQuery(e.target.value);
                                    setIsDropdownOpen(true);
                                }}
                                onFocus={() => setIsDropdownOpen(true)}
                                placeholder={selectedLabels.length === 0 ? "Clique para escolher marcadores..." : ""}
                                className="flex-1 min-w-[120px] bg-transparent text-xs text-gray-700 dark:text-gray-200 outline-none border-none p-0 focus:ring-0"
                            />
                        </div>
                        
                        {isDropdownOpen && (
                            <div className="absolute z-30 w-full mt-1.5 bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-white/10 rounded-xl shadow-xl max-h-48 overflow-y-auto overflow-x-hidden custom-scrollbar py-1">
                                {availableLabels
                                    .filter(lbl => 
                                        !selectedLabels.map(s => s.toLowerCase()).includes(lbl.name.toLowerCase()) &&
                                        lbl.name.toLowerCase().includes(searchQuery.toLowerCase())
                                    )
                                    .map(lbl => (
                                        <button
                                            key={lbl.id || lbl.name}
                                            type="button"
                                            onClick={() => handleAddLabel(lbl.name)}
                                            className="w-full text-left px-3.5 py-2 text-xs hover:bg-gray-50 dark:hover:bg-white/5 flex items-center gap-2.5 text-gray-700 dark:text-gray-300 font-medium transition-colors"
                                        >
                                            <span 
                                                className="w-2.5 h-2.5 rounded-full shrink-0" 
                                                style={{ backgroundColor: lbl.color || '#8B5CF6' }}
                                            />
                                            <span className="truncate flex-1">{lbl.name}</span>
                                        </button>
                                    ))
                                }
                                
                                {availableLabels.filter(lbl => 
                                    !selectedLabels.map(s => s.toLowerCase()).includes(lbl.name.toLowerCase()) &&
                                    lbl.name.toLowerCase().includes(searchQuery.toLowerCase())
                                ).length === 0 && (
                                    <div className="px-3.5 py-2 text-xs text-gray-400 dark:text-gray-500 italic text-center">
                                        Nenhum marcador disponível para selecionar.
                                    </div>
                                )}
                            </div>
                        )}
                        
                        <p className="text-[10px] text-gray-400 dark:text-gray-500 ml-1">
                            Essas etiquetas serão automaticamente removidas da conversa no chat interno do ZapVoice quando a janela de 24 horas expirar.
                        </p>
                    </div>
                </div>
            </div>

            {/* Bloco de Configuração do Agente de IA / Atendimento Humano */}
            <div className="bg-gray-50 dark:bg-white/[0.02] border border-gray-100 dark:border-white/5 rounded-2xl p-5 md:p-6 space-y-5 transition-colors duration-200">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-500">
                        <FiZap size={20} />
                    </div>
                    <div>
                        <h4 className="text-sm font-bold text-gray-800 dark:text-white">Automação de Agente de IA (Atendimento Humano)</h4>
                        <p className="text-xs text-gray-400 dark:text-gray-500">Defina se este WhatsApp possui um robô de IA e as etiquetas para transição de atendimento.</p>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                            Ativar agente de IA conversando neste WhatsApp
                        </span>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                name="WA_HAS_AI_AGENT"
                                checked={formData.WA_HAS_AI_AGENT === true || formData.WA_HAS_AI_AGENT === 'true'}
                                onChange={(e) => {
                                    handleChange({ target: { name: 'WA_HAS_AI_AGENT', value: e.target.checked } });
                                }}
                                className="sr-only peer"
                            />
                            <div className="w-9 h-5 bg-gray-200 dark:bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                        </label>
                    </div>

                    {(formData.WA_HAS_AI_AGENT === true || formData.WA_HAS_AI_AGENT === 'true') && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                            <LabelSearchSelect
                                label="Etiqueta Humano"
                                name="WA_HUMAN_LABEL"
                                value={formData.WA_HUMAN_LABEL}
                                availableLabels={availableLabels}
                                onChange={handleChange}
                            />

                            <LabelSearchSelect
                                label="Etiqueta Robo"
                                name="WA_ROBO_LABEL"
                                value={formData.WA_ROBO_LABEL}
                                availableLabels={availableLabels}
                                onChange={handleChange}
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Bloco de Configuração de Resposta Automática (Auto-Reply) */}
            <WhatsAppAutoReplySection
                formData={formData}
                handleChange={handleChange}
            />
        </div>
    );
}
