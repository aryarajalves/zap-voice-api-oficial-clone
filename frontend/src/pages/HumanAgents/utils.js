/**
 * Calcula e formata o tempo decorrido desde o início do atendimento humano.
 * @param {string|null} handoverTimeIso 
 * @returns {string} Texto legível com o tempo de espera
 */
export const getWaitingTime = (handoverTimeIso) => {
    if (!handoverTimeIso) return 'Sem tempo registrado';
    const start = new Date(handoverTimeIso);
    const now = new Date();
    const diffMs = now - start;
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Iniciou agora';
    if (diffMins < 60) return `Há ${diffMins} minutos`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `Há ${diffHours} ${diffHours === 1 ? 'hora' : 'horas'}`;
    const diffDays = Math.floor(diffHours / 24);
    return `Há ${diffDays} ${diffDays === 1 ? 'dia' : 'dias'}`;
};
