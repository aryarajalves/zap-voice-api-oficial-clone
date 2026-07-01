/**
 * Utilitários para DDI/DDD de telefones brasileiros.
 *
 * Usado para popular os dropdowns de filtro (DDI/DDD) do ContactsModal de
 * forma DINÂMICA — mostrando apenas os códigos que de fato existem entre os
 * contatos atualmente listados, em vez de uma lista estática fixa com todos
 * os DDDs do Brasil.
 */

// Mapa de DDD -> UF (código de área brasileiro padrão, 11 a 99). Usado só
// para exibir um rótulo amigável quando o código encontrado é conhecido.
export const DDD_LABELS = {
    '11': 'SP', '12': 'SP', '13': 'SP', '14': 'SP', '15': 'SP', '16': 'SP', '17': 'SP', '18': 'SP', '19': 'SP',
    '21': 'RJ', '22': 'RJ', '24': 'RJ',
    '27': 'ES', '28': 'ES',
    '31': 'MG', '32': 'MG', '33': 'MG', '34': 'MG', '35': 'MG', '37': 'MG', '38': 'MG',
    '41': 'PR', '42': 'PR', '43': 'PR', '44': 'PR', '45': 'PR', '46': 'PR',
    '47': 'SC', '48': 'SC', '49': 'SC',
    '51': 'RS', '53': 'RS', '54': 'RS', '55': 'RS',
    '61': 'DF', '62': 'GO', '63': 'TO', '64': 'GO', '65': 'MT', '66': 'MT', '67': 'MS', '68': 'AC', '69': 'RO',
    '71': 'BA', '73': 'BA', '74': 'BA', '75': 'BA', '77': 'BA',
    '79': 'SE',
    '81': 'PE', '82': 'AL', '83': 'PB', '84': 'RN', '85': 'CE', '86': 'PI', '87': 'PE', '88': 'CE', '89': 'PI',
    '91': 'PA', '92': 'AM', '93': 'PA', '94': 'PA', '95': 'RR', '96': 'AP', '97': 'AM', '98': 'MA', '99': 'MA',
};

// Nomes amigáveis para os DDIs mais comuns na base de contatos.
export const DDI_LABELS = {
    '55': 'Brasil',
    '1': 'EUA/Canadá',
    '351': 'Portugal',
    '54': 'Argentina',
    '598': 'Uruguai',
    '595': 'Paraguai',
};

/**
 * Extrai DDI e DDD de uma string de telefone (com ou sem formatação),
 * seguindo a mesma heurística usada no backend (routers/triggers/details.py):
 *  - Começa com "55" e tem 12-13 dígitos => DDI "55", DDD = próximos 2 dígitos
 *  - 10 a 11 dígitos (sem DDI)            => DDD = primeiros 2 dígitos
 *  - Qualquer outro formato               => não reconhecido (retorna null)
 *
 * IMPORTANTE: só reconhece "tem DDI" quando o número realmente começa com
 * "55" — não basta ter 12-13 dígitos. Um telefone malformado tipo
 * "17988887777" com 1 dígito a mais (11+1=12) NÃO deve virar um DDI
 * fantasma "+17" (esse "17" é, na verdade, o DDD de SP).
 */
export function extractDdiDdd(rawPhone) {
    const digits = String(rawPhone || '').replace(/\D/g, '');
    const len = digits.length;
    if (digits.startsWith('55') && (len === 12 || len === 13)) {
        return { ddi: digits.slice(0, 2), ddd: digits.slice(2, 4) };
    }
    if (len === 10 || len === 11) {
        return { ddi: '', ddd: digits.slice(0, 2) };
    }
    return null;
}

/** Texto amigável para uma option de DDD (usa a UF quando conhecida). */
export function formatDddOption(ddd) {
    const uf = DDD_LABELS[ddd];
    return uf ? `${uf} (${ddd})` : `DDD ${ddd}`;
}

/** Texto amigável para uma option de DDI (usa o nome do país quando conhecido). */
export function formatDdiOption(ddi) {
    if (!ddi) return 'Sem DDI';
    const label = DDI_LABELS[ddi];
    return label ? `+${ddi} — ${label}` : `+${ddi}`;
}

/**
 * A partir de uma lista de telefones (strings), calcula os conjuntos de
 * DDIs e DDDs realmente presentes — para popular dropdowns dinâmicos.
 * @param {Array<string>} phones
 * @returns {{ ddis: string[], ddds: string[] }}
 */
export function getAvailableDdiDdd(phones) {
    const ddiSet = new Set();
    const dddSet = new Set();
    for (const phone of (phones || [])) {
        const parsed = extractDdiDdd(phone);
        if (!parsed) continue;
        if (parsed.ddi) ddiSet.add(parsed.ddi);
        if (parsed.ddd) dddSet.add(parsed.ddd);
    }
    const ddis = Array.from(ddiSet).sort((a, b) => {
        if (a === '55') return -1;
        if (b === '55') return 1;
        return a.localeCompare(b);
    });
    const ddds = Array.from(dddSet).sort((a, b) => Number(a) - Number(b));
    return { ddis, ddds };
}
