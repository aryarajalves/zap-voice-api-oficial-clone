import React from 'react';
import { FiUser, FiSlash, FiClock } from 'react-icons/fi';
import { BsPinAngleFill, BsExclamationCircleFill } from 'react-icons/bs';
import { getFirstName } from '../../../utils/nameFormatter';

export default function ChatListItem({
    convo,
    isSelected,
    isChecked,
    onSelect,
    onToggleCheck,
    onDelete,
    getLabelColor,
    formatTime
}) {
    const initials = (convo.contact_name || convo.phone || 'C')
        .split(' ')
        .map(w => w[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();

    return (
        <div
            className={`relative group/convo p-4 cursor-pointer transition-all flex gap-3 items-center ${
                isSelected
                    ? 'bg-blue-50/50 dark:bg-blue-900/10 border-l-4 border-blue-600'
                    : isChecked
                    ? 'bg-red-50/30 dark:bg-red-900/10 border-l-4 border-red-400'
                    : 'hover:bg-gray-100/50 dark:hover:bg-white/5'
            }`}
        >
            <input
                type="checkbox"
                checked={isChecked}
                onChange={onToggleCheck}
                onClick={e => e.stopPropagation()}
                className="rounded border-gray-300 text-blue-600 shrink-0 cursor-pointer"
            />
            <div
                className="flex flex-1 gap-3 items-center min-w-0"
                onClick={onSelect}
            >
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-sm tracking-wide shrink-0">
                    {initials}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-1 pr-8">
                        <h4 className="font-semibold text-sm text-gray-800 dark:text-gray-200 truncate pr-2 flex items-center gap-1.5">
                            {convo.pinned && <BsPinAngleFill className="text-blue-500 rotate-45 shrink-0" size={12} title="Fixada" />}
                            {convo.urgent && <BsExclamationCircleFill className="text-red-500 shrink-0 animate-pulse" size={12} title="Urgente" />}
                            {convo.contact_name ? getFirstName(convo.contact_name) : convo.phone}
                        </h4>
                        <span className="text-[10px] text-gray-400 shrink-0">{formatTime(convo.last_message_at)}</span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate mb-1">{convo.last_message_content || 'Nenhuma mensagem'}</p>
                    
                    {/* Badges de bloqueio/repouso e atendente atribuído */}
                    {(convo.block_status || convo.assigned_user_name) && (
                        <div className="mb-1 flex flex-wrap gap-1">
                            {convo.block_status === 'blocked' && (
                                <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded border text-red-400 border-red-500/30 bg-red-500/10">
                                    <FiSlash size={9} /> Bloqueado
                                </span>
                            )}
                            {convo.block_status === 'resting' && (
                                <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded border text-orange-400 border-orange-500/30 bg-orange-500/10">
                                    <FiClock size={9} /> Repouso
                                </span>
                            )}
                            {convo.assigned_user_name && (
                                <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded border text-blue-400 border-blue-500/30 bg-blue-500/10">
                                    <FiUser size={9} /> {convo.assigned_user_name}
                                </span>
                            )}
                        </div>
                    )}

                    {/* Marcadores/Etiquetas coloridas do card */}
                    {convo.labels && convo.labels.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                            {convo.labels.map(label => {
                                const labelColor = getLabelColor(label);
                                return (
                                    <span
                                        key={label}
                                        style={{
                                            color: labelColor,
                                            borderColor: labelColor + '33',
                                            backgroundColor: labelColor + '15'
                                        }}
                                        className="text-[9px] font-bold px-1.5 py-0.5 rounded border"
                                    >
                                        {label} <span className="opacity-70 font-normal">({label ? label.length : 0})</span>
                                    </span>
                                );
                            })}
                        </div>
                    )}
                </div>
                {convo.unread_count > 0 && <span className="bg-emerald-500 text-white font-bold text-[10px] px-2 py-0.5 rounded-full shrink-0">{convo.unread_count}</span>}
            </div>

            {/* Botão delete individual (aparece no hover) */}
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onDelete(convo.id);
                }}
                className="absolute right-2 inset-y-0 my-auto h-fit opacity-0 group-hover/convo:opacity-100 p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 hover:text-red-600 dark:bg-red-500/20 dark:hover:bg-red-500/30 dark:text-red-400 dark:hover:text-red-300 rounded-lg transition"
                title="Deletar conversa"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </button>
        </div>
    );
}
