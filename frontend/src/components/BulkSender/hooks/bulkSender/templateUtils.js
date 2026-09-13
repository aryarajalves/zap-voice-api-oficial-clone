/**
 * Utilitários para inspeção de variáveis e botões de templates WhatsApp.
 */

export const extractTemplateButtons = (templateObj) => {
    if (!templateObj?.components) return [];
    const buttonsComp = templateObj.components.find(c => c.type === 'BUTTONS');
    if (!buttonsComp?.buttons) return [];
    // Filtra botões que NÃO sejam do tipo URL ou PHONE (ou seja, apenas os QUICK_REPLY/REPLY)
    return buttonsComp.buttons
        .filter(b => b.type !== 'URL' && b.type !== 'PHONE')
        .map(b => b.text)
        .filter(Boolean);
};

export const extractTemplateVariables = (templateObj) => {
    if (!templateObj) return [];
    const vars = [];
    
    // 1. Mídia no cabeçalho (IMAGE, VIDEO, DOCUMENT)
    const headerComp = templateObj.components?.find(c => c.type === 'HEADER');
    if (headerComp && ['IMAGE', 'VIDEO', 'DOCUMENT'].includes(headerComp.format)) {
        let mediaTypeLabel = 'Arquivo';
        if (headerComp.format === 'IMAGE') mediaTypeLabel = 'Imagem';
        else if (headerComp.format === 'VIDEO') mediaTypeLabel = 'Vídeo';
        else if (headerComp.format === 'DOCUMENT') mediaTypeLabel = 'Documento';

        vars.push({
            key: 'HEADER_0',
            label: `Link do Cabeçalho (${mediaTypeLabel})`
        });
    }
    
    // 2. Variáveis do Corpo
    const bodyComp = templateObj.components?.find(c => c.type === 'BODY');
    if (bodyComp && bodyComp.text) {
        const matches = bodyComp.text.match(/\{\{\d+\}\}/g);
        if (matches) {
            const uniqueMatches = [...new Set(matches)];
            uniqueMatches.forEach(match => {
                vars.push({
                    key: `BODY_${parseInt(match.replace(/[{}]/g, '')) - 1}`,
                    label: match
                });
            });
        }
    }
    
    return vars;
};
