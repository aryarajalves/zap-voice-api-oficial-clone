/**
 * Retorna informações de categoria e preço baseadas no nome do template
 */
export const getTemplateCategoryInfo = (templateName, templates) => {
    const t = templates.find(x => x.name === templateName);
    if (!t) return { type: 'Desconhecido', price: 0.0, key: 'OTHERS' };

    const cat = t.category?.toUpperCase() || 'OTHERS';
    if (cat === 'MARKETING') return { type: 'Marketing', price: 0.35, key: 'MARKETING' };
    if (cat === 'UTILITY') return { type: 'Utilidade', price: 0.07, key: 'UTILITY' };
    if (cat === 'AUTHENTICATION') return { type: 'Autenticação', price: 0.05, key: 'AUTHENTICATION' };
    return { type: 'Outros', price: 0.10, key: 'OTHERS' };
};

/**
 * Converte valores de delay para segundos
 */
export const getSeconds = (val, unit) => {
    const v = parseInt(val) || 0;
    if (unit === 'minutes') return v * 60;
    if (unit === 'hours') return v * 3600;
    return v;
};
