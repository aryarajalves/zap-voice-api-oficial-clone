import React from 'react';
import { toast } from 'react-hot-toast';
import { API_URL } from '../../../../../config';
import { useClient } from '../../../../../contexts/ClientContext';

export default function EditorRightSidebar({
  activeBlock,
  onUpdateActiveBlock
}) {
  const { activeClient } = useClient();

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
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
      
      onUpdateActiveBlock('url', data.url);
      toast.success("Imagem enviada com sucesso!", { id: 'img-upload' });
    } catch (err) {
      toast.error(err.message || "Erro ao enviar imagem.", { id: 'img-upload' });
    }
  };

  const handleVideoUpload = async (e) => {
    const file = e.target.files?.[0];
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
      
      onUpdateActiveBlock('url', data.url);
      if (!activeBlock.title || activeBlock.title === 'Assistir ao Vídeo Exclusivo') {
        onUpdateActiveBlock('title', file.name);
      }
      toast.success("Vídeo enviado e player atualizado!", { id: 'video-upload' });
    } catch (err) {
      toast.error(err.message || "Erro ao enviar vídeo.", { id: 'video-upload' });
    }
  };

  return (
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
                  onChange={e => onUpdateActiveBlock('content', e.target.value)}
                  className="w-full p-2 bg-slate-800 border border-white/10 rounded-lg text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Tamanho da Fonte: {activeBlock.fontSize}px</label>
                <input
                  type="range" min="12" max="36" value={activeBlock.fontSize}
                  onChange={e => onUpdateActiveBlock('fontSize', Number(e.target.value))}
                  className="w-full accent-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Cor do Texto:</label>
                <input
                  type="color" value={activeBlock.color}
                  onChange={e => onUpdateActiveBlock('color', e.target.value)}
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
                  onChange={e => onUpdateActiveBlock('text', e.target.value)}
                  className="w-full p-2 bg-slate-800 border border-white/10 rounded-lg text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Link de Destino (URL):</label>
                <input
                  type="text" value={activeBlock.url}
                  onChange={e => onUpdateActiveBlock('url', e.target.value)}
                  className="w-full p-2 bg-slate-800 border border-white/10 rounded-lg text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Cor do Botão:</label>
                <input
                  type="color" value={activeBlock.bgColor}
                  onChange={e => onUpdateActiveBlock('bgColor', e.target.value)}
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
                  onChange={handleImageUpload}
                  className="w-full text-xs text-gray-300 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer"
                />
              </div>

              <div className="pt-2 border-t border-white/10">
                <label className="block text-xs text-gray-400 mb-1">OU URL Pública da Imagem:</label>
                <input
                  type="text" value={activeBlock.url}
                  onChange={e => onUpdateActiveBlock('url', e.target.value)}
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
                  onChange={e => onUpdateActiveBlock('col1Text', e.target.value)}
                  className="w-full p-2 bg-slate-800 border border-white/10 rounded-lg text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Texto Coluna 2:</label>
                <textarea
                  rows={3} value={activeBlock.col2Text}
                  onChange={e => onUpdateActiveBlock('col2Text', e.target.value)}
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
                  onChange={e => onUpdateActiveBlock('thickness', Number(e.target.value))}
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
                    onChange={e => onUpdateActiveBlock('color', e.target.value)}
                    className="w-8 h-8 rounded cursor-pointer bg-transparent border-0"
                  />
                  <input
                    type="text"
                    value={activeBlock.color || '#e2e8f0'}
                    onChange={e => onUpdateActiveBlock('color', e.target.value)}
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
                  onChange={e => onUpdateActiveBlock('margin', Number(e.target.value))}
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
                  onChange={handleVideoUpload}
                  className="w-full text-xs text-gray-300 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-red-600 file:text-white hover:file:bg-red-700 cursor-pointer"
                />
              </div>

              <div className="pt-2 border-t border-white/10">
                <label className="block text-xs text-gray-400 mb-1">OU URL Pública / Link do Vídeo:</label>
                <input
                  type="text"
                  value={activeBlock.url || ''}
                  onChange={e => onUpdateActiveBlock('url', e.target.value)}
                  placeholder="https://exemplo.com/meu-video.mp4"
                  className="w-full p-2 bg-slate-800 border border-white/10 rounded-lg text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1">Título / Legenda do Vídeo:</label>
                <input
                  type="text"
                  value={activeBlock.title || ''}
                  onChange={e => onUpdateActiveBlock('title', e.target.value)}
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
  );
}
