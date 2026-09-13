import React from 'react';
import { FiInfo } from 'react-icons/fi';
import { PLATFORM_INFO } from './constants';

const PlatformActionSelectors = ({ platform, action, onPlatformChange, onActionChange }) => {
    return (
        <>
            {/* Seleção de Plataforma */}
            <div className="flex flex-col gap-1">
                <div className="flex items-center gap-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase block">Plataforma</label>
                    {PLATFORM_INFO[platform] && (
                        <span className="relative inline-flex group nodrag">
                            <FiInfo size={11} className="text-gray-400 hover:text-indigo-400 cursor-help" />
                            <span className="pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 w-56 opacity-0 group-hover:opacity-100 transition-opacity z-50 bg-gray-900 text-gray-100 text-[10px] leading-snug font-normal normal-case p-2 rounded-lg shadow-xl">
                                {PLATFORM_INFO[platform].description}
                                <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
                            </span>
                        </span>
                    )}
                </div>
                <select
                    className="nodrag nopan w-full text-xs border rounded p-2 bg-gray-55 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-semibold focus:ring-2 focus:ring-indigo-500 outline-none border-gray-300 dark:border-gray-700"
                    value={platform}
                    onChange={(e) => onPlatformChange(e.target.value)}
                >
                    <option value="chatwoot">💬 Atendimento (Chat Local)</option>
                    <option value="local">🛡️ Segmentação Local (ZapVoice)</option>
                    <option value="manychat">⚡ ManyChat</option>
                </select>
            </div>

            {/* Seleção de Ação */}
            <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase block">Ação</label>
                <select
                    className="nodrag nopan w-full text-xs border rounded p-2 bg-gray-55 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-semibold focus:ring-2 focus:ring-indigo-500 outline-none border-gray-300 dark:border-gray-700"
                    value={action}
                    onChange={(e) => onActionChange(e.target.value)}
                >
                    {platform === 'chatwoot' ? (
                        <>
                            <option value="chatwoot_label">🏷️ Etiquetar Conversa (Labels)</option>
                            <option value="update_contact">👤 Atualizar Contato (Nome)</option>
                            <option value="add_private_note">📝 Adicionar Nota Privada</option>
                            <option value="change_assignee">👤 Alterar Responsável</option>
                        </>
                    ) : platform === 'local' ? (
                        <>
                            <option value="add_tag">🏷️ Adicionar Tag Local</option>
                            <option value="remove_tag">🏷️ Remover Tag Local</option>
                            <option value="block">🚫 Adicionar à Blacklist (Bloquear)</option>
                            <option value="unblock">🟢 Remover da Blacklist (Desbloquear)</option>
                        </>
                    ) : (
                        <>
                            <option value="add_tag">🏷️ Adicionar Tag</option>
                            <option value="remove_tag">❌ Remover Tag</option>
                            <option value="set_custom_field">⚙️ Definir Custom Field</option>
                        </>
                    )}
                </select>
            </div>
        </>
    );
};

export default PlatformActionSelectors;
