import React, { useEffect, useCallback, useLayoutEffect, useRef } from 'react';
import { toast } from 'react-hot-toast';

export function useChatMessageScroller({ engine, selectedConvo, setIsSearchMode, setHighlightedMsgId, activeClient }) {
    const scrollOffsetRef = useRef(null);

    useLayoutEffect(() => {
        if (scrollOffsetRef.current !== null && engine.messagesContainerRef.current) {
            const container = engine.messagesContainerRef.current;
            container.scrollTop = container.scrollHeight - scrollOffsetRef.current.prevHeight + scrollOffsetRef.current.prevTop;
            scrollOffsetRef.current = null;
        }
    }, [engine.messages]);

    useEffect(() => {
        if (engine.shouldScrollToBottom) {
            const container = engine.messagesContainerRef.current;
            if (container) {
                container.scrollTop = container.scrollHeight;
                engine.setShowScrollTopBtn(container.scrollTop > 80 || engine.hasMoreMessages);
            }
            const timer = setTimeout(() => {
                const c = engine.messagesContainerRef.current;
                if (c) {
                    c.scrollTop = c.scrollHeight;
                    engine.setShowScrollTopBtn(c.scrollTop > 80 || engine.hasMoreMessages);
                }
                engine.messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
            }, 50);
            engine.setShouldScrollToBottom(false);
            return () => clearTimeout(timer);
        }
    }, [engine.shouldScrollToBottom, engine.hasMoreMessages]);

    const handleScrollMessages = useCallback(() => {
        const container = engine.messagesContainerRef.current;
        if (!container) return;
        const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
        engine.setShowScrollBtn(distanceFromBottom > 80);
        engine.setShowScrollTopBtn(container.scrollTop > 80 || engine.hasMoreMessages);

        if (container.scrollTop <= 40 && engine.hasMoreMessages && !engine.isLoadingMoreMessages) {
            scrollOffsetRef.current = { prevHeight: container.scrollHeight, prevTop: container.scrollTop };
            engine.loadMoreMessages();
        }
    }, [engine]);

    const handleSelectSearchMessage = useCallback((msgId) => {
        if (!msgId) return;
        const el = document.getElementById(`msg-${msgId}`);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setHighlightedMsgId(msgId);
            setTimeout(() => setHighlightedMsgId(null), 2500);
        } else {
            toast.loading('Carregando mensagem no histórico...', { duration: 1500 });
        }
    }, [setHighlightedMsgId]);

    return {
        handleScrollMessages,
        handleSelectSearchMessage
    };
}
