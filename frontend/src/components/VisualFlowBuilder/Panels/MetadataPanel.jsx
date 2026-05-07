import React from 'react';
import { Panel } from 'reactflow';
import { FiFlag, FiUser, FiChevronUp, FiChevronDown, FiCalendar } from 'react-icons/fi';

const MetadataPanel = ({
    funnelName, setFunnelName,
    triggerPhrase, setTriggerPhrase,
    showRestrictions, setShowRestrictions,
    allowedPhones, setAllowedPhones,
    blockedPhones, setBlockedPhones,
    showBusinessHours, setShowBusinessHours,
    businessHoursStart, setBusinessHoursStart,
    businessHoursEnd, setBusinessHoursEnd,
    businessHoursDays, setBusinessHoursDays
}) => {
    return (
        <Panel position="top-left" className="flex flex-col gap-2 p-3 bg-white/90 dark:bg-gray-800/90 backdrop-blur rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 w-72">
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
            <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 block flex items-center gap-1">
                    Palavra-Chave (Gatilho) <FiFlag size={10} />
                </label>
                <input
                    type="text"
                    className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded px-2 py-1 text-sm font-mono text-blue-600 dark:text-blue-400 focus:ring-2 focus:ring-blue-500 outline-none"
                    value={triggerPhrase}
                    onChange={(e) => setTriggerPhrase(e.target.value)}
                    placeholder="Ex: #promo2024"
                />
                <span className="text-[9px] text-gray-400 mt-0.5 block">Digite a palavra exata para iniciar este fluxo.</span>
            </div>

            <div className="pt-2 border-t border-gray-100 dark:border-gray-700 mt-1">
                {/* Restrições de Contato */}
                <button
                    onClick={() => setShowRestrictions(!showRestrictions)}
                    className={`w-full flex items-center justify-between text-[10px] font-bold uppercase transition mb-1 ${showRestrictions ? 'text-blue-500' : 'text-gray-500 hover:text-blue-500'}`}
                >
                    <span className="flex items-center gap-1.5 align-middle"><FiUser size={12} /> Restrições de Contato</span>
                    {showRestrictions ? <FiChevronUp /> : <FiChevronDown />}
                </button>

                {showRestrictions && (
                    <div className="mt-2 mb-4 space-y-3 animate-fade-in bg-gray-50/50 dark:bg-gray-900/30 p-2 rounded-lg border border-gray-100 dark:border-gray-800">
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
