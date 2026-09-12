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

/**
 * Normaliza e deduplica preventivamente a lista de destinatários antes do agendamento
 */
export const buildDeduplicatedPayloadContacts = (contacts, selectedTemplateObj, templateParams, vFilters = {}) => {
    if (!contacts || !Array.isArray(contacts)) return [];

    const seenPhones = new Set();
    const result = [];

    for (const c of contacts) {
        if (!c) continue;
        const rawPhone = c.phone || c.telefone || '';
        let clean = String(rawPhone).replace(/\D/g, '');
        if (!clean) continue;

        if (clean.startsWith('0')) {
            clean = clean.replace(/^0+/, '');
        }
        if ((clean.length === 10 || clean.length === 11) && !clean.startsWith('55')) {
            const ddd = parseInt(clean.substring(0, 2), 10);
            if (ddd >= 11 && ddd <= 99) clean = `55${clean}`;
        }
        if (clean.startsWith('55') && clean.length === 12) {
            const ddd = parseInt(clean.substring(2, 4), 10);
            const num = clean.substring(4);
            if (ddd >= 11 && ddd <= 99) clean = `55${ddd}9${num}`;
        }
        if (clean.startsWith('55') && clean.length > 13) {
            clean = clean.slice(-13);
        }

        if (clean.length < 8 || seenPhones.has(clean)) continue;
        seenPhones.add(clean);

        const processedVars = {};
        if (c.vars) {
            Object.entries(c.vars).forEach(([key, val]) => {
                if (vFilters[key] === 'first_name' && val) {
                    processedVars[key] = String(val).trim().split(' ')[0];
                } else {
                    processedVars[key] = val;
                }
            });
        }

        result.push({
            phone: clean,
            name: c.name,
            components: buildComponentsPayload(selectedTemplateObj, { ...templateParams, ...processedVars }),
            vars: processedVars
        });
    }

    return result;
};

