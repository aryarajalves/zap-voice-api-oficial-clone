import React from 'react';
import { FiArrowUp, FiArrowDown, FiTrash2, FiVideo } from 'react-icons/fi';

export default function EditorCanvas({
  blocks,
  activeBlockId,
  setActiveBlockId,
  onMoveBlock,
  onDeleteBlock,
  globalStyles
}) {
  return (
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
                    <button type="button" onClick={(e) => { e.stopPropagation(); onMoveBlock(index, -1); }} title="Mover para Cima">
                      <FiArrowUp />
                    </button>
                    <button type="button" onClick={(e) => { e.stopPropagation(); onMoveBlock(index, 1); }} title="Mover para Baixo">
                      <FiArrowDown />
                    </button>
                    <button type="button" onClick={(e) => { e.stopPropagation(); onDeleteBlock(b.id); }} className="text-red-300 hover:text-white" title="Excluir Bloco">
                      <FiTrash2 />
                    </button>
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
  );
}
