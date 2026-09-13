/**
 * Utilitários para extração e conversão de parâmetros e componentes de templates de mensagens.
 */

export const convertComponentsToParams = (components) => {
  if (!components || !Array.isArray(components)) return {};
  const params = {};
  components.forEach(comp => {
    const type = comp.type?.toUpperCase(); // HEADER ou BODY
    if (comp.parameters && Array.isArray(comp.parameters)) {
      comp.parameters.forEach((param, idx) => {
        const key = `${type}_${idx}`;
        if (param.type === 'text') {
          params[key] = param.text;
        } else if (param.type === 'image') {
          params[key] = param.image?.link || '';
        } else if (param.type === 'video') {
          params[key] = param.video?.link || '';
        } else if (param.type === 'document') {
          params[key] = param.document?.link || '';
        }
      });
    }
  });
  return params;
};

export const extractTemplateButtons = (templateObj) => {
  if (!templateObj?.components) return [];
  const buttonsComp = templateObj.components.find(c => c.type === 'BUTTONS');
  if (!buttonsComp?.buttons) return [];
  return buttonsComp.buttons
    .filter(b => b.type !== 'URL' && b.type !== 'PHONE')
    .map(b => b.text)
    .filter(Boolean);
};

export const extractTemplateVariables = (templateObj) => {
  if (!templateObj) return [];
  const bodyComp = templateObj.components?.find(c => c.type === 'BODY');
  if (!bodyComp || !bodyComp.text) return [];
  const matches = bodyComp.text.match(/\{\{\d+\}\}/g);
  if (!matches) return [];
  return [...new Set(matches)].map(match => ({
    key: `BODY_${parseInt(match.replace(/[{}]/g, '')) - 1}`,
    label: match
  }));
};

export const getHeaderFormat = (templateObj) => {
  if (!templateObj) return null;
  const header = templateObj.components?.find(c => c.type === 'HEADER');
  return header ? header.format : null;
};

export const buildTemplateComponents = (tObj, templateParams) => {
  const components = [];
  if (!tObj) return components;

  // Header
  const header = tObj.components?.find(c => c.type === 'HEADER');
  if (header) {
    const parameters = [];
    if (header.format === 'TEXT') {
      const val = templateParams['HEADER_0'] || '';
      parameters.push({ type: 'text', text: val });
    } else if (['IMAGE', 'VIDEO', 'DOCUMENT'].includes(header.format)) {
      const type = header.format.toLowerCase();
      const val = templateParams['HEADER_0'] || '';
      parameters.push({
        type: type,
        [type]: { link: val }
      });
    }
    if (parameters.length > 0) {
      components.push({ type: 'header', parameters });
    }
  }

  // Body
  const body = tObj.components?.find(c => c.type === 'BODY');
  if (body) {
    const parameters = [];
    const matches = body.text.match(/\{\{\d+\}\}/g) || [];
    matches.forEach((_, idx) => {
      const val = templateParams[`BODY_${idx}`] || '';
      parameters.push({ type: 'text', text: val });
    });
    if (parameters.length > 0) {
      components.push({ type: 'body', parameters });
    }
  }

  return components;
};
