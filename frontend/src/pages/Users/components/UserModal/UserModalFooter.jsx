import React from 'react';

const UserModalFooter = ({
  editingUser,
  isGenerating,
  onClose
}) => {
  return (
    <div className="flex gap-3 pt-4 flex-shrink-0">
      <button
        type="button"
        onClick={onClose}
        className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 font-bold hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors cursor-pointer"
      >
        Cancelar
      </button>
      <button
        type="submit"
        disabled={isGenerating}
        className="flex-1 px-4 py-2 bg-blue-600 text-white font-bold hover:bg-blue-700 rounded-lg transition-all shadow-lg shadow-blue-500/30 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
      >
        {editingUser ? "Salvar Alterações" : "Gerar Link de Convite"}
      </button>
    </div>
  );
};

export default UserModalFooter;
