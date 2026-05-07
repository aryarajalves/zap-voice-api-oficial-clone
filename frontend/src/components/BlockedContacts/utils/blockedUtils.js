/**
 * Mapeia nomes de países ou siglas para DDI numérico.
 * @param {string} val 
 * @returns {string}
 */
export const mapCountryToCode = (val) => {
    if (!val || typeof val !== 'string') return val;
    const clean = val.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const countries = {
        'brasil': '55', 'brazil': '55', 'br': '55',
        'portugal': '351', 'pt': '351',
        'angola': '244', 'ao': '244',
        'mocambique': '258', 'mz': '258',
        'estados unidos': '1', 'usa': '1', 'united states': '1', 'us': '1',
        'argentina': '54', 'ar': '54',
        'paraguai': '595', 'py': '595',
        'uruguai': '598', 'uy': '598',
        'chile': '56', 'cl': '56',
        'colombia': '57', 'co': '57',
        'espanha': '34', 'es': '34', 'spain': '34',
        'italia': '39', 'it': '39', 'italy': '39',
        'franca': '33', 'fr': '33', 'france': '33',
        'reino unido': '44', 'uk': '44', 'united kingdom': '44',
        'alemanha': '49', 'de': '49', 'germany': '49',
        'mexico': '52', 'mx': '52',
        'japao': '81', 'jp': '81', 'japan': '81',
        'china': '86', 'cn': '86'
    };
    return countries[clean] || val;
};

/**
 * Converte um texto colado em uma lista de objetos de contato { phone, name }.
 * @param {string} text 
 * @returns {Array}
 */
export const parseManualEntry = (text) => {
    if (!text) return [];
    return text
        .split(/[\n,;\s]+/)
        .map(line => {
            if (!line.trim()) return null;
            const parts = line.split(/[;:]/);
            const phone = parts[0].replace(/\D/g, '');
            const name = parts[1]?.trim() || '';
            return phone.length >= 8 ? { phone, name } : null;
        })
        .filter(Boolean);
};

/**
 * Limpa uma string de números, removendo caracteres não numéricos.
 * @param {string} text 
 * @returns {Array}
 */
export const cleanNumbers = (text) => {
    if (!text) return [];
    return text.split(/[\n, ]+/).map(n => n.replace(/\D/g, '')).filter(n => n.length >= 8);
};

/**
 * Retorna os últimos 8 dígitos de um número de telefone.
 * @param {string} num 
 * @returns {string}
 */
export const getLast8 = (num) => {
    const cleaned = num.replace(/\D/g, '');
    return cleaned.length >= 8 ? cleaned.slice(-8) : cleaned;
};
