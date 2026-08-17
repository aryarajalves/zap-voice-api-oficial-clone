import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-hot-toast';

// Reexportação modular para compatibilidade total
export { exportBlocksToHtml, parseHtmlToBlocks, CONTACT_VARIABLES } from './components/editor/utils/emailHtmlParsers';

import { exportBlocksToHtml, parseHtmlToBlocks } from './components/editor/utils/emailHtmlParsers';
import EditorLeftSidebar from './components/editor/components/EditorLeftSidebar';
import EditorCanvas from './components/editor/components/EditorCanvas';
import EditorRightSidebar from './components/editor/components/EditorRightSidebar';

export default function EmailDragDropEditor({ initialHtml, onChangeHtml }) {
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
  const [activeBlockId, setActiveBlockId] = useState('b-1');
  const [activeTab, setActiveTab] = useState('blocks'); // 'blocks' | 'styles'

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
      <EditorLeftSidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onAddBlock={addBlock}
        onInsertVariable={insertVariable}
        globalStyles={globalStyles}
        setGlobalStyles={setGlobalStyles}
      />

      {/* 🖥️ CANVAS CENTRAL: Área Interativa de Edição com Fundo Customizado */}
      <EditorCanvas
        blocks={blocks}
        activeBlockId={activeBlockId}
        setActiveBlockId={setActiveBlockId}
        onMoveBlock={moveBlock}
        onDeleteBlock={deleteBlock}
        globalStyles={globalStyles}
      />

      {/* ⚙️ PAINEL LATERAL DIREITO: Propriedades do Bloco Selecionado */}
      <EditorRightSidebar
        activeBlock={activeBlock}
        onUpdateActiveBlock={updateActiveBlock}
      />
    </div>
  );
}
