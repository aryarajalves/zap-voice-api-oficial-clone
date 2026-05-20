import React from 'react';
import { createPortal } from 'react-dom';
import { FiX, FiCheckCircle, FiShare2, FiSettings } from 'react-icons/fi';
import MappingsConfig from './MappingsConfig/index';

const IntegrationFormModal = ({ 
  isOpen, 
  onClose, 
  formData, 
  setFormData, 
  isSaving, 
  onSave, 
  editingIntegration, 
  templates, 
  chatwootLabels,
  setIsMappingGuideOpen
}) => {
  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 md:p-6 animate-in fade-in duration-500">
      <div className="bg-white dark:bg-[#1e293b] rounded-3xl w-full max-w-6xl max-h-[90vh] flex flex-col shadow-[0_0_100px_rgba(59,130,246,0.15)] overflow-hidden border border-gray-100 dark:border-white/5 animate-in zoom-in-95 duration-300">
        {/* Header Profissional */}
        <div className="p-6 border-b border-gray-100 dark:border-white/5 flex justify-between items-center bg-white/50 dark:bg-[#0f172a]/50 backdrop-blur-md">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-xl shadow-blue-600/20">
              <FiSettings size={22} />
            </div>
            <div>
              <h3 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">
                {editingIntegration ? 'Editar Integração' : 'Nova Integração'}
              </h3>
              <p className="text-[10px] text-gray-500 font-medium mt-0.5 uppercase tracking-widest">Automação para {formData.platform}</p>
            </div>
          </div>
          {/* O botão X de fechar foi removido para evitar ações de fechamento acidentais, conforme solicitado pelo usuário */}
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar bg-gray-50/30 dark:bg-transparent">
          <form className="space-y-8 max-w-5xl mx-auto">
            {/* Seção 1: Identificação */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] px-1">Nome da Integração (Interno)</label>
                <div className="relative group">
                  <FiSettings className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-white dark:bg-[#0b1120] border border-gray-100 dark:border-white/5 rounded-xl pl-12 pr-4 py-3 text-xs font-bold text-gray-900 dark:text-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none shadow-inner"
                    placeholder="Ex: Hotmart - Produto VIP"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] px-1">Slug Personalizado (URL Amigável)</label>
                <div className="relative group">
                  <FiShare2 className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                  <input
                    type="text"
                    value={formData.custom_slug || ''}
                    onChange={(e) => setFormData({ ...formData, custom_slug: e.target.value })}
                    className="w-full bg-white dark:bg-[#0b1120] border border-gray-100 dark:border-white/5 rounded-xl pl-12 pr-4 py-3 text-xs font-bold text-gray-900 dark:text-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none shadow-inner"
                    placeholder="Ex: vendas-vips (Opcional)"
                  />
                </div>
              </div>
 
              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] px-1">Plataforma de Origem</label>
                <select
                  value={formData.platform}
                  onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
                  className="w-full bg-white dark:bg-[#0b1120] border border-gray-100 dark:border-white/5 rounded-xl px-4 py-3 text-xs font-bold text-gray-900 dark:text-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none shadow-inner cursor-pointer"
                >
                  <option value="hotmart">Hotmart</option>
                  <option value="kiwify">Kiwify</option>
                  <option value="eduzz">Eduzz</option>
                  <option value="elementor">Elementor / Webhook Genérico</option>
                  <option value="outra">Outra Plataforma</option>
                </select>
              </div>
            </div>

            {/* Seção 3: Gatilhos e Mapeamentos */}
            <MappingsConfig 
              formData={formData} 
              setFormData={setFormData} 
              templates={templates} 
              chatwootLabels={chatwootLabels}
              setIsMappingGuideOpen={setIsMappingGuideOpen}
            />
          </form>
        </div>

        {/* Footer com Ações */}
        <div className="p-6 border-t border-gray-100 dark:border-white/5 flex justify-end gap-3 bg-white dark:bg-[#0f172a]/80 backdrop-blur-md">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-3 text-[10px] font-black text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-all uppercase tracking-widest"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={isSaving}
            className="bg-blue-600 hover:bg-blue-700 text-white px-10 py-3.5 rounded-xl font-black transition-all active:scale-95 flex items-center gap-2 shadow-xl shadow-blue-600/20 disabled:opacity-50 uppercase tracking-widest text-xs"
          >
            {isSaving ? <FiSettings className="animate-spin" /> : <FiCheckCircle size={16} />}
            {isSaving ? 'Salvando...' : 'Salvar Alterações'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default IntegrationFormModal;
