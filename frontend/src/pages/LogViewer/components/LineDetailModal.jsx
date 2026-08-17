import React from 'react';
import { FiX, FiCopy, FiTrash2 } from 'react-icons/fi';
import { LEVEL_COLORS } from '../utils/logHelpers';

export default function LineDetailModal({ line, onClose, onCopy, onDelete }) {
  if (!line) return null;
  const colors = LEVEL_COLORS[line.level] || { bg: '', text: 'text-gray-300', badge: '' };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-[#1e293b] rounded-2xl border border-gray-100 dark:border-white/10 shadow-2xl w-full max-w-3xl max-h-[80vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-5 py-3 bg-gray-50 dark:bg-white/[0.03] border-b border-gray-100 dark:border-white/5 flex items-center gap-2">
          <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Linha {line.idx + 1}</span>
          {line.level && (
            <span className={`px-1.5 py-0.5 rounded text-[9px] font-black flex-shrink-0 ${colors.badge}`}>{line.level}</span>
          )}
          {line.time && <span className="text-xs text-gray-400">{line.time}</span>}
          <button type="button" onClick={onClose} className="ml-auto p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-all">
            <FiX size={16} />
          </button>
        </div>
        <div className="p-5 overflow-auto flex-1">
          <pre className={`whitespace-pre-wrap break-all font-mono text-xs leading-relaxed ${colors.text}`}>{line.raw}</pre>
        </div>
        <div className="px-5 py-3 border-t border-gray-100 dark:border-white/5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => onCopy(line.raw)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-all"
          >
            <FiCopy size={12} /> Copiar
          </button>
          <button
            type="button"
            onClick={() => onDelete(line)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-red-400 hover:text-white hover:bg-red-500/20 rounded-lg transition-all"
          >
            <FiTrash2 size={12} /> Apagar este log
          </button>
        </div>
      </div>
    </div>
  );
}
