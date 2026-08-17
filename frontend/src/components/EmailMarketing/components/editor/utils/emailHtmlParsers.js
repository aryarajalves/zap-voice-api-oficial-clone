// Variáveis disponíveis na aba de contatos
export const CONTACT_VARIABLES = [
  { code: '{{nome}}', label: 'Nome do Contato' },
  { code: '{{email}}', label: 'E-mail' },
  { code: '{{phone}}', label: 'Telefone' },
  { code: '{{produto}}', label: 'Produto' },
  { code: '{{plataforma}}', label: 'Plataforma' },
  { code: '{{valor}}', label: 'Valor' },
  { code: '{{forma_pagamento}}', label: 'Pagamento' }
];

// Helper para converter a estrutura de blocos e estilos globais no HTML final responsivo de e-mail
export function exportBlocksToHtml(blocks, globalStyles) {
  const outerBg = globalStyles?.outerBgColor || '#b20505';
  const cardBg = globalStyles?.cardBgColor || '#ffffff';
  const cardWidth = globalStyles?.cardWidth || 600;
  const padding = globalStyles?.padding || 24;

  const renderedBlocks = (blocks || []).map(b => {
    switch (b.type) {
      case 'text':
        return `
          <div style="margin-bottom: 16px; font-family: Arial, sans-serif; font-size: ${b.fontSize || 15}px; color: ${b.color || '#334155'}; line-height: 1.6; text-align: ${b.textAlign || 'left'}; font-weight: ${b.fontWeight || 'normal'};">
            ${(b.content || '').replace(/\n/g, '<br />')}
          </div>
        `;

      case 'image':
        if (!b.url) return '';
        return `
          <div style="margin-bottom: 16px; text-align: ${b.align || 'center'};">
            <img src="${b.url}" alt="${b.alt || 'Imagem'}" style="max-width: 100%; height: auto; border-radius: ${b.borderRadius || 8}px; display: inline-block;" />
          </div>
        `;

      case 'button':
        return `
          <div style="margin-bottom: 20px; text-align: ${b.align || 'center'};">
            <a href="${b.url || '#'}" target="_blank" style="display: inline-block; padding: ${b.paddingY || 14}px ${b.paddingX || 28}px; background-color: ${b.bgColor || '#2563eb'}; color: ${b.textColor || '#ffffff'}; font-family: Arial, sans-serif; font-size: ${b.fontSize || 16}px; font-weight: bold; text-decoration: none; border-radius: ${b.borderRadius || 8}px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
              ${b.text || 'Clique Aqui'}
            </a>
          </div>
        `;

      case 'columns_2':
        return `
          <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 16px;">
            <tr>
              <td width="48%" valign="top" style="padding-right: 2%; font-family: Arial, sans-serif; font-size: 14px; color: #334155; line-height: 1.5;">
                ${(b.col1Text || 'Coluna 1').replace(/\n/g, '<br />')}
              </td>
              <td width="48%" valign="top" style="padding-left: 2%; font-family: Arial, sans-serif; font-size: 14px; color: #334155; line-height: 1.5;">
                ${(b.col2Text || 'Coluna 2').replace(/\n/g, '<br />')}
              </td>
            </tr>
          </table>
        `;

      case 'divider':
        return `
          <hr style="border: 0; border-top: ${b.thickness || 1}px solid ${b.color || '#e2e8f0'}; margin: ${b.margin || 20}px 0;" />
        `;

      case 'video':
        return `
          <div style="margin-bottom: 16px; text-align: center;">
            <video controls width="100%" style="max-width: 100%; border-radius: 8px; margin-bottom: 8px; display: block;">
              <source src="${b.url || '#'}" type="video/mp4">
              Seu navegador não suporta a exibição de vídeos.
            </video>
            <a href="${b.url || '#'}" target="_blank" style="text-decoration: none; display: inline-block; padding: 10px 20px; background-color: #0f172a; color: #ffffff; border-radius: 6px; font-family: Arial, sans-serif; font-size: 13px; font-weight: bold;">
              ▶️ Assistir ao Vídeo: ${b.title || 'Clique para Assistir'}
            </a>
          </div>
        `;

      default:
        return '';
    }
  }).join('');

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>E-mail Marketing</title>
</head>
<body style="margin: 0; padding: 0; background-color: ${outerBg}; font-family: Arial, sans-serif;">
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: ${outerBg}; padding: 24px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: ${cardWidth}px; background-color: ${cardBg}; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.1);">
          <tr>
            <td style="padding: ${padding}px;">
              ${renderedBlocks}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

