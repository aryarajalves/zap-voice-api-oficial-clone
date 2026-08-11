import React, { useState } from 'react';
import { FiCpu, FiAlertCircle, FiMaximize2, FiMinimize2 } from 'react-icons/fi';
import { formatBRDate, getExplanationKey } from './ContactsModalHelpers';

const MAX_TAGS_VISIBLE = 3;

// Ação já tomada sobre um contato do relatório de falhas (bloquear/repousar/reenviar) —
// o registro continua visível no relatório, mas travado: não pode ser selecionado nem
// sofrer outra ação a partir daqui.
const RESOLUTION_META = {
    blocked: { label: 'Bloqueado', icon: '🚫', badgeClass: 'bg-rose-500/10 text-rose-500 border-rose-500/20' },
    resting: { label: 'Em Repouso', icon: '😴', badgeClass: 'bg-amber-500/10 text-amber-500 border-amber-500/20' },
    resent: { label: 'Reenviado', icon: '📨', badgeClass: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
};

const ContactRow = ({
    contact,
    isSelected,
    onToggleSelect,
    isTemplate,
    onExplainError
}) => {
    const phone = contact.phone_number || contact.phone || '';
    const expKey = getExplanationKey(contact.failure_reason);
    const [tagsExpanded, setTagsExpanded] = useState(false);
    const resolution = contact.failure_resolution ? RESOLUTION_META[contact.failure_resolution] : null;

    return (
        <div className={`p-3 bg-white dark:bg-gray-800 transition flex justify-between items-center group ${resolution ? 'opacity-60' : 'hover:bg-gray-50 dark:hover:bg-gray-750'}`}>
            <div className="flex items-center gap-4">
                <input
                    type="checkbox"
                    className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500/20 w-4 h-4 bg-transparent transition-all cursor-pointer mr-1 disabled:cursor-not-allowed disabled:opacity-50"
                    checked={isSelected}
                    disabled={!!resolution}
                    onChange={onToggleSelect}
                    title={resolution ? `Já ${resolution.label.toLowerCase()} — não pode ser selecionado novamente` : undefined}
                />
                {/* Ícone de status */}
                <div className="w-10 flex flex-col items-center justify-center">
                    {contact.status === 'read' ? (
                        <div className="flex -space-x-1 text-blue-500" title="Mensagem lida">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                        </div>
                    ) : contact.status === 'delivered' ? (
                        <div className="flex -space-x-1 text-gray-400" title="Mensagem entregue">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                        </div>
                    ) : contact.status === 'sent' ? (
                        <div className="text-gray-400" title="Mensagem enviada">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                        </div>
                    ) : contact.status === 'failed' ? (
                        <div className="text-red-500" title="Falha no envio">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        </div>
                    ) : contact.failure_reason === 'BLOCKED_VIA_BUTTON' ? (
                        <div className="text-orange-500" title="Bloqueado pelo usuário">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
                        </div>
                    ) : (
                        <div className="w-2 h-2 rounded-full bg-gray-300" />
                    )}
                </div>

                {/* Info do contato */}
                <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                        <div className="text-sm font-black text-gray-900 dark:text-white font-mono flex items-center gap-1.5">
                            <span>{phone || 'Desconhecido'}</span>
                            {contact.chatwoot_url && (
                                <a
                                    href={contact.chatwoot_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-1 text-purple-600 dark:text-purple-400 hover:text-purple-700 bg-purple-500/10 hover:bg-purple-500/20 rounded-md border border-purple-500/20 transition-all flex items-center gap-1 text-[10px] font-bold"
                                    title="Abrir Atendimento / Chat no Chatwoot"
                                >
                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                    </svg>
                                    Chat
                                </a>
                            )}
                        </div>
                        {contact.lead_tags && (() => {
                            const allTags = contact.lead_tags.split(',').map(t => t.trim()).filter(Boolean);
                            const visibleTags = tagsExpanded ? allTags : allTags.slice(0, MAX_TAGS_VISIBLE);
                            const hiddenCount = allTags.length - MAX_TAGS_VISIBLE;
                            return (
                                <div className="flex flex-wrap gap-1 items-center">
                                    {visibleTags.map((t, tagIdx) => (
                                        <span key={tagIdx} className="text-[9px] font-black uppercase tracking-tighter bg-emerald-500/10 text-emerald-500 px-1.5 py-0.5 rounded border border-emerald-500/20 font-sans">
                                            {t}
                                        </span>
                                    ))}
                                    {!tagsExpanded && hiddenCount > 0 && (
                                        <button
                                            type="button"
                                            onClick={(e) => { e.stopPropagation(); setTagsExpanded(true); }}
                                            className="text-[9px] font-black uppercase tracking-tighter bg-slate-500/10 text-slate-400 hover:text-white hover:bg-slate-500/30 px-1.5 py-0.5 rounded border border-slate-500/20 font-sans flex items-center gap-0.5 transition-colors"
                                            title="Ver todas as etiquetas"
                                        >
                                            <FiMaximize2 size={9} />
                                            +{hiddenCount}
                                        </button>
                                    )}
                                    {tagsExpanded && allTags.length > MAX_TAGS_VISIBLE && (
                                        <button
                                            type="button"
                                            onClick={(e) => { e.stopPropagation(); setTagsExpanded(false); }}
                                            className="text-[9px] font-black uppercase tracking-tighter bg-slate-500/10 text-slate-400 hover:text-white hover:bg-slate-500/30 px-1.5 py-0.5 rounded border border-slate-500/20 font-sans flex items-center gap-0.5 transition-colors"
                                            title="Recolher etiquetas"
                                        >
                                            <FiMinimize2 size={9} />
                                            menos
                                        </button>
                                    )}
                                </div>
                            );
                        })()}
                        {isTemplate && (
                            (contact.meta_price_brl !== undefined && contact.meta_price_brl !== null ? contact.meta_price_brl > 0 : !['FREE_MESSAGE', 'DIRECT_MESSAGE'].includes(contact.message_type)) ? (
                                <span className="text-[9px] font-black uppercase tracking-tighter bg-orange-500/10 text-orange-500 px-1.5 py-0.5 rounded border border-orange-500/20 font-sans">Template Pago</span>
                            ) : (
                                <span className="text-[9px] font-black uppercase tracking-tighter bg-cyan-500/10 text-cyan-500 px-1.5 py-0.5 rounded border border-cyan-500/20 font-sans">Template Grátis</span>
                            )
                        )}
                    </div>

                    {/* Data individual no horário de Brasília */}
                    <div className="flex items-center gap-2 mt-1.5">
                        <div className="text-[10px] text-gray-400 font-medium">
                            {formatBRDate(contact.updated_at || contact.timestamp)}
                        </div>
                        {contact.is_interaction && (
                            <span className="text-[9px] font-black uppercase tracking-tighter text-purple-500 bg-purple-500/10 px-1.5 py-0.5 rounded border border-purple-500/20 font-sans">
                                Interagiu {contact.interaction_details ? `(${contact.interaction_details})` : ''}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-3">
                <div className="text-right">
                    {resolution && (
                        <div className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border mb-1 ${resolution.badgeClass}`}>
                            <span>{resolution.icon}</span>
                            <span>{resolution.label}</span>
                        </div>
                    )}
                    {contact.failure_reason && (
                        <div className="flex items-center justify-end gap-1">
                            <div className="text-xs text-red-500 font-bold max-w-[150px] truncate" title={contact.failure_reason}>
                                {contact.failure_reason === 'BLOCKED_VIA_BUTTON' ? 'BLOQUEOU O BOT' : contact.failure_reason}
                            </div>
                            <button
                                type="button"
                                onClick={() => onExplainError(contact.failure_reason)}
                                className="p-0.5 text-blue-500 hover:text-blue-650 hover:bg-blue-500/10 dark:hover:bg-blue-500/5 rounded transition-all shrink-0"
                                title="Explicar erro"
                            >
                                <FiAlertCircle className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    )}
                    {contact.memory_webhook_status && (
                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 mt-1.5">
                            <FiCpu size={12} className={contact.memory_webhook_status === 'sent' || contact.memory_webhook_status === 'success' ? 'text-emerald-500 animate-pulse' : contact.memory_webhook_status === 'failed' ? 'text-red-500' : 'text-gray-400'} />
                            <span className={`text-[9px] font-black uppercase tracking-tighter ${contact.memory_webhook_status === 'sent' || contact.memory_webhook_status === 'success' ? 'text-emerald-600' : contact.memory_webhook_status === 'failed' ? 'text-red-600' : 'text-gray-500'}`}>Memória</span>
                        </div>
                    )}
                    {contact.private_note_posted && (
                        <div className="flex items-center justify-center gap-1.5 px-2 py-0.5 rounded-lg bg-pink-500/10 border border-pink-500/20 mt-1">
                            <span className="text-[9px] font-black uppercase tracking-tighter text-pink-500">Nota Privada</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ContactRow;
