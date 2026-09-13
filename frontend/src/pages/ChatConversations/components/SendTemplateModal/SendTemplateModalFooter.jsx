import React from 'react';

export default function SendTemplateModalFooter({
  selectedTemplate,
  windowOpen,
  onClose,
  onSend
}) {
  return (
    <div className="px-6 py-4 border-t border-white/5 bg-[#0a0f1d] flex items-center justify-between shrink-0">
      <div>
        {selectedTemplate && (
          windowOpen ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-[11px] font-medium text-green-400">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              Mensagem Gratuita (Janela Aberta)
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-[11px] font-medium text-yellow-400">
              <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
              Custo de HSM (Janela Fechada)
            </span>
          )
        )}
      </div>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 border border-white/10 text-white rounded-xl hover:bg-white/5 transition-colors text-sm font-medium cursor-pointer"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={onSend}
          disabled={!selectedTemplate}
          className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:pointer-events-none text-white rounded-xl transition-all text-sm font-medium shadow-lg shadow-blue-600/10 cursor-pointer"
        >
          Enviar Template
        </button>
      </div>
    </div>
  );
}
