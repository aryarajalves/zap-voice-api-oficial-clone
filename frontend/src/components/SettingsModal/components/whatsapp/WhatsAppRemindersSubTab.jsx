import React from 'react';
import { FiCalendar } from 'react-icons/fi';
import TemplatePreview from '../../../BulkSender/common/TemplatePreview';

const VAR_OPTIONS = [
    { value: '{name}', label: 'Nome do Contato' },
    { value: '{event_datetime}', label: 'Data/Hora do Evento' },
    { value: '{google_calendar_link}', label: 'Link da Agenda' },
    { value: 'custom', label: 'Texto Customizado / Livre' },
];

export default function WhatsAppRemindersSubTab({
    formData,
    handleChange,
    templates,
    funnels,
    appointmentParams,
    buttonActions,
    handleParamChange,
    handleButtonActionChange
}) {
    const isAppointmentsEnabled = formData.APPOINTMENTS_ENABLED === true || formData.APPOINTMENTS_ENABLED === 'true';
    const selectedTemplateObj = templates.find(t => t.name === formData.APPOINTMENTS_REMINDER_TEMPLATE);

    const headerComp = selectedTemplateObj?.components?.find(c => c.type === 'HEADER');
    const bodyComp = selectedTemplateObj?.components?.find(c => c.type === 'BODY');
    const buttonsComp = selectedTemplateObj?.components?.find(c => c.type === 'BUTTONS');

    const getVariables = (text) => {
        if (!text) return [];
        const matches = [...text.matchAll(/\{\{(\d+)\}\}/g)];
        return matches.map(m => m[1]);
    };

    const headerTextVars = headerComp && headerComp.text ? getVariables(headerComp.text) : [];
    const bodyTextVars = bodyComp && bodyComp.text ? getVariables(bodyComp.text) : [];
    const quickReplyButtons = buttonsComp && Array.isArray(buttonsComp.buttons)
        ? buttonsComp.buttons.filter(b => b.type === 'QUICK_REPLY').map(b => b.text)
        : [];

    return (
        <div className="space-y-4 animate-in fade-in duration-200">
            <div className="bg-gray-50 dark:bg-white/[0.02] border border-gray-100 dark:border-white/5 rounded-2xl p-5 md:p-6 space-y-5 transition-colors duration-200">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/10 rounded-xl text-blue-500">
                        <FiCalendar size={20} />
                    </div>
                    <div>
                        <h4 className="text-sm font-bold text-gray-800 dark:text-white">Lembretes de Agendamento</h4>
                        <p className="text-xs text-gray-400 dark:text-gray-500">Envie um lembrete (template oficial) de forma automática X minutos antes do horário agendado de um contato.</p>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                            Ativar agendamentos de lembrete
                        </span>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                name="APPOINTMENTS_ENABLED"
                                checked={isAppointmentsEnabled}
                                onChange={(e) => {
                                    handleChange({ target: { name: 'APPOINTMENTS_ENABLED', value: e.target.checked } });
                                }}
                                className="sr-only peer"
                            />
                            <div className="w-9 h-5 bg-gray-200 dark:bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                        </label>
                    </div>

                    {isAppointmentsEnabled && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">Template a ser disparado</label>
                                <select
                                    name="APPOINTMENTS_REMINDER_TEMPLATE"
                                    value={formData.APPOINTMENTS_REMINDER_TEMPLATE || ''}
                                    onChange={handleChange}
                                    className="w-full p-2.5 border border-gray-300 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white dark:bg-[#1e293b] text-gray-900 dark:text-white text-xs font-medium"
                                >
                                    <option value="" className="bg-white dark:bg-[#1e293b] text-gray-900 dark:text-white">Selecione um template...</option>
                                    {templates.map(t => (
                                        <option key={t.name} value={t.name} className="bg-white dark:bg-[#1e293b] text-gray-900 dark:text-white">{t.name} ({t.language})</option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">Minutos antes do disparo</label>
                                <select
                                    name="APPOINTMENTS_REMINDER_MINUTES"
                                    value={formData.APPOINTMENTS_REMINDER_MINUTES || '30'}
                                    onChange={handleChange}
                                    className="w-full p-2.5 border border-gray-300 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white dark:bg-[#1e293b] text-gray-900 dark:text-white text-xs font-medium"
                                >
                                    <option value="5" className="bg-white dark:bg-[#1e293b] text-gray-900 dark:text-white">5 minutos antes</option>
                                    <option value="10" className="bg-white dark:bg-[#1e293b] text-gray-900 dark:text-white">10 minutos antes</option>
                                    <option value="15" className="bg-white dark:bg-[#1e293b] text-gray-900 dark:text-white">15 minutos antes</option>
                                    <option value="30" className="bg-white dark:bg-[#1e293b] text-gray-900 dark:text-white">30 minutos antes</option>
                                    <option value="45" className="bg-white dark:bg-[#1e293b] text-gray-900 dark:text-white">45 minutos antes</option>
                                    <option value="60" className="bg-white dark:bg-[#1e293b] text-gray-900 dark:text-white">1 hora antes (60 min)</option>
                                    <option value="120" className="bg-white dark:bg-[#1e293b] text-gray-900 dark:text-white">2 horas antes (120 min)</option>
                                </select>
                            </div>
                        </div>
                    )}

                    {isAppointmentsEnabled && selectedTemplateObj && (
                        <div className="flex flex-col gap-6 pt-4 border-t border-gray-100 dark:border-white/5 mt-4">
                            <div className="w-full space-y-4">
                                {/* Variáveis do Template */}
                                {(headerTextVars.length > 0 || bodyTextVars.length > 0) && (
                                    <div className="space-y-4">
                                        <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300">Variáveis do Template</h4>
                                        
                                        {headerTextVars.map(vNum => {
                                            const paramKey = `HEADER_${vNum}`;
                                            const paramVal = appointmentParams[paramKey] || '';
                                            const isCustom = !['{name}', '{event_datetime}', '{google_calendar_link}'].includes(paramVal) && paramVal !== '';
                                            const selectVal = isCustom ? 'custom' : (paramVal || '{name}');
                                            
                                            return (
                                                <div key={paramKey} className="space-y-1.5 p-3 rounded-2xl bg-white/5 border border-white/5">
                                                    <label className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">Variável do Cabeçalho {'{{' + vNum + '}}'}</label>
                                                    <div className="flex gap-2">
                                                        <select
                                                            value={selectVal}
                                                            onChange={(e) => {
                                                                const val = e.target.value;
                                                                if (val === 'custom') {
                                                                    handleParamChange(paramKey, '');
                                                                } else {
                                                                    handleParamChange(paramKey, val);
                                                                }
                                                            }}
                                                            className="p-2 border border-gray-300 dark:border-white/10 rounded-lg bg-white dark:bg-[#1e293b] text-gray-900 dark:text-white text-xs font-medium focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none flex-1"
                                                        >
                                                            {VAR_OPTIONS.map(opt => (
                                                                <option key={opt.value} value={opt.value} className="bg-[#1e293b] text-white">{opt.label}</option>
                                                            ))}
                                                        </select>
                                                        {(selectVal === 'custom' || isCustom) && (
                                                            <input
                                                                type="text"
                                                                placeholder="Digite o valor..."
                                                                value={paramVal}
                                                                onChange={(e) => handleParamChange(paramKey, e.target.value)}
                                                                className="p-2 border border-gray-300 dark:border-white/10 rounded-lg bg-white dark:bg-[#1e293b] text-gray-900 dark:text-white text-xs font-medium focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none flex-1"
                                                            />
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}

                                        {bodyTextVars.map(vNum => {
                                            const paramKey = `BODY_${vNum}`;
                                            const paramVal = appointmentParams[paramKey] || '';
                                            const isCustom = !['{name}', '{event_datetime}', '{google_calendar_link}'].includes(paramVal) && paramVal !== '';
                                            const selectVal = isCustom ? 'custom' : (paramVal || '{name}');
                                            
                                            return (
                                                <div key={paramKey} className="space-y-1.5 p-3 rounded-2xl bg-white/5 border border-white/5">
                                                    <label className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">Variável do Corpo {'{{' + vNum + '}}'}</label>
                                                    <div className="flex gap-2">
                                                        <select
                                                            value={selectVal}
                                                            onChange={(e) => {
                                                                const val = e.target.value;
                                                                if (val === 'custom') {
                                                                    handleParamChange(paramKey, '');
                                                                } else {
                                                                    handleParamChange(paramKey, val);
                                                                }
                                                            }}
                                                            className="p-2 border border-gray-300 dark:border-white/10 rounded-lg bg-white dark:bg-[#1e293b] text-gray-900 dark:text-white text-xs font-medium focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none flex-1"
                                                        >
                                                            {VAR_OPTIONS.map(opt => (
                                                                <option key={opt.value} value={opt.value} className="bg-[#1e293b] text-white">{opt.label}</option>
                                                            ))}
                                                        </select>
                                                        {(selectVal === 'custom' || isCustom) && (
                                                            <input
                                                                type="text"
                                                                placeholder="Digite o valor..."
                                                                value={paramVal}
                                                                onChange={(e) => handleParamChange(paramKey, e.target.value)}
                                                                className="p-2 border border-gray-300 dark:border-white/10 rounded-lg bg-white dark:bg-[#1e293b] text-gray-900 dark:text-white text-xs font-medium focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none flex-1"
                                                            />
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                {/* Ações dos Botões */}
                                {quickReplyButtons.length > 0 && (
                                    <div className="space-y-4">
                                        <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300">Ações dos Botões (Quick Replies)</h4>
                                        
                                        {quickReplyButtons.map(btnText => {
                                            const action = buttonActions[btnText] || { type: 'none', funnel_id: null };
                                            
                                            return (
                                                <div key={btnText} className="p-3.5 rounded-2xl bg-white/5 border border-white/5 space-y-3">
                                                    <div className="flex justify-between items-center">
                                                        <span className="px-2.5 py-1 bg-white/10 rounded-xl text-xs font-bold text-white max-w-[180px] truncate">{btnText}</span>
                                                        <span className="text-[10px] text-gray-400 font-semibold uppercase">Botão Rápido</span>
                                                    </div>
                                                    
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                        <div className="space-y-1">
                                                            <label className="text-[10px] uppercase font-bold text-gray-400">Tipo de Ação</label>
                                                            <select
                                                                value={action.type}
                                                                onChange={(e) => handleButtonActionChange(btnText, { ...action, type: e.target.value, funnel_id: e.target.value === 'none' ? null : action.funnel_id })}
                                                                className="w-full p-2 border border-gray-300 dark:border-white/10 rounded-xl bg-white dark:bg-[#1e293b] text-gray-900 dark:text-white text-xs font-medium focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                                            >
                                                                <option value="none" className="bg-[#1e293b] text-white">Nenhuma</option>
                                                                <option value="interaction" className="bg-[#1e293b] text-white">Interação (Dispara Funil)</option>
                                                                <option value="block" className="bg-[#1e293b] text-white">Bloqueio</option>
                                                            </select>
                                                        </div>
                                                        
                                                        {action.type !== 'none' && (
                                                            <div className="space-y-1">
                                                                <label className="text-[10px] uppercase font-bold text-gray-400">Selecionar Funil</label>
                                                                <select
                                                                    value={action.funnel_id || ''}
                                                                    onChange={(e) => handleButtonActionChange(btnText, { ...action, funnel_id: e.target.value ? parseInt(e.target.value) : null })}
                                                                    className="w-full p-2 border border-gray-300 dark:border-white/10 rounded-xl bg-white dark:bg-[#1e293b] text-gray-900 dark:text-white text-xs font-medium focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                                                >
                                                                    <option value="" className="bg-[#1e293b] text-white">— Nenhum funil —</option>
                                                                    {funnels.map(f => (
                                                                        <option key={f.id} value={f.id} className="bg-[#1e293b] text-white">{f.is_pinned ? '📌 ' : ''}{f.name}</option>
                                                                    ))}
                                                                </select>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Live Preview do Template */}
                            <div className="w-full space-y-2 border-t border-gray-100 dark:border-white/5 pt-6">
                                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">Visualização em Tempo Real</label>
                                {(() => {
                                    const mappedParams = {};
                                    Object.entries(appointmentParams).forEach(([k, v]) => {
                                        const match = k.match(/^(HEADER|BODY)_(\d+)$/);
                                        if (match) {
                                            const type = match[1];
                                            const index = parseInt(match[2]);
                                            if (index > 0) {
                                                mappedParams[`${type}_${index - 1}`] = v;
                                            } else {
                                                mappedParams[k] = v;
                                            }
                                        } else {
                                            mappedParams[k] = v;
                                        }
                                    });
                                    return (
                                        <div className="w-full">
                                            <TemplatePreview 
                                                template={selectedTemplateObj} 
                                                params={mappedParams}
                                            />
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
