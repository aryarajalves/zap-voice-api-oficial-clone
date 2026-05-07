/**
 * Constrói o payload de componentes para a API da Meta/WhatsApp
 */
export const buildComponentsPayload = (template, params) => {
    if (!template || !template.components) return [];

    const payloadComponents = [];

    template.components.forEach(c => {
        const isMediaHeader = c.type === 'HEADER' && ['IMAGE', 'VIDEO', 'DOCUMENT'].includes(c.format);

        if (c.type === 'BUTTONS') {
            c.buttons?.forEach((btn, idx) => {
                if (btn.type === 'URL' && btn.url?.includes('{{1}}')) {
                    const paramVal = params[`BUTTONS_${idx}`] || '';
                    if (paramVal) {
                        payloadComponents.push({
                            type: 'button',
                            sub_type: 'url',
                            index: idx,
                            parameters: [{ type: 'text', text: paramVal }]
                        });
                    }
                }
            });
            return;
        }

        const componentPayload = { type: c.type.toLowerCase(), parameters: [] };

        // Extrai {{N}} do texto via regex (fonte da verdade)
        if (c.text) {
            const seen = new Set();
            const matches = [...c.text.matchAll(/\{\{(\d+)\}\}/g)];
            matches.forEach(match => {
                const varNum = parseInt(match[1]);
                if (!seen.has(varNum)) {
                    seen.add(varNum);
                    const val = params[`${c.type}_${varNum - 1}`] || '';
                    componentPayload.parameters.push({ type: 'text', text: val });
                }
            });
        } else if (c.variables && c.variables.length > 0) {
            // fallback legado
            c.variables.forEach((v, idx) => {
                const val = params[`${c.type}_${idx}`] || '';
                componentPayload.parameters.push({ type: 'text', text: val });
            });
        } else if (isMediaHeader && params[`${c.type}_0`]) {
            const val = params[`${c.type}_0`];
            const typeName = c.format.toLowerCase();
            const mediaObj = {};
            mediaObj[typeName === 'document' ? 'document' : typeName] = { link: val };
            componentPayload.parameters.push({ type: typeName, ...mediaObj });
        }

        if (componentPayload.parameters.length > 0) {
            payloadComponents.push(componentPayload);
        }
    });

    return payloadComponents;
};
