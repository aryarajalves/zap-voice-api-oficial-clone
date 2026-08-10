import React, { useState, useEffect, useRef } from 'react';
import { 
  FiType, FiImage, FiExternalLink, FiVideo, FiColumns, FiMinus, 
  FiTrash2, FiArrowUp, FiArrowDown, FiZap, FiDroplet, FiLayout, FiSliders
} from 'react-icons/fi';
import { API_URL } from '../../config';
import { toast } from 'react-hot-toast';
import { useClient } from '../../contexts/ClientContext';

// Variáveis disponíveis na aba de contatos
const CONTACT_VARIABLES = [
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
  const outerBg = globalStyles.outerBgColor || '#b20505';
  const cardBg = globalStyles.cardBgColor || '#ffffff';
  const cardWidth = globalStyles.cardWidth || 600;
  const padding = globalStyles.padding || 24;

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

export default function EmailDragDropEditor({ initialHtml, onChangeHtml }) {
  const { activeClient } = useClient();
  const [globalStyles, setGlobalStyles] = useState({
    outerBgColor: '#b20505', // Vermelho elegante por padrão
    cardBgColor: '#ffffff',
    cardWidth: 600,
    padding: 24
  });

  const DEFAULT_BLOCKS = [
    {
      id: 'b-1',
      type: 'text',
      content: 'Olá {{nome}},\n\nSeja muito bem-vindo! Digite seu texto aqui.',
      fontSize: 16,
      color: '#1e293b',
      textAlign: 'left'
    },
    {
      id: 'b-2',
      type: 'button',
      text: 'Garantir Minha Vaga Agora',
      url: 'https://',
      bgColor: '#2563eb',
      textColor: '#ffffff',
      align: 'center',
      borderRadius: 8
    }
  ];

  const [blocks, setBlocks] = useState(DEFAULT_BLOCKS);
  const lastInitialHtmlRef = useRef(null);
  const lastExportedHtmlRef = useRef(null);

  // Restaura os blocos e cor de fundo quando um template salvo é aberto
  useEffect(() => {
    // Evita loop de re-renders (flicker): se o initialHtml for o mesmo que acabou de ser exportado por este componente, ignora
    if (initialHtml && initialHtml === lastExportedHtmlRef.current) {
      return;
    }

    if (initialHtml && initialHtml !== lastInitialHtmlRef.current) {
      lastInitialHtmlRef.current = initialHtml;
      lastExportedHtmlRef.current = initialHtml;
      const restored = parseHtmlToBlocks(initialHtml);
      if (restored && restored.blocks && restored.blocks.length > 0) {
        setGlobalStyles(restored.globalStyles);
        setBlocks(restored.blocks);
        setActiveBlockId(restored.blocks[0].id);
      }
    } else if (!initialHtml && lastInitialHtmlRef.current !== null) {
      lastInitialHtmlRef.current = null;
      lastExportedHtmlRef.current = null;
      setBlocks(DEFAULT_BLOCKS);
      setActiveBlockId(DEFAULT_BLOCKS[0].id);
    }
  }, [initialHtml]);

  const [activeBlockId, setActiveBlockId] = useState('b-1');
  const [activeTab, setActiveTab] = useState('blocks'); // 'blocks' | 'styles'

  // Sempre que os blocos ou estilos mudarem, notifica o componente pai com o HTML gerado
  useEffect(() => {
    const generatedHtml = exportBlocksToHtml(blocks, globalStyles);
    lastExportedHtmlRef.current = generatedHtml;
    if (onChangeHtml) onChangeHtml(generatedHtml);
  }, [blocks, globalStyles]);

  const activeBlock = blocks.find(b => b.id === activeBlockId);

  // Adicionar novo bloco
  const addBlock = (type) => {
    const newId = `b-${Date.now()}`;
    let newBlock = { id: newId, type };

    if (type === 'text') {
      newBlock = { ...newBlock, content: 'Digite seu texto aqui...', fontSize: 15, color: '#334155', textAlign: 'left' };
    } else if (type === 'image') {
      newBlock = { ...newBlock, url: 'https://via.placeholder.com/600x300?text=Sua+Imagem+Aqui', alt: 'Imagem', align: 'center', borderRadius: 8 };
    } else if (type === 'button') {
      newBlock = { ...newBlock, text: 'Clique Aqui', url: 'https://', bgColor: '#2563eb', textColor: '#ffffff', align: 'center', borderRadius: 8 };
    } else if (type === 'columns_2') {
      newBlock = { ...newBlock, col1Text: 'Texto da Coluna 1...', col2Text: 'Texto da Coluna 2...' };
    } else if (type === 'divider') {
      newBlock = { ...newBlock, thickness: 1, color: '#e2e8f0', margin: 20 };
    } else if (type === 'video') {
      newBlock = { ...newBlock, title: 'Assistir ao Vídeo Exclusivo', url: 'https://' };
    }

    setBlocks(prev => [...prev, newBlock]);
    setActiveBlockId(newId);
    toast.success("Novo bloco adicionado ao e-mail!");
  };

  // Atualizar propriedades do bloco ativo
  const updateActiveBlock = (key, value) => {
    setBlocks(blocks.map(b => b.id === activeBlockId ? { ...b, [key]: value } : b));
  };

  // Mover bloco para cima/baixo
  const moveBlock = (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= blocks.length) return;
    const updated = [...blocks];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    setBlocks(updated);
  };

  // Deletar bloco
  const deleteBlock = (id) => {
    const filtered = blocks.filter(b => b.id !== id);
    setBlocks(filtered);
    if (activeBlockId === id && filtered.length > 0) {
      setActiveBlockId(filtered[0].id);
    }
  };

  // Inserir variável do lead no texto ativo
  const insertVariable = (varCode) => {
    if (!activeBlock || activeBlock.type !== 'text') return;
    updateActiveBlock('content', (activeBlock.content || '') + ' ' + varCode);
  };

  return (
    <div className="flex flex-col lg:flex-row h-[82vh] min-h-[650px] bg-slate-950 rounded-2xl border border-white/10 overflow-hidden text-white shadow-2xl">
      {/* 📍 BARRA LATERAL ESQUERDA: Biblioteca de Blocos & Configurações */}
      <div className="w-full lg:w-72 bg-slate-900 border-r border-white/10 flex flex-col shrink-0">
        {/* Abas Esquerda */}
        <div className="flex border-b border-white/10 bg-slate-950/50">
          <button
            type="button"
            onClick={() => setActiveTab('blocks')}
            className={`flex-1 py-3 text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'blocks' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400 hover:text-white'
            }`}
          >
            <FiLayout size={14} /> Blocos Visual
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('styles')}
            className={`flex-1 py-3 text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'styles' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400 hover:text-white'
            }`}
          >
            <FiSliders size={14} /> Fundo & Estilos
          </button>
        </div>

        <div className="p-4 overflow-y-auto flex-1 space-y-4">
          {activeTab === 'blocks' ? (
            <>
              <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2">
                Clique para Adicionar Bloco:
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => addBlock('text')}
                  className="p-3 bg-slate-800 hover:bg-slate-700 rounded-xl border border-white/10 flex flex-col items-center gap-1.5 text-xs font-semibold transition-all hover:scale-105"
                >
                  <FiType className="text-blue-400" size={18} /> Texto
                </button>
                <button
                  type="button"
                  onClick={() => addBlock('image')}
                  className="p-3 bg-slate-800 hover:bg-slate-700 rounded-xl border border-white/10 flex flex-col items-center gap-1.5 text-xs font-semibold transition-all hover:scale-105"
                >
                  <FiImage className="text-green-400" size={18} /> Imagem
                </button>
                <button
                  type="button"
                  onClick={() => addBlock('button')}
                  className="p-3 bg-slate-800 hover:bg-slate-700 rounded-xl border border-white/10 flex flex-col items-center gap-1.5 text-xs font-semibold transition-all hover:scale-105"
                >
                  <FiExternalLink className="text-purple-400" size={18} /> Botão CTA
                </button>
                <button
                  type="button"
                  onClick={() => addBlock('columns_2')}
                  className="p-3 bg-slate-800 hover:bg-slate-700 rounded-xl border border-white/10 flex flex-col items-center gap-1.5 text-xs font-semibold transition-all hover:scale-105"
                >
                  <FiColumns className="text-amber-400" size={18} /> 2 Colunas
                </button>
                <button
                  type="button"
                  onClick={() => addBlock('divider')}
                  className="p-3 bg-slate-800 hover:bg-slate-700 rounded-xl border border-white/10 flex flex-col items-center gap-1.5 text-xs font-semibold transition-all hover:scale-105"
                >
                  <FiMinus className="text-gray-400" size={18} /> Divisor
                </button>
                <button
                  type="button"
                  onClick={() => addBlock('video')}
                  className="p-3 bg-slate-800 hover:bg-slate-700 rounded-xl border border-white/10 flex flex-col items-center gap-1.5 text-xs font-semibold transition-all hover:scale-105"
                >
                  <FiVideo className="text-red-400" size={18} /> Vídeo
                </button>
              </div>

              {/* Variáveis do Lead */}
              <div className="pt-4 border-t border-white/10 space-y-2">
                <div className="text-[11px] font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1">
                  <FiZap size={12} /> Variáveis do Lead
                </div>
                <div className="flex flex-wrap gap-1">
                  {CONTACT_VARIABLES.map(v => (
                    <button
                      key={v.code}
                      type="button"
                      onClick={() => insertVariable(v.code)}
                      className="px-2 py-1 bg-slate-800 hover:bg-blue-600 text-gray-300 hover:text-white rounded-lg text-[11px] font-mono transition-all border border-white/5"
                    >
                      {v.code}
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : (
            /* Configurações de Estilo Global (Cor de Fundo) */
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1 flex items-center gap-1.5">
                  <FiDroplet className="text-red-400" /> Cor de Fundo Geral (Externa)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={globalStyles.outerBgColor}
                    onChange={e => setGlobalStyles({ ...globalStyles, outerBgColor: e.target.value })}
                    className="w-8 h-8 rounded cursor-pointer bg-transparent border-0"
                  />
                  <input
                    type="text"
                    value={globalStyles.outerBgColor}
                    onChange={e => setGlobalStyles({ ...globalStyles, outerBgColor: e.target.value })}
                    className="flex-1 px-3 py-1.5 bg-slate-800 border border-white/10 rounded-lg text-xs font-mono text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1 flex items-center gap-1.5">
                  <FiDroplet className="text-blue-400" /> Cor do Cartão Central
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={globalStyles.cardBgColor}
                    onChange={e => setGlobalStyles({ ...globalStyles, cardBgColor: e.target.value })}
                    className="w-8 h-8 rounded cursor-pointer bg-transparent border-0"
                  />
                  <input
                    type="text"
                    value={globalStyles.cardBgColor}
                    onChange={e => setGlobalStyles({ ...globalStyles, cardBgColor: e.target.value })}
                    className="flex-1 px-3 py-1.5 bg-slate-800 border border-white/10 rounded-lg text-xs font-mono text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1">
                  Largura do Conteúdo: {globalStyles.cardWidth}px
                </label>
                <input
                  type="range"
                  min="480"
                  max="800"
                  step="10"
                  value={globalStyles.cardWidth}
                  onChange={e => setGlobalStyles({ ...globalStyles, cardWidth: Number(e.target.value) })}
                  className="w-full accent-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1">
                  Espaçamento Interno (Padding): {globalStyles.padding}px
                </label>
                <input
                  type="range"
                  min="12"
                  max="48"
                  step="4"
                  value={globalStyles.padding}
                  onChange={e => setGlobalStyles({ ...globalStyles, padding: Number(e.target.value) })}
                  className="w-full accent-blue-500"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 🖥️ CANVAS CENTRAL: Área Interativa de Edição com Fundo Customizado */}
      <div 
        className="flex-1 p-6 overflow-y-auto flex justify-center transition-all"
        style={{ backgroundColor: globalStyles.outerBgColor }}
      >
        <div 
          className="w-full rounded-2xl shadow-2xl transition-all relative border border-black/10 self-start"
          style={{ 
            maxWidth: `${globalStyles.cardWidth}px`, 
            backgroundColor: globalStyles.cardBgColor,
            padding: `${globalStyles.padding}px`
          }}
        >
          {blocks.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-xl text-gray-400">
              Solte os blocos aqui para montar seu e-mail.
            </div>
          ) : (
            blocks.map((b, index) => {
              const isActive = b.id === activeBlockId;
              return (
                <div
                  key={b.id}
                  onClick={() => setActiveBlockId(b.id)}
                  className={`relative group rounded-xl transition-all cursor-pointer mb-3 p-2 border-2 ${
                    isActive ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/10' : 'border-transparent hover:border-gray-300/50'
                  }`}
                >
                  {/* Barra Flutuante de Ações do Bloco */}
                  {isActive && (
                    <div className="absolute -top-3 right-2 bg-blue-600 text-white rounded-lg px-2 py-0.5 text-[10px] font-bold flex items-center gap-1 shadow-lg z-20">
                      <button type="button" onClick={() => moveBlock(index, -1)} title="Mover para Cima"><FiArrowUp /></button>
                      <button type="button" onClick={() => moveBlock(index, 1)} title="Mover para Baixo"><FiArrowDown /></button>
                      <button type="button" onClick={() => deleteBlock(b.id)} className="text-red-300 hover:text-white" title="Excluir Bloco"><FiTrash2 /></button>
                    </div>
                  )}

                  {/* Renderização do Bloco */}
                  {b.type === 'text' && (
                    <div style={{ color: b.color, fontSize: `${b.fontSize}px`, textAlign: b.textAlign, whiteSpace: 'pre-wrap' }}>
                      {b.content}
                    </div>
                  )}

                  {b.type === 'image' && (
                    <div style={{ textAlign: b.align }}>
                      <img src={b.url} alt={b.alt} style={{ maxWidth: '100%', borderRadius: `${b.borderRadius}px`, display: 'inline-block' }} />
                    </div>
                  )}

                  {b.type === 'button' && (
                    <div style={{ textAlign: b.align }}>
                      <span style={{ display: 'inline-block', padding: '12px 24px', backgroundColor: b.bgColor, color: b.textColor, borderRadius: `${b.borderRadius}px`, fontWeight: 'bold' }}>
                        {b.text}
                      </span>
                    </div>
                  )}

                  {b.type === 'columns_2' && (
                    <div className="grid grid-cols-2 gap-4 text-slate-800 text-xs">
                      <div className="p-2 border border-dashed border-gray-300 rounded">{b.col1Text}</div>
                      <div className="p-2 border border-dashed border-gray-300 rounded">{b.col2Text}</div>
                    </div>
                  )}

                  {b.type === 'divider' && (
                    <hr style={{ border: 0, borderTop: `${b.thickness}px solid ${b.color}`, margin: `${b.margin}px 0` }} />
                  )}

                  {b.type === 'video' && (
                    <div style={{ textAlign: 'center' }}>
                      {b.url && b.url !== 'https://' && b.url !== '#' ? (
                        <div className="space-y-2">
                          <video 
                            controls 
                            className="w-full rounded-xl max-h-[360px] bg-black shadow-lg mx-auto"
                            src={b.url}
                          >
                            Seu navegador não suporta a exibição de vídeos.
                          </video>
                          <div className="text-xs text-gray-400 font-semibold flex items-center justify-center gap-1">
                            <span>▶️ {b.title || 'Vídeo sem título'}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="p-6 bg-slate-900 border-2 border-dashed border-red-500/30 text-white rounded-xl text-center font-bold text-xs flex flex-col items-center justify-center gap-2">
                          <FiVideo size={32} className="text-red-500 animate-pulse" />
                          <span className="text-sm font-bold text-white">{b.title || 'Nenhum vídeo selecionado'}</span>
                          <span className="text-[11px] text-gray-400 font-normal max-w-sm">
                            Faça o upload do vídeo (.mp4, .webm, .mov) no painel lateral à direita ou insira a URL pública.
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ⚙️ PAINEL LATERAL DIREITO: Propriedades do Bloco Selecionado */}
      <div className="w-full lg:w-72 bg-slate-900 border-l border-white/10 p-4 shrink-0 overflow-y-auto">
        <div className="text-xs font-bold uppercase tracking-wider text-blue-400 mb-3 flex items-center justify-between">
          <span>Configuração do Bloco</span>
          <span className="text-[10px] text-gray-500 font-normal">{activeBlock?.type}</span>
        </div>

        {activeBlock ? (
          <div className="space-y-4">
            {activeBlock.type === 'text' && (
              <>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Conteúdo do Texto:</label>
                  <textarea
                    rows={6}
                    value={activeBlock.content}
                    onChange={e => updateActiveBlock('content', e.target.value)}
                    className="w-full p-2 bg-slate-800 border border-white/10 rounded-lg text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Tamanho da Fonte: {activeBlock.fontSize}px</label>
                  <input
                    type="range" min="12" max="36" value={activeBlock.fontSize}
                    onChange={e => updateActiveBlock('fontSize', Number(e.target.value))}
                    className="w-full accent-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Cor do Texto:</label>
                  <input
                    type="color" value={activeBlock.color}
                    onChange={e => updateActiveBlock('color', e.target.value)}
                    className="w-8 h-8 rounded cursor-pointer bg-transparent border-0"
                  />
                </div>
              </>
            )}

            {activeBlock.type === 'button' && (
              <>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Texto do Botão:</label>
                  <input
                    type="text" value={activeBlock.text}
                    onChange={e => updateActiveBlock('text', e.target.value)}
                    className="w-full p-2 bg-slate-800 border border-white/10 rounded-lg text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Link de Destino (URL):</label>
                  <input
                    type="text" value={activeBlock.url}
                    onChange={e => updateActiveBlock('url', e.target.value)}
                    className="w-full p-2 bg-slate-800 border border-white/10 rounded-lg text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Cor do Botão:</label>
                  <input
                    type="color" value={activeBlock.bgColor}
                    onChange={e => updateActiveBlock('bgColor', e.target.value)}
                    className="w-8 h-8 rounded cursor-pointer bg-transparent border-0"
                  />
                </div>
              </>
            )}

            {activeBlock.type === 'image' && (
              <>
                <div className="space-y-2">
                  <label className="block text-xs text-gray-400">Upload de Imagem (do computador):</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files[0];
                      if (!file) return;
                      try {
                        const token = localStorage.getItem('token');
                        const clientId = activeClient?.id || localStorage.getItem('activeClientId') || localStorage.getItem('client_id') || '1';
                        const uploadFormData = new FormData();
                        uploadFormData.append('file', file);

                        toast.loading("Enviando imagem...", { id: 'img-upload' });
                        const res = await fetch(`${API_URL}/upload`, {
                          method: 'POST',
                          headers: { 
                            Authorization: `Bearer ${token}`,
                            'X-Client-ID': String(clientId)
                          },
                          body: uploadFormData
                        });

                        const data = await res.json();
                        if (!res.ok) throw new Error(data.detail || "Erro no upload.");
                        
                        updateActiveBlock('url', data.url);
                        toast.success("Imagem enviada com sucesso!", { id: 'img-upload' });
                      } catch (err) {
                        toast.error(err.message || "Erro ao enviar imagem.", { id: 'img-upload' });
                      }
                    }}
                    className="w-full text-xs text-gray-300 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer"
                  />
                </div>

                <div className="pt-2 border-t border-white/10">
                  <label className="block text-xs text-gray-400 mb-1">OU URL Pública da Imagem:</label>
                  <input
                    type="text" value={activeBlock.url}
                    onChange={e => updateActiveBlock('url', e.target.value)}
                    className="w-full p-2 bg-slate-800 border border-white/10 rounded-lg text-xs text-white"
                  />
                </div>
              </>
            )}

            {activeBlock.type === 'columns_2' && (
              <>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Texto Coluna 1:</label>
                  <textarea
                    rows={3} value={activeBlock.col1Text}
                    onChange={e => updateActiveBlock('col1Text', e.target.value)}
                    className="w-full p-2 bg-slate-800 border border-white/10 rounded-lg text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Texto Coluna 2:</label>
                  <textarea
                    rows={3} value={activeBlock.col2Text}
                    onChange={e => updateActiveBlock('col2Text', e.target.value)}
                    className="w-full p-2 bg-slate-800 border border-white/10 rounded-lg text-xs text-white"
                  />
                </div>
              </>
            )}

            {activeBlock.type === 'divider' && (
              <>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">
                    Espessura da Linha (Tamanho): {activeBlock.thickness || 1}px
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={activeBlock.thickness || 1}
                    onChange={e => updateActiveBlock('thickness', Number(e.target.value))}
                    className="w-full accent-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-1">
                    Cor da Linha do Divisor:
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={activeBlock.color || '#e2e8f0'}
                      onChange={e => updateActiveBlock('color', e.target.value)}
                      className="w-8 h-8 rounded cursor-pointer bg-transparent border-0"
                    />
                    <input
                      type="text"
                      value={activeBlock.color || '#e2e8f0'}
                      onChange={e => updateActiveBlock('color', e.target.value)}
                      className="flex-1 px-3 py-1.5 bg-slate-800 border border-white/10 rounded-lg text-xs font-mono text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-1">
                    Espaçamento Vertical (Margem): {activeBlock.margin || 20}px
                  </label>
                  <input
                    type="range"
                    min="5"
                    max="50"
                    step="5"
                    value={activeBlock.margin || 20}
                    onChange={e => updateActiveBlock('margin', Number(e.target.value))}
                    className="w-full accent-blue-500"
                  />
                </div>
              </>
            )}

            {activeBlock.type === 'video' && (
              <>
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-gray-300">Upload de Vídeo (do computador):</label>
                  <input
                    type="file"
                    accept="video/*"
                    onChange={async (e) => {
                      const file = e.target.files[0];
                      if (!file) return;
                      try {
                        const token = localStorage.getItem('token');
                        const clientId = activeClient?.id || localStorage.getItem('activeClientId') || localStorage.getItem('client_id') || '1';
                        const uploadFormData = new FormData();
                        uploadFormData.append('file', file);

                        toast.loading("Enviando vídeo para o servidor...", { id: 'video-upload' });
                        const res = await fetch(`${API_URL}/upload`, {
                          method: 'POST',
                          headers: { 
                            Authorization: `Bearer ${token}`,
                            'X-Client-ID': String(clientId)
                          },
                          body: uploadFormData
                        });

                        const data = await res.json();
                        if (!res.ok) throw new Error(data.detail || "Erro no upload do vídeo.");
                        
                        updateActiveBlock('url', data.url);
                        if (!activeBlock.title || activeBlock.title === 'Assistir ao Vídeo Exclusivo') {
                          updateActiveBlock('title', file.name);
                        }
                        toast.success("Vídeo enviado e player atualizado!", { id: 'video-upload' });
                      } catch (err) {
                        toast.error(err.message || "Erro ao enviar vídeo.", { id: 'video-upload' });
                      }
                    }}
                    className="w-full text-xs text-gray-300 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-red-600 file:text-white hover:file:bg-red-700 cursor-pointer"
                  />
                </div>

                <div className="pt-2 border-t border-white/10">
                  <label className="block text-xs text-gray-400 mb-1">OU URL Pública / Link do Vídeo:</label>
                  <input
                    type="text"
                    value={activeBlock.url || ''}
                    onChange={e => updateActiveBlock('url', e.target.value)}
                    placeholder="https://exemplo.com/meu-video.mp4"
                    className="w-full p-2 bg-slate-800 border border-white/10 rounded-lg text-xs text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-1">Título / Legenda do Vídeo:</label>
                  <input
                    type="text"
                    value={activeBlock.title || ''}
                    onChange={e => updateActiveBlock('title', e.target.value)}
                    placeholder="Ex: Assistir ao Vídeo Exclusivo"
                    className="w-full p-2 bg-slate-800 border border-white/10 rounded-lg text-xs text-white"
                  />
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="text-xs text-gray-500 text-center py-8">
            Clique em qualquer bloco do e-mail para editar suas propriedades.
          </div>
        )}
      </div>
    </div>
  );
}
