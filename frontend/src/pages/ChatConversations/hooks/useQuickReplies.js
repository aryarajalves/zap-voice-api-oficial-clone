import { useState, useEffect, useMemo, useCallback } from 'react';
import { API_URL } from '../../../config';
import { getFirstName } from '../../../utils/nameFormatter';

export function useQuickReplies({ engine, selectedConvo, chatInputRef, activeClientId: propClientId }) {
    const [quickMessages, setQuickMessages] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [slashMatchRange, setSlashMatchRange] = useState(null);

    const getResolvedClientId = useCallback(() => {
        if (propClientId) return propClientId;
        if (engine?.activeClientId) return engine.activeClientId;
        if (selectedConvo?.client_id) return selectedConvo.client_id;
        try {
            const raw = localStorage.getItem('activeClient');
            if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed?.id) return parsed.id;
            }
        } catch (e) {}
        return null;
    }, [propClientId, engine?.activeClientId, selectedConvo?.client_id]);

    const activeClientId = getResolvedClientId();

    const fetchQuickMessages = useCallback(async () => {
        if (!activeClientId) return;
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_URL}/quick-messages`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'X-Client-ID': String(activeClientId)
                }
            });
            if (res.ok) {
                const data = await res.json();
                setQuickMessages(data);
            }
        } catch (err) {
            console.error('Erro ao carregar quick messages para o chat:', err);
        }
    }, [activeClientId]);

    useEffect(() => {
        fetchQuickMessages();
    }, [fetchQuickMessages]);

    // Filtrar mensagens rápidas de acordo com o que foi digitado após a barra /
    const filteredMessages = useMemo(() => {
        const q = searchTerm.toLowerCase().trim();
        if (!q) return quickMessages;
        return quickMessages.filter(
            m =>
                (m.shortcut || '').toLowerCase().includes(q) ||
                (m.title || '').toLowerCase().includes(q) ||
                (m.content || '').toLowerCase().includes(q)
        );
    }, [quickMessages, searchTerm]);

    // Monitorar texto e detectar barra /
    const checkSlashTrigger = useCallback((text, cursorPosition) => {
        if (!text) {
            setIsOpen(false);
            return;
        }

        const effectivePos = (cursorPosition === undefined || cursorPosition === null || cursorPosition === 0)
            ? text.length
            : cursorPosition;

        const textBeforeCursor = text.slice(0, effectivePos);
        // Detecta / no início da linha ou após um espaço
        const slashRegex = /(?:^|\s)\/([a-zA-Z0-9_-]*)$/;
        const match = textBeforeCursor.match(slashRegex);

        if (match) {
            const matchedQuery = match[1]; // o texto após a barra
            const slashIndex = textBeforeCursor.lastIndexOf('/');
            setSearchTerm(matchedQuery);
            setSlashMatchRange({ start: slashIndex, end: effectivePos });
            setIsOpen(true);
            setSelectedIndex(0);
        } else {
            setIsOpen(false);
            setSearchTerm('');
            setSlashMatchRange(null);
        }
    }, []);

    // Formatar variáveis {{nome}}, {{primeiro_nome}}, {{telefone}}
    const processVariables = useCallback((content) => {
        if (!content) return '';
        const rawName = selectedConvo?.contact_name || selectedConvo?.phone || 'Cliente';
        const firstName = getFirstName(rawName);
        const phone = selectedConvo?.phone || '';

        return content
            .replace(/\{\{\s*nome\s*\}\}/gi, rawName)
            .replace(/\{\{\s*primeiro_nome\s*\}\}/gi, firstName)
            .replace(/\{\{\s*telefone\s*\}\}/gi, phone);
    }, [selectedConvo]);

    // Selecionar mensagem rápida e substituir no input
    const selectQuickMessage = useCallback((item) => {
        if (!item) return;
        const currentText = engine?.newMessage || '';
        const processedContent = processVariables(item.content);

        let newText = '';
        let newCursorPos = 0;

        if (slashMatchRange && slashMatchRange.start !== undefined) {
            const beforeSlash = currentText.slice(0, slashMatchRange.start);
            const afterCursor = currentText.slice(slashMatchRange.end);
            newText = beforeSlash + processedContent + (afterCursor ? afterCursor : ' ');
            newCursorPos = (beforeSlash + processedContent).length + 1;
        } else {
            newText = processedContent;
            newCursorPos = newText.length;
        }

        engine?.setNewMessage(newText);
        setIsOpen(false);
        setSearchTerm('');
        setSlashMatchRange(null);

        // Devolver o foco para o textarea
        setTimeout(() => {
            if (chatInputRef?.current) {
                chatInputRef.current.focus();
                chatInputRef.current.setSelectionRange(newCursorPos, newCursorPos);
            }
        }, 10);
    }, [engine, slashMatchRange, processVariables, chatInputRef]);

    // Tratar eventos de teclado no input
    const handleKeyDown = useCallback((e) => {
        if (!isOpen || filteredMessages.length === 0) return false;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(prev => (prev + 1) % filteredMessages.length);
            return true;
        }

        if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(prev => (prev - 1 + filteredMessages.length) % filteredMessages.length);
            return true;
        }

        if (e.key === 'Enter' || e.key === 'Tab') {
            e.preventDefault();
            const chosen = filteredMessages[selectedIndex];
            if (chosen) {
                selectQuickMessage(chosen);
            }
            return true;
        }

        if (e.key === 'Escape') {
            e.preventDefault();
            setIsOpen(false);
            return true;
        }

        return false;
    }, [isOpen, filteredMessages, selectedIndex, selectQuickMessage]);

    return {
        isOpen,
        quickMessages: filteredMessages,
        selectedIndex,
        selectQuickMessage,
        checkSlashTrigger,
        handleKeyDown,
        closeQuickReplies: () => setIsOpen(false)
    };
}
