import { useEffect } from 'react';

/**
 * Hook para bloquear/desbloquear o scroll da página
 * Útil para modals e popups
 */
const useScrollLock = (isLocked) => {
    useEffect(() => {
        if (isLocked) {
            // Salva a posição atual do scroll
            const scrollY = window.scrollY;

            // Aplica estilos para bloquear o scroll
            document.body.style.position = 'fixed';
            document.body.style.top = `-${scrollY}px`;
            document.body.style.width = '100%';
            document.body.style.overflow = 'hidden';
            document.documentElement.style.overflow = 'hidden';

            return () => {
                // Remove os estilos quando o modal fechar
                document.body.style.position = '';
                document.body.style.top = '';
                document.body.style.width = '';
                document.body.style.overflow = '';
                document.documentElement.style.overflow = '';

                // Restaura a posição do scroll
                window.scrollTo(0, scrollY);
            };
        }
    }, [isLocked]);
};

export default useScrollLock;
