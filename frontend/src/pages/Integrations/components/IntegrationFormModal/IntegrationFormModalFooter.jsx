import React from 'react';
import { FiCheckCircle, FiSettings } from 'react-icons/fi';
import { TABS } from './constants';

export default function IntegrationFormModalFooter({
  activeTab,
  setActiveTab,
  onClose,
  onSave,
  isSaving
}) {
  return (
    <div className="p-6 border-t border-gray-100 dark:border-white/5 flex items-center justify-between bg-white dark:bg-[#0f172a]/80 backdrop-blur-md">
      {/* Navegação entre abas no footer */}
      <div className="flex gap-2">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`w-2 h-2 rounded-full transition-all cursor-pointer ${
              activeTab === tab.id ? 'bg-blue-500 w-5' : 'bg-gray-300 dark:bg-white/20 hover:bg-gray-400 dark:hover:bg-white/40'
            }`}
            title={`Ir para aba ${tab.label}`}
          />
        ))}
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onClose}
          className="px-6 py-3 text-[10px] font-black text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-all uppercase tracking-widest cursor-pointer"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={isSaving}
          className="bg-blue-600 hover:bg-blue-700 text-white px-10 py-3.5 rounded-xl font-black transition-all active:scale-95 flex items-center gap-2 shadow-xl shadow-blue-600/20 disabled:opacity-50 uppercase tracking-widest text-xs cursor-pointer"
        >
          {isSaving ? <FiSettings className="animate-spin" /> : <FiCheckCircle size={16} />}
          {isSaving ? 'Salvando...' : 'Salvar Alterações'}
        </button>
      </div>
    </div>
  );
}
