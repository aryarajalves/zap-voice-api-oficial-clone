import React, { useState } from 'react';
import { FiGlobe, FiCopy, FiCheck, FiExternalLink } from 'react-icons/fi';
import toast from 'react-hot-toast';

export default function CapturePageHeader({ publicUrl }) {
  const [copied, setCopied] = useState(false);

  const copyPublicLink = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    toast.success('Link público copiado!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#0d1520] p-6 rounded-2xl border border-gray-800 shadow-xl">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-2xl flex items-center justify-center text-2xl">
          <FiGlobe />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            Página de Captura Personalizada
            <span className="text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full uppercase tracking-wider font-semibold">
              Neon Vibe
            </span>
          </h1>
          <p className="text-xs text-gray-400">
            Configure os textos da sua página de captura e da página de obrigado com link do WhatsApp.
          </p>
        </div>
      </div>

      {/* Link Público */}
      <div className="flex items-center gap-2 bg-[#060a0f] p-2.5 rounded-xl border border-gray-800">
        <span className="text-xs text-gray-400 truncate max-w-xs">{publicUrl}</span>
        <button
          onClick={copyPublicLink}
          className="p-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg text-sm transition-all cursor-pointer"
          title="Copiar Link Público"
        >
          {copied ? <FiCheck /> : <FiCopy />}
        </button>
        <a
          href={publicUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="p-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm transition-all cursor-pointer"
          title="Abrir Página Pública"
        >
          <FiExternalLink />
        </a>
      </div>
    </div>
  );
}
