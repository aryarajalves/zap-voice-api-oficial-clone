import React from 'react';
import { FiMessageSquare } from 'react-icons/fi';

export default function ViewMessageModalHeader({ isEditing }) {
  return (
    <div className="p-8 border-b border-white/5 bg-slate-800/40 flex items-center justify-between">
      <div>
        <h3 className="text-2xl font-black text-white flex items-center gap-3">
          <FiMessageSquare className="text-purple-400" />
          {isEditing ? 'Editar Conteúdo do Envio' : 'Conteúdo do Envio'}
        </h3>
        <p className="text-slate-400 text-xs mt-1">
          {isEditing 
            ? 'Altere o template e preencha as variáveis dinamicamente.' 
            : 'Esta é a mensagem que será disparada automaticamente para os contatos.'}
        </p>
      </div>
    </div>
  );
}
