/**
 * Retorna o primeiro nome de um contato.
 * Trata também casos comuns com separadores como "|" adicionados pelo Chatwoot.
 * Exemplo: "Julia santos | Psicóloga" -> "Julia"
 * 
 * @param {string} fullName Nome completo ou string do contato
 * @returns {string} Primeiro nome formatado
 */
export function getFirstName(fullName) {
    if (!fullName) return '';
    // Divide pelo caractere de pipe "|" caso exista e limpa espaços
    const nameWithoutPipe = fullName.split('|')[0].trim();
    // Pega a primeira palavra
    const firstName = nameWithoutPipe.split(' ')[0];
    return firstName || fullName;
}
