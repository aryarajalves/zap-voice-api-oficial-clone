
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

export const VAR_OPTIONS = [
    { label: 'Nome Completo', value: '{{nome}}', icon: '👤' },
    { label: 'Primeiro Nome', value: '{{primeiro_nome}}', icon: '👤' },
    { label: 'E-mail', value: '{{email}}', icon: '📧' },
    { label: 'Telefone', value: '{{telefone}}', icon: '📞' },
    { label: 'Nome do Produto', value: '{{produto}}', icon: '📦' },
];
