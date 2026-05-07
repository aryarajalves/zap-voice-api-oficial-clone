import React from 'react';
import { createPortal } from 'react-dom';
import { FiX, FiCheckCircle, FiCopy, FiRefreshCw } from 'react-icons/fi';

export const MaximizedJsonModal = ({ isOpen, data, onClose, toast }) => {
  if (!isOpen || !data) return null;

  return createPortal(
    <div className="fixed inset-0 z-[15000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-[#1e293b] border border-white/5 rounded-[2.5rem] w-full max-w-5xl h-[80vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-[#0f172a]/50">
          <h3 className="text-xl font-bold text-white uppercase tracking-widest">Payload Completo</h3>
          <div className="flex gap-4">
            <button
              onClick={() => {
                navigator.clipboard.writeText(JSON.stringify(data, null, 2));
                toast.success("JSON copiado!");
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-blue-700 transition-all"
            >
              <FiCopy size={14} /> Copiar JSON
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-8 custom-scrollbar">
          <pre className="text-sm font-mono text-blue-400 leading-relaxed">
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
        <div className="p-6 border-t border-white/5 bg-[#0f172a]/30 flex justify-end">
          <button
            onClick={onClose}
            className="px-8 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl text-[10px] font-black tracking-widest uppercase border border-white/10 transition-all active:scale-95"
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
