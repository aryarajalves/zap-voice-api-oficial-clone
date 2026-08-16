import React from 'react';
import { createPortal } from 'react-dom';
import { FiX, FiCheckCircle, FiCopy, FiRefreshCw } from 'react-icons/fi';
import { toast } from 'react-hot-toast';

export const MaximizedJsonModal = ({ isOpen, data, onClose }) => {
  const [copied, setCopied] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');

  if (!isOpen || !data) return null;

  const rawJson = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
  const lines = rawJson.split('\n');

  // Syntax highlighting for a single JSON line
  const highlightLine = (line) => {
    // Escape HTML
    let safe = line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    
    // Replace JSON tokens with styled spans
    return safe.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
      if (/^"/.test(match)) {
        if (/:$/.test(match)) {
          return `<span class="text-sky-300 font-semibold">${match}</span>`; // Key
        } else {
          return `<span class="text-emerald-300 font-normal">${match}</span>`; // String value
        }
      } else if (/true|false/.test(match)) {
        return `<span class="text-purple-400 font-bold">${match}</span>`; // Boolean
      } else if (/null/.test(match)) {
        return `<span class="text-rose-400 italic">${match}</span>`; // Null
      } else {
        return `<span class="text-amber-400 font-semibold">${match}</span>`; // Number
      }
    });
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(rawJson);
    setCopied(true);
    toast.success("JSON copiado para a área de transferência!");
    setTimeout(() => setCopied(false), 2000);
  };

  const keysCount = typeof data === 'object' && data !== null ? Object.keys(data).length : 0;
  const jsonSizeKb = (new Blob([rawJson]).size / 1024).toFixed(1);

  return createPortal(
    <div className="fixed inset-0 z-[15000] flex items-center justify-center p-4 md:p-8 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
      <div 
        className="bg-[#0b101e] border border-white/10 rounded-3xl w-full max-w-5xl h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex flex-wrap justify-between items-center bg-[#070b14]/90 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 text-base font-black">
              { }
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h3 className="text-base font-bold text-white tracking-wide">Payload Completo</h3>
                <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400">
                  JSON
                </span>
              </div>
              <p className="text-[11px] text-gray-400 mt-0.5 flex items-center gap-2">
                <span>{lines.length} linhas</span>
                <span>•</span>
                <span>{keysCount} campos raiz</span>
                <span>•</span>
                <span>{jsonSizeKb} KB</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Search Input */}
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar no JSON..."
                className="w-44 md:w-56 bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder:text-gray-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Copy Button */}
            <button
              onClick={handleCopy}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all active:scale-95 shadow-md ${
                copied 
                  ? 'bg-emerald-600 text-white shadow-emerald-600/20' 
                  : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/20'
              }`}
            >
              {copied ? <FiCheckCircle size={14} /> : <FiCopy size={14} />}
              {copied ? 'Copiado!' : 'Copiar JSON'}
            </button>

            {/* Close Icon Button */}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-all ml-1"
              title="Fechar"
            >
              <FiX size={18} />
            </button>
          </div>
        </div>

        {/* JSON Code Viewer with Unified Scroll and Sticky Line Numbers */}
        <div className="flex-1 overflow-auto bg-[#070b14] custom-scrollbar">
          <div className="min-w-max flex text-xs md:text-sm font-mono leading-6">
            {/* Sticky Gutter with line numbers */}
            <div className="sticky left-0 z-10 py-4 pl-4 pr-3 select-none text-right bg-[#050810] border-r border-white/10 text-gray-600 flex flex-col font-mono text-[11px] md:text-xs">
              {lines.map((_, i) => (
                <span key={i} className="leading-6">{i + 1}</span>
              ))}
            </div>

            {/* Code content */}
            <div className="py-4 px-6 flex-1">
              {lines.map((line, i) => {
                const isMatch = searchQuery && line.toLowerCase().includes(searchQuery.toLowerCase());
                return (
                  <div 
                    key={i} 
                    className={`leading-6 whitespace-pre ${isMatch ? 'bg-yellow-500/20 px-2 rounded' : ''}`}
                    dangerouslySetInnerHTML={{ __html: highlightLine(line) }}
                  />
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-white/10 bg-[#070b14]/90 flex justify-between items-center">
          <div className="flex items-center gap-4 text-[11px] text-gray-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-sky-400 inline-block"></span> Chaves
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-400 inline-block"></span> Textos
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-amber-400 inline-block"></span> Números
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-purple-400 inline-block"></span> Booleanos
            </span>
          </div>

          <button
            onClick={onClose}
            className="px-6 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-bold tracking-wider uppercase border border-white/10 transition-all active:scale-95"
          >
            Fechar Visualização
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export const EditJsonModal = ({ isOpen, data, onSave, onClose, isSaving }) => {
  const [editedData, setEditedData] = React.useState(data);

  React.useEffect(() => {
    setEditedData(data);
  }, [data]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[15000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-[#1e293b] border border-white/5 rounded-[2.5rem] w-full max-w-4xl h-[70vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-[#0f172a]/50">
          <h3 className="text-xl font-bold text-white uppercase tracking-widest">Editar Payload de Simulação</h3>
        </div>
        <div className="flex-1 overflow-hidden p-6">
          <textarea
            value={editedData}
            onChange={(e) => setEditedData(e.target.value)}
            className="w-full h-full bg-[#0b1120] border border-white/10 rounded-2xl p-6 text-sm font-mono text-emerald-400 outline-none focus:ring-2 focus:ring-blue-500/30 transition-all resize-none custom-scrollbar shadow-inner"
            placeholder="Cole seu JSON aqui..."
          />
        </div>
        <div className="p-6 border-t border-white/5 bg-[#0f172a]/30 flex justify-end gap-4">
          <button onClick={onClose} className="px-6 py-3 text-xs font-bold text-gray-500 hover:text-gray-300 uppercase tracking-widest transition-all">Cancelar</button>
          <button
            onClick={() => onSave(editedData)}
            disabled={isSaving}
            className="bg-blue-600 hover:bg-blue-700 text-white px-10 py-3 rounded-xl font-black transition-all active:scale-95 flex items-center gap-3 shadow-lg shadow-blue-600/20 disabled:opacity-50 uppercase tracking-widest text-xs"
          >
            {isSaving ? <FiRefreshCw size={18} className="animate-spin" /> : <FiCheckCircle size={18} />}
            {isSaving ? 'Salvando...' : 'Salvar Alterações'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
