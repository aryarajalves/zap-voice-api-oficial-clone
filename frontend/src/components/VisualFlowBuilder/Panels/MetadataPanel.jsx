import React, { useState } from 'react';
import { Panel } from 'reactflow';
import { FiFlag, FiUser, FiChevronUp, FiChevronDown, FiCalendar, FiKey, FiShield, FiX } from 'react-icons/fi';

const MetadataPanel = ({
    funnelName, setFunnelName,
    showRestrictions, setShowRestrictions,
    allowedPhones, setAllowedPhones,
    blockedPhones, setBlockedPhones,
    showBusinessHours, setShowBusinessHours,
    businessHoursStart, setBusinessHoursStart,
    businessHoursEnd, setBusinessHoursEnd,
    businessHoursDays, setBusinessHoursDays,
    showKeywords, setShowKeywords,
    triggerPhrase, setTriggerPhrase,
    triggerMatchType, setTriggerMatchType,
    triggerLimitType, setTriggerLimitType,
    isTriggerActive, setIsTriggerActive
}) => {
    const [keywordInput, setKeywordInput] = useState('');

    const keywordsList = triggerPhrase
        ? triggerPhrase.split(',').map(k => k.trim()).filter(Boolean)
        : [];

    const handleAddKeyword = (val) => {
        const trimmed = val.trim();
        if (!trimmed) return;
        const newParts = trimmed.split(',').map(p => p.trim()).filter(Boolean);
        const merged = Array.from(new Set([...keywordsList, ...newParts]));
        setTriggerPhrase(merged.join(', '));
        setKeywordInput('');
    };

    const handleRemoveKeyword = (indexToRemove) => {
        const updated = keywordsList.filter((_, idx) => idx !== indexToRemove);
        setTriggerPhrase(updated.join(', '));
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            handleAddKeyword(keywordInput);
        } else if (e.key === 'Backspace' && !keywordInput && keywordsList.length > 0) {
            e.preventDefault();
            handleRemoveKeyword(keywordsList.length - 1);
        }
    };

    return (
        <Panel position="top-left" className="flex flex-col gap-2 p-3 bg-white/90 dark:bg-gray-800/90 backdrop-blur rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 w-80 max-h-[85vh] overflow-y-auto custom-scrollbar">
            <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 block">Nome do Funil</label>
                <input
                    type="text"
                    className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded px-2 py-1 text-sm font-semibold text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none"
                    value={funnelName}
                    onChange={(e) => setFunnelName(e.target.value)}
                    placeholder="Ex: Funil de Boas Vindas"
                />
            </div>

            <div className="pt-2 border-t border-gray-100 dark:border-gray-700 mt-1 space-y-2">
                {/* Gatilho por Palavra-Chave no WhatsApp */}
                <div>
                    <button
                        onClick={() => setShowKeywords(!showKeywords)}
                        className={`w-full flex items-center justify-between text-[10px] font-bold uppercase transition mb-1 ${showKeywords ? 'text-amber-500' : 'text-gray-500 hover:text-amber-500'}`}
                    >
                        <span className="flex items-center gap-1.5 align-middle">
                            <FiKey size={12} className={triggerPhrase?.trim() ? "text-amber-500" : ""} /> 
                            Palavra-Chave de Ativação
                            {triggerPhrase?.trim() && <span className="w-2 h-2 rounded-full bg-amber-500"></span>}
                        </span>
                        {showKeywords ? <FiChevronUp /> : <FiChevronDown />}
                    </button>

                    {showKeywords && (
                        <div className="mt-2 space-y-3 animate-fade-in bg-amber-50/40 dark:bg-amber-950/20 p-2.5 rounded-lg border border-amber-200/50 dark:border-amber-900/40">
                            <div className="flex items-center justify-between">
                                <label className="flex items-center gap-2 cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        className="w-3.5 h-3.5 text-amber-600 rounded border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 focus:ring-amber-500"
                                        checked={isTriggerActive}
                                        onChange={(e) => setIsTriggerActive(e.target.checked)}
                                    />
                                    <span className="text-[10px] font-bold text-gray-700 dark:text-gray-300 uppercase">Gatilho Ativo</span>
                                </label>
                            </div>

                            <div>
                                <label className="text-[9px] font-bold text-gray-400 uppercase mb-1 block">Palavra(s)-Chave</label>
                                <div className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded p-1.5 min-h-[42px] flex flex-wrap items-center gap-1.5 focus-within:ring-1 focus-within:ring-amber-500 transition">
                                    {keywordsList.map((kw, idx) => (
                                        <span
                                            key={idx}
                                            className="inline-flex items-center gap-1 bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 rounded-md px-2 py-0.5 text-[11px] font-bold tracking-tight shadow-sm animate-scale-in"
                                        >
                                            {kw}
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveKeyword(idx)}
                                                className="hover:text-red-500 focus:outline-none p-0.5 transition"
                                                title="Remover"
                                            >
                                                <FiX size={11} />
                                            </button>
                                        </span>
                                    ))}
                                    <input
                                        type="text"
                                        className="flex-1 min-w-[100px] bg-transparent border-none outline-none text-xs font-semibold text-gray-800 dark:text-gray-100 placeholder-gray-400 py-0.5 px-1"
                                        value={keywordInput}
                                        onChange={(e) => setKeywordInput(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                        onBlur={() => { if (keywordInput.trim()) handleAddKeyword(keywordInput); }}
                                        placeholder={keywordsList.length === 0 ? "Digite e aperte Enter..." : "+ Adicionar"}
                                    />
                                </div>
                                <span className="text-[8px] text-gray-400 block mt-1">Aperte <b>Enter</b> para adicionar o balão.</span>
                            </div>

                            <div>
                                <label className="text-[9px] font-bold text-gray-400 uppercase mb-1 block">Correspondência</label>
                                <select
                                    className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded px-2 py-1 text-xs text-gray-800 dark:text-gray-100 focus:ring-1 focus:ring-amber-500 outline-none font-medium cursor-pointer"
                                    value={triggerMatchType || 'contains'}
                                    onChange={(e) => setTriggerMatchType(e.target.value)}
                                >
                                    <option value="contains">Contém a palavra-chave</option>
                                    <option value="exact">Mensagem exatamente igual</option>
                                </select>
                            </div>

                            <div>
                                <label className="text-[9px] font-bold text-gray-400 uppercase mb-1 block flex items-center gap-1">
                                    <FiShield size={10} className="text-amber-500" /> Trava de Reativação por Contato
                                </label>
                                <select
                                    className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded px-2 py-1 text-xs text-gray-800 dark:text-gray-100 focus:ring-1 focus:ring-amber-500 outline-none font-medium cursor-pointer"
                                    value={triggerLimitType || 'none'}
                                    onChange={(e) => setTriggerLimitType(e.target.value)}
                                >
                                    <option value="none">Sem limite (sempre reativa)</option>
                                    <option value="once_per_day">Máximo 1x por dia (mesmo dia)</option>
                                    <option value="once_24h">Máximo 1x a cada 24 horas</option>
                                    <option value="once_lifetime">Apenas 1x por contato (vitalício)</option>
                                </select>
                                <span className="text-[8px] text-gray-400 block mt-0.5">Impede que o mesmo contato receba o funil repetidamente.</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Restrições de Contato */}
                <div>
                    <button
                        onClick={() => setShowRestrictions(!showRestrictions)}
                        className={`w-full flex items-center justify-between text-[10px] font-bold uppercase transition mb-1 ${showRestrictions ? 'text-blue-500' : 'text-gray-500 hover:text-blue-500'}`}
                    >
                        <span className="flex items-center gap-1.5 align-middle"><FiUser size={12} /> Restrições de Contato</span>
                        {showRestrictions ? <FiChevronUp /> : <FiChevronDown />}
                    </button>

                    {showRestrictions && (
                        <div className="mt-2 mb-2 space-y-3 animate-fade-in bg-gray-50/50 dark:bg-gray-900/30 p-2 rounded-lg border border-gray-100 dark:border-gray-800">
                            <div>
                                <label className="text-[9px] font-bold text-gray-400 uppercase mb-1 block">Lista de Permissão (Whitelist)</label>
                                <textarea
                                    className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded px-2 py-1 text-[11px] text-gray-800 dark:text-gray-100 focus:ring-1 focus:ring-blue-500 outline-none min-h-[50px]"
                                    value={allowedPhones}
                                    onChange={(e) => setAllowedPhones(e.target.value)}
                                    placeholder="55859..., 55119..."
                                />
                                <span className="text-[8px] text-gray-400 block mt-0.5">Apenas estes números receberão (se vazio, todos recebem).</span>
                            </div>
                            <div>
                                <label className="text-[9px] font-bold text-gray-400 uppercase mb-1 block">Lista de Bloqueio (Blacklist)</label>
                                <textarea
                                    className="w-full bg-white dark:bg-gray-900 border border-red-200 dark:border-red-900/30 rounded px-2 py-1 text-[11px] text-gray-800 dark:text-gray-100 focus:ring-1 focus:ring-red-500 outline-none min-h-[50px]"
                                    value={blockedPhones}
                                    onChange={(e) => setBlockedPhones(e.target.value)}
                                    placeholder="55859..., 55119..."
                                />
                                <span className="text-[8px] text-gray-400 block mt-0.5 font-medium">Estes números NUNCA receberão este funil.</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Horário Comercial */}
                <button
                    onClick={() => setShowBusinessHours(!showBusinessHours)}
                    className={`w-full flex items-center justify-between text-[10px] font-bold uppercase transition ${showBusinessHours ? 'text-blue-500' : 'text-gray-500 hover:text-blue-500'}`}
                >
                    <span className="flex items-center gap-1.5"><FiCalendar size={12} /> Horário Comercial</span>
                    {showBusinessHours ? <FiChevronUp /> : <FiChevronDown />}
                </button>

                {showBusinessHours && (
                    <div className="mt-2 space-y-3 animate-fade-in bg-gray-50/50 dark:bg-gray-900/30 p-2 rounded-lg border border-gray-100 dark:border-gray-800">
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="text-[8px] font-black text-gray-400 uppercase mb-1 block">Início</label>
                                <input
                                    type="time"
                                    className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded px-2 py-1 text-xs font-mono focus:ring-1 focus:ring-blue-500 outline-none"
                                    value={businessHoursStart}
                                    onChange={(e) => setBusinessHoursStart(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="text-[8px] font-black text-gray-400 uppercase mb-1 block">Fim</label>
                                <input
                                    type="time"
                                    className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded px-2 py-1 text-xs font-mono focus:ring-1 focus:ring-blue-500 outline-none"
                                    value={businessHoursEnd}
                                    onChange={(e) => setBusinessHoursEnd(e.target.value)}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-[8px] font-black text-gray-400 uppercase mb-1 block">Dias da Semana</label>
                            <div className="flex flex-wrap gap-1">
                                {[
                                    { id: 0, label: 'S' },
                                    { id: 1, label: 'T' },
                                    { id: 2, label: 'Q' },
                                    { id: 3, label: 'Q' },
                                    { id: 4, label: 'S' },
                                    { id: 5, label: 'S' },
                                    { id: 6, label: 'D' }
                                ].map((day) => {
                                    const isActive = businessHoursDays.includes(day.id);
                                    return (
                                        <button
                                            key={day.id}
                                            type="button"
                                            onClick={() => {
                                                if (isActive) {
                                                    setBusinessHoursDays(businessHoursDays.filter(d => d !== day.id));
                                                } else {
                                                    setBusinessHoursDays([...businessHoursDays, day.id].sort());
                                                }
                                            }}
                                            className={`w-6 h-6 rounded flex items-center justify-center text-[9px] font-bold transition-all ${
                                                isActive 
                                                ? 'bg-blue-500 text-white shadow-sm' 
                                                : 'bg-white dark:bg-gray-800 text-gray-400 border border-gray-100 dark:border-gray-700 hover:border-blue-200'
                                            }`}
                                        >
                                            {day.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="text-[8px] text-gray-400 italic leading-snug">
                            Filtro aplicado nos nós com "Apenas Horário Comercial" ativado. Mensagens fora deste período serão puladas.
                        </div>
                    </div>
                )}
            </div>
        </Panel>
    );
};

export default MetadataPanel;
