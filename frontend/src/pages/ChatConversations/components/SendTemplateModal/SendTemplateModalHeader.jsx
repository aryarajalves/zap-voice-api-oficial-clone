import React from 'react';
import { FiX, FiBookOpen } from 'react-icons/fi';

export default function SendTemplateModalHeader({ onClose }) {
  return (
    <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 shrink-0">
      <div className="flex items-center gap-2 text-white">
        <FiBookOpen className="text-blue-500" size={20} />
        <h3 className="text-base font-semibold">Enviar Template WhatsApp</h3>
      </div>
      <button
        type="button"
        onClick={onClose}
        className="text-gray-400 hover:text-white transition-colors cursor-pointer"
        title="Fechar"
      >
        <FiX size={20} />
      </button>
    </div>
  );
}
