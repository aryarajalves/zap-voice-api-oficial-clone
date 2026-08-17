import React, { useState } from 'react';
import { FiGlobe, FiCopy, FiCheck, FiExternalLink } from 'react-icons/fi';
import toast from 'react-hot-toast';

export default function CheckoutPresellHeader({ config, getPublicUrl }) {
  const [copiedLink, setCopiedLink] = useState(false);

  const copyPublicLink = () => {
    const url = getPublicUrl();
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    toast.success('Link copiado para a área de transferência!');
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 dark:border-gray-800 pb-6">
      <div>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
            <FiGlobe size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Checkout Prepopulado</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Configure sua landing page de aplicação pré-populada e monitore os leads capturados</p>
          </div>
        </div>
      </div>

      {/* Link Rápido */}
      {config.slug && (
        <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 p-2.5 rounded-xl">
          <span className="text-xs font-mono text-blue-700 dark:text-blue-300 truncate max-w-xs">{getPublicUrl()}</span>
          <button
            onClick={copyPublicLink}
            className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
            title="Copiar Link"
          >
            {copiedLink ? <FiCheck size={14} /> : <FiCopy size={14} />}
            {copiedLink ? 'Copiado!' : 'Copiar'}
          </button>
          <a
            href={getPublicUrl()}
            target="_blank"
            rel="noreferrer"
            className="p-2 bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-700 transition-all text-xs cursor-pointer"
            title="Testar em nova aba"
          >
            <FiExternalLink size={14} />
          </a>
        </div>
      )}
    </div>
  );
}
