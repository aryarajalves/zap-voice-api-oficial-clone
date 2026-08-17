import React, { useState, useRef, useEffect, useCallback } from 'react';
import ConvoMentionDropdown from './ConvoMentionDropdown';
import { filterConvosForMention } from '../utils/convoMentionUtils';
import { API_URL } from '../../../config';
import { fetchWithAuth } from '../../../AuthContext';

export default function MentionTextarea({
    value = '',
    onChange,
    placeholder = 'Digite uma anotação... Use @ para marcar uma conversa',
    className = '',
    conversations = [],
    rows = 3,
    autoFocus = false,
    onKeyDownCustom,
    activeClientId
}) {
    const textareaRef = useRef(null);
    const containerRef = useRef(null);
    const debounceTimerRef = useRef(null);

    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [mentionQuery, setMentionQuery] = useState('');
    const [mentionStartIndex, setMentionStartIndex] = useState(-1);
    const [dropdownIndex, setDropdownIndex] = useState(0);
    const [dropdownPosition, setDropdownPosition] = useState({ top: 35, left: 10 });

    // Estado da listagem remota com paginação
    const [remoteConvos, setRemoteConvos] = useState([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [isLoading, setIsLoading] = useState(false);

    // Busca contatos da API ao abrir ou alterar query / página
    const fetchMentionContacts = useCallback(async (query = '', pageNum = 1) => {
        setIsLoading(true);
        try {
            const clientId = activeClientId || localStorage.getItem('active_client_id') || 1;
            const searchParam = query.trim() ? `&search=${encodeURIComponent(query.trim())}` : '';
            const res = await fetchWithAuth(
                `${API_URL}/chat/mention-contacts?page=${pageNum}&limit=20${searchParam}`,
                {},
                clientId
            );

            if (res.ok) {
                const data = await res.json();
                setRemoteConvos(data.items || []);
                setTotalPages(data.pages || 1);
                setTotalItems(data.total || 0);
            } else {
                // Fallback para conversas em memória caso a API retorne erro
                const fallback = filterConvosForMention(conversations, query);
                setRemoteConvos(fallback.slice((pageNum - 1) * 20, pageNum * 20));
                setTotalPages(Math.max(1, Math.ceil(fallback.length / 20)));
                setTotalItems(fallback.length);
            }
        } catch (err) {
            // Fallback para conversas em memória
            const fallback = filterConvosForMention(conversations, query);
            setRemoteConvos(fallback.slice((pageNum - 1) * 20, pageNum * 20));
            setTotalPages(Math.max(1, Math.ceil(fallback.length / 20)));
            setTotalItems(fallback.length);
        } finally {
            setIsLoading(false);
        }
    }, [activeClientId, conversations]);

    // Executa busca quando a query ou página mudar
    useEffect(() => {
        if (isDropdownOpen) {
            if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
            debounceTimerRef.current = setTimeout(() => {
                fetchMentionContacts(mentionQuery, page);
            }, 120);
        }
        return () => {
            if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
        };
    }, [isDropdownOpen, mentionQuery, page, fetchMentionContacts]);

    // Reseta índice e página ao mudar de query
    useEffect(() => {
        setDropdownIndex(0);
        setPage(1);
    }, [mentionQuery]);

    const checkMentionTrigger = (text, cursorPosition) => {
        if (!text || cursorPosition == null || cursorPosition <= 0) {
            setIsDropdownOpen(false);
            setMentionStartIndex(-1);
            setMentionQuery('');
            return;
        }

        const textBeforeCursor = text.substring(0, cursorPosition);
        const lastAtIndex = textBeforeCursor.lastIndexOf('@');

        if (lastAtIndex !== -1) {
            // Verifica se o @ é início de palavra ou precedido de espaço/pontuação
            const charBeforeAt = lastAtIndex > 0 ? textBeforeCursor[lastAtIndex - 1] : ' ';
            if (/\s|[.,;:!?]/.test(charBeforeAt) || lastAtIndex === 0) {
                const queryText = textBeforeCursor.substring(lastAtIndex + 1);

                // NÃO acionar se for menção já estruturada @[Nome #123] ou se tiver quebra de linha ou colchetes
                if (!queryText.startsWith('[') && !queryText.includes('[') && !queryText.includes(']') && !queryText.includes('\n')) {
                    if (queryText.length <= 25) {
                        setMentionStartIndex(lastAtIndex);
                        setMentionQuery(queryText);
                        setIsDropdownOpen(true);
                        return;
                    }
                }
            }
        }

        setIsDropdownOpen(false);
        setMentionStartIndex(-1);
        setMentionQuery('');
    };

    const handleTextChange = (e) => {
        const newText = e.target.value;
        const cursor = e.target.selectionStart;
        onChange(e);
        checkMentionTrigger(newText, cursor);
    };

    const handleSelectConversation = (convo) => {
        if (!convo || mentionStartIndex === -1) return;

        const contactName = convo.contact_name || convo.phone || `Conversa`;
        const mentionTag = `@[${contactName} #${convo.id}] `;

        const currentVal = value || '';
        const beforeMention = currentVal.substring(0, mentionStartIndex);
        const afterMention = currentVal.substring(textareaRef.current ? textareaRef.current.selectionStart : mentionStartIndex + mentionQuery.length + 1);

        const updatedValue = `${beforeMention}${mentionTag}${afterMention}`;

        // Dispara synthetic event de mudança para o pai
        const syntheticEvent = {
            target: { value: updatedValue }
        };
        onChange(syntheticEvent);

        setIsDropdownOpen(false);
        setMentionStartIndex(-1);
        setMentionQuery('');

        // Reposiciona o cursor após a menção inserida
        setTimeout(() => {
            if (textareaRef.current) {
                textareaRef.current.focus();
                const newCursorPos = beforeMention.length + mentionTag.length;
                textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
            }
        }, 10);
    };

    const handleKeyDown = (e) => {
        if (isDropdownOpen && remoteConvos.length > 0) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setDropdownIndex(prev => (prev + 1) % remoteConvos.length);
                return;
            }
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                setDropdownIndex(prev => (prev - 1 + remoteConvos.length) % remoteConvos.length);
                return;
            }
            if (e.key === 'Enter' || e.key === 'Tab') {
                e.preventDefault();
                handleSelectConversation(remoteConvos[dropdownIndex]);
                return;
            }
            if (e.key === 'Escape') {
                e.preventDefault();
                setIsDropdownOpen(false);
                return;
            }
            if (e.key === 'ArrowRight' && page < totalPages) {
                e.preventDefault();
                setPage(p => p + 1);
                return;
            }
            if (e.key === 'ArrowLeft' && page > 1) {
                e.preventDefault();
                setPage(p => p - 1);
                return;
            }
        }

        if (onKeyDownCustom) {
            onKeyDownCustom(e);
        }
    };

    const handleBlur = () => {
        setTimeout(() => {
            setIsDropdownOpen(false);
        }, 180);
    };

    return (
        <div ref={containerRef} className="relative w-full">
            <textarea
                ref={textareaRef}
                value={value}
                onChange={handleTextChange}
                onKeyDown={handleKeyDown}
                onBlur={handleBlur}
                onClick={(e) => checkMentionTrigger(value, e.target.selectionStart)}
                placeholder={placeholder}
                className={className}
                rows={rows}
                autoFocus={autoFocus}
            />

            {isDropdownOpen && (
                <ConvoMentionDropdown
                    conversations={remoteConvos}
                    selectedIndex={dropdownIndex}
                    onSelect={handleSelectConversation}
                    position={dropdownPosition}
                    page={page}
                    setPage={setPage}
                    totalPages={totalPages}
                    totalItems={totalItems}
                    isLoading={isLoading}
                />
            )}
        </div>
    );
}
