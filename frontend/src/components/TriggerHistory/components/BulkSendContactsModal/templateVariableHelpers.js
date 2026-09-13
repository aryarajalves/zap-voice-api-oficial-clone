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
      label: `Link do Cabeçalho (${mediaTypeLabel})`,
      isMedia: true,
      format: headerComp.format
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
          label: `Variável do Corpo ${match}`
        });
      });
    }
  }

  // 3. Variáveis do Botão (URL dinâmica)
  const buttonsComp = templateObj.components?.find(c => c.type === 'BUTTONS');
  if (buttonsComp?.buttons) {
    buttonsComp.buttons.forEach((btn, idx) => {
      if (btn.type === 'URL' && btn.url?.includes('{{1}}')) {
        vars.push({
          key: `BUTTONS_${idx}`,
          label: `Variável do Botão ${idx + 1} (${btn.text || ''})`
        });
      }
    });
  }

  return vars;
};

export const extractTemplateButtons = (templateObj) => {
  if (!templateObj?.components) return [];
  const buttonsComp = templateObj.components.find(c => c.type === 'BUTTONS');
  if (!buttonsComp?.buttons) return [];
  return buttonsComp.buttons
    .filter(b => b.type !== 'URL' && b.type !== 'PHONE')
    .map((b, idx) => ({ text: b.text, index: idx }))
    .filter(b => b.text);
};
