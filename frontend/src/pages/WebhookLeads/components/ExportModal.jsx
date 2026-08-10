import React from 'react';
import { createPortal } from 'react-dom';
import { FiDownload, FiCheckCircle, FiAlertCircle } from 'react-icons/fi';

export default function ExportModal({
  isOpen,
  onClose,
  isExporting,
  exportStatus, // 'loading' | 'success' | 'error'
  exportError,
  count
}) {
  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[30000] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-gray-900 border border-gray-800 rounded-3xl shadow-2xl px-8 py-7 flex flex-col items-center gap-5 max-w-md w-full mx-4 relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow de fundo */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Estado: Carregando / Exportando */}
        {exportStatus === 'loading' && (
          <>
            <div className="relative w-16 h-16 mt-2">
              <div className="w-16 h-16 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <FiDownload size={22} className="text-emerald-400 animate-bounce" />
              </div>
            </div>

            <div className="text-center space-y-1.5 z-10">
              <h3 className="text-white font-bold text-lg">Exportando Contatos...</h3>
              <p className="text-gray-400 text-xs leading-relaxed">
                Estamos preparando a planilha CSV com {count ? `${count.toLocaleString('pt-BR')} ` : ''}contato(s).
                <br />
                Por favor, aguarde e não feche a página.
              </p>
            </div>

            <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden mt-1 z-10">
              <div className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-300 rounded-full animate-pulse w-full" />
            </div>
          </>
        )}

        {/* Estado: Sucesso */}
        {exportStatus === 'success' && (
          <>
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mt-2 z-10">
              <FiCheckCircle size={32} />
            </div>

            <div className="text-center space-y-1.5 z-10">
              <h3 className="text-white font-bold text-lg">Exportação Concluída!</h3>
              <p className="text-gray-400 text-xs leading-relaxed">
                O arquivo CSV com seus contatos foi baixado com sucesso no seu computador.
              </p>
            </div>

            <div className="w-full mt-2 z-10">
              <button
                type="button"
                onClick={onClose}
                className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-xl text-sm transition-all shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2"
              >
                Fechar
              </button>
            </div>
          </>
        )}

        {/* Estado: Erro */}
        {exportStatus === 'error' && (
          <>
            <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 mt-2 z-10">
              <FiAlertCircle size={32} />
            </div>

            <div className="text-center space-y-1.5 z-10">
              <h3 className="text-white font-bold text-lg">Falha na Exportação</h3>
              <p className="text-gray-400 text-xs leading-relaxed">
                {exportError || 'Ocorreu um erro ao gerar o arquivo CSV. Tente novamente mais tarde.'}
              </p>
            </div>

            <div className="w-full mt-2 z-10">
              <button
                type="button"
                onClick={onClose}
                className="w-full py-3 px-4 bg-gray-800 hover:bg-gray-700 text-white font-medium rounded-xl text-sm transition-all border border-gray-700 flex items-center justify-center gap-2"
              >
                Fechar
              </button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  );
}
