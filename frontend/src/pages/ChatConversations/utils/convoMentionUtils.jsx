import React from 'react';
import { FiMessageSquare } from 'react-icons/fi';
import { renderLinkedText } from './linkifyText';

/**
 * Regex para detectar padrões de menção de conversa: @[Nome do Contato #12345] ou @[#12345]
 */
export const CONVO_MENTION_REGEX = /@\[([^\]#]*?)(?:#(\d+))\]/g;

/**
 * Renderiza um texto contendo menções de conversa (@[Nome #ID]) transformando-as em chips/badges clicáveis.
 * Também mantém suporte a URLs normais clicáveis através do renderLinkedText.
 * 
 * @param {string} text - Texto bruto contendo anotações e menções
 * @param {Function} onSelectConvo - Callback acionado ao clicar em uma menção (recebe o convoId)
 * @returns {React.ReactNode}
 */
export function renderConvoMentions(text, onSelectConvo) {
    if (!text || typeof text !== 'string') return text || null;

    const parts = [];
    let lastIndex = 0;
    let match;

    CONVO_MENTION_REGEX.lastIndex = 0;

    while ((match = CONVO_MENTION_REGEX.exec(text)) !== null) {
        const matchIndex = match.index;
        const fullMatch = match[0];
        const contactName = (match[1] || '').trim();
        const convoId = match[2];

        // Texto antes da menção (passa pelo renderLinkedText para links normais)
        if (matchIndex > lastIndex) {
            const rawSub = text.substring(lastIndex, matchIndex);
            parts.push(...(Array.isArray(renderLinkedText(rawSub)) ? renderLinkedText(rawSub) : [rawSub]));
        }

        // Chip clicável da conversa
        parts.push(
            <button
                key={`mention-${matchIndex}-${convoId}`}
                type="button"
                onClick={(e) => {
                    e.stopPropagation();
                    if (onSelectConvo && convoId) {
                        onSelectConvo(Number(convoId));
                    }
                }}
                className="inline-flex items-center gap-1 mx-1 px-2 py-0.5 rounded-md bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 hover:text-blue-100 border border-blue-500/30 font-semibold text-xs transition-all cursor-pointer select-none shadow-sm align-baseline hover:scale-105"
                title={`Clique para abrir a conversa de ${contactName || '#' + convoId}`}
            >
                <FiMessageSquare size={11} className="text-blue-400 shrink-0" />
                <span className="truncate max-w-[140px]">{contactName || `Conversa #${convoId}`}</span>
                <span className="text-[10px] opacity-75 font-mono">#{convoId}</span>
            </button>
        );

        lastIndex = matchIndex + fullMatch.length;
    }

    // Texto restante após a última menção
    if (lastIndex < text.length) {
        const remaining = text.substring(lastIndex);
        parts.push(...(Array.isArray(renderLinkedText(remaining)) ? renderLinkedText(remaining) : [remaining]));
    }

    return parts;
}

/**
 * Ordena e filtra conversas em ordem alfabética (A-Z) para o autocompletar do @
 * @param {Array} conversations - Lista de conversas disponíveis
 * @param {string} query - Termo digitado após o @
 * @returns {Array} - Conversas filtradas e ordenadas A-Z
 */
export function filterConvosForMention(conversations = [], query = '') {
    if (!Array.isArray(conversations)) return [];
    const cleanQuery = (query || '').toLowerCase().trim();

    let list = [...conversations];

    if (cleanQuery) {
        list = list.filter(c => {
            if (!c) return false;
            const name = (c.contact_name || '').toLowerCase();
            const phone = (c.phone || '').toLowerCase();
            const id = String(c.id || '');
            return name.includes(cleanQuery) || phone.includes(cleanQuery) || id.includes(cleanQuery);
        });
    }

    // Ordenação estrita alfabética (A-Z)
    return list.sort((a, b) => {
        const nameA = (a?.contact_name || a?.phone || '').trim().toLowerCase();
        const nameB = (b?.contact_name || b?.phone || '').trim().toLowerCase();
        return nameA.localeCompare(nameB, 'pt-BR', { sensitivity: 'base' });
    });
}
