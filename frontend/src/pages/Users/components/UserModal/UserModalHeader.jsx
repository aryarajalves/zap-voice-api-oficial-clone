import React from 'react';
import { FiEdit2, FiUserPlus, FiX } from 'react-icons/fi';

const UserModalHeader = ({ editingUser, onClose }) => {
  return (
    <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-900/30 flex-shrink-0">
      <h3 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
        {editingUser ? <FiEdit2 className="text-blue-600" /> : <FiUserPlus className="text-blue-600" />}
        {editingUser ? "Editar Usuário" : "Convidar Novo Usuário"}
      </h3>
      <button 
        type="button"
        onClick={onClose} 
        aria-label="Fechar"
        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors cursor-pointer"
      >
        <FiX size={20} />
      </button>
    </div>
  );
};

export default UserModalHeader;
