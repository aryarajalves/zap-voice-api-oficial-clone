import React from 'react';
import { FiDatabase } from 'react-icons/fi';

export default function LoadingOverlay({ loading }) {
  if (!loading) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center backdrop-blur-md bg-black/40 animate-in fade-in duration-300">
      <div className="bg-gray-900/90 border border-white/10 p-8 rounded-3xl shadow-2xl flex flex-col items-center gap-6 max-w-sm w-full mx-4 relative overflow-hidden">
        {/* Neon Glow Effect */}
        <div className="absolute -top-10 -left-10 w-32 h-32 bg-blue-500/20 blur-3xl rounded-full animate-pulse"></div>
        <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-purple-500/20 blur-3xl rounded-full animate-pulse"></div>

        <div className="relative">
          {/* External ring with spin */}
          <div className="w-20 h-20 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
          
          {/* Center icon */}
          <div className="absolute inset-0 flex items-center justify-center">
                    <p className="mt-4 text-sm font-medium text-gray-500 animate-pulse">ZapVoice v3.2.8</p>
          </div>
        </div>

        <div className="text-center space-y-2 relative">
          <h3 className="text-xl font-bold text-white tracking-tight">Sincronizando Contatos</h3>
          <p className="text-gray-400 text-sm leading-relaxed">
            Aguarde enquanto carregamos seus leads diretamente do banco de dados...
          </p>
        </div>

        {/* Loading Bar Animation */}
        <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden relative">
          <div className="absolute inset-0 h-full bg-gradient-to-r from-blue-600 to-purple-600 w-full rounded-full animate-loading-bar"></div>
        </div>

        <div className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">
            ZapVoice Engine v3.2.7
        </div>
      </div>
    </div>
  );
}
