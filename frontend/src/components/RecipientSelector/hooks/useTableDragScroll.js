import { useRef, useState, useEffect } from 'react';

/**
 * Hook para permitir arrastar um container com rolagem horizontal e vertical
 * segurando com o botão esquerdo do mouse (Drag-to-Scroll / Pan).
 * Ignora cliques em inputs, botões, selects, checkboxes e links para preservar
 * a edição e interação nativa.
 */
export function useTableDragScroll() {
    const containerRef = useRef(null);
    const [isDragging, setIsDragging] = useState(false);
    const dragData = useRef({
        isDown: false,
        startX: 0,
        startY: 0,
        scrollLeft: 0,
        scrollTop: 0
    });

    const handleMouseDown = (e) => {
        // Apenas botão esquerdo do mouse
        if (e.button !== 0) return;

        // Não inicia arraste se clicou em campos de entrada ou botões
        if (e.target.closest('input, textarea, select, button, a, [data-no-drag]')) {
            return;
        }

        const container = containerRef.current;
        if (!container) return;

        dragData.current = {
            isDown: true,
            startX: e.pageX - container.offsetLeft,
            startY: e.pageY - container.offsetTop,
            scrollLeft: container.scrollLeft,
            scrollTop: container.scrollTop
        };

        setIsDragging(true);
    };

    useEffect(() => {
        const handleMouseMove = (e) => {
            if (!dragData.current.isDown) return;
            const container = containerRef.current;
            if (!container) return;

            e.preventDefault();

            const x = e.pageX - container.offsetLeft;
            const y = e.pageY - container.offsetTop;

            const walkX = x - dragData.current.startX;
            const walkY = y - dragData.current.startY;

            container.scrollLeft = dragData.current.scrollLeft - walkX;
            container.scrollTop = dragData.current.scrollTop - walkY;
        };

        const handleMouseUp = () => {
            if (dragData.current.isDown) {
                dragData.current.isDown = false;
                setIsDragging(false);
            }
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, []);

    return {
        containerRef,
        isDragging,
        dragProps: {
            ref: containerRef,
            onMouseDown: handleMouseDown
        }
    };
}