// Parser para re-converter o HTML salvo de volta em blocos editáveis no Drag & Drop
export function parseHtmlToBlocks(html) {
  if (!html || typeof html !== 'string' || !html.trim()) return null;

  try {
    let outerBg = '#b20505';
    const bgMatch = html.match(/background-color:\s*([^;"]+)/i);
    if (bgMatch && bgMatch[1]) {
      const foundBg = bgMatch[1].trim();
      if (foundBg && foundBg !== 'inherit' && foundBg !== 'transparent') {
        outerBg = foundBg;
      }
    }

    if (typeof window !== 'undefined' && window.DOMParser) {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');

      const cardTd = doc.querySelector('td[style*="padding"]') || doc.querySelector('table td') || doc.body;
      const children = Array.from(cardTd.children);

      const blocks = [];

      if (children.length > 0) {
        children.forEach((el, idx) => {
          const id = `b-restored-${idx}-${Date.now()}`;
          const textContent = el.textContent || '';
          const innerHtml = el.innerHTML || '';

          // 1. Imagem
          const img = el.querySelector('img') || (el.tagName === 'IMG' ? el : null);
          if (img) {
            blocks.push({
              id,
              type: 'image',
              url: img.getAttribute('src') || '',
              alt: img.getAttribute('alt') || 'Imagem',
              align: el.style?.textAlign || img.parentElement?.style?.textAlign || 'center',
              borderRadius: 8
            });
            return;
          }

          // 2. Vídeo
          if (textContent.includes('Assistir ao Vídeo') || el.querySelector('video') || el.tagName === 'VIDEO') {
            const aTag = el.querySelector('a');
            const videoTag = el.querySelector('video');
            const titleMatch = textContent.replace(/▶️\s*Assistir ao Vídeo:\s*/i, '').trim();
            blocks.push({
              id,
              type: 'video',
              title: titleMatch || 'Vídeo',
              url: aTag?.getAttribute('href') || videoTag?.querySelector('source')?.getAttribute('src') || 'https://'
            });
            return;
          }

          // 3. Botão CTA
          const btnAnchor = el.querySelector('a[style*="background-color"]') || (el.tagName === 'A' && el.style?.backgroundColor ? el : null);
          if (btnAnchor) {
            const bgColor = btnAnchor.style?.backgroundColor || '#2563eb';
            const textColor = btnAnchor.style?.color || '#ffffff';
            blocks.push({
              id,
              type: 'button',
              text: btnAnchor.textContent?.trim() || 'Clique Aqui',
              url: btnAnchor.getAttribute('href') || 'https://',
              bgColor,
              textColor,
              align: el.style?.textAlign || 'center',
              borderRadius: 8
            });
            return;
          }

          // 4. Divisor HR
          if (el.querySelector('hr') || el.tagName === 'HR') {
            const hr = el.querySelector('hr') || (el.tagName === 'HR' ? el : null);
            const styleAttr = hr?.getAttribute('style') || '';
            const borderTopMatch = styleAttr.match(/border-top:\s*(\d+)px\s+solid\s+([^;"]+)/i);
            const marginMatch = styleAttr.match(/margin:\s*(\d+)px/i);

            blocks.push({
              id,
              type: 'divider',
              thickness: borderTopMatch ? Number(borderTopMatch[1]) : 1,
              color: borderTopMatch ? borderTopMatch[2].trim() : '#e2e8f0',
              margin: marginMatch ? Number(marginMatch[1]) : 20
            });
            return;
          }

          // 5. Duas colunas (tabela interna)
          if (el.tagName === 'TABLE' && el.querySelectorAll('td').length >= 2) {
            const tds = el.querySelectorAll('td');
            blocks.push({
              id,
              type: 'columns_2',
              col1Text: (tds[0]?.innerHTML || tds[0]?.textContent || '').replace(/<br\s*\/?>/gi, '\n').trim(),
              col2Text: (tds[1]?.innerHTML || tds[1]?.textContent || '').replace(/<br\s*\/?>/gi, '\n').trim()
            });
            return;
          }

          // 6. Texto / HTML Geral
          let cleanContent = innerHtml.replace(/<br\s*\/?>/gi, '\n').replace(/<p[^>]*>/gi, '').replace(/<\/p>/gi, '\n').trim();
          if (!cleanContent) cleanContent = textContent.trim();

          if (cleanContent) {
            const fontSizeMatch = el.getAttribute('style')?.match(/font-size:\s*(\d+)px/i);
            const colorMatch = el.getAttribute('style')?.match(/color:\s*([^;"]+)/i);
            const alignMatch = el.getAttribute('style')?.match(/text-align:\s*([^;"]+)/i);

            blocks.push({
              id,
              type: 'text',
              content: cleanContent,
              fontSize: fontSizeMatch ? Number(fontSizeMatch[1]) : 16,
              color: colorMatch ? colorMatch[1].trim() : '#1e293b',
              textAlign: alignMatch ? alignMatch[1].trim() : 'left'
            });
          }
        });
      }

      if (blocks.length > 0) {
        return {
          globalStyles: { outerBgColor: outerBg, cardBgColor: '#ffffff', cardWidth: 600, padding: 24 },
          blocks
        };
      }
    }
  } catch (err) {
    console.error('Erro ao restaurar blocos de HTML:', err);
  }

  // Fallback se não for HTML estruturado: criar um bloco de texto com todo o conteúdo
  const cleanRawText = html.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]*>?/gm, '').trim();
  if (cleanRawText) {
    return {
      globalStyles: { outerBgColor: '#b20505', cardBgColor: '#ffffff', cardWidth: 600, padding: 24 },
      blocks: [
        {
          id: `b-fallback-${Date.now()}`,
          type: 'text',
          content: cleanRawText,
          fontSize: 16,
          color: '#1e293b',
          textAlign: 'left'
        }
      ]
    };
  }

  return null;
}
