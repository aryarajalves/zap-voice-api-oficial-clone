import React from 'react';
import { createPortal } from 'react-dom';
import { FiX, FiCheckCircle, FiShare2, FiSettings, FiPlus, FiTrash2, FiMaximize2 } from 'react-icons/fi';
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

            {/* Seção 2: Filtro de Produto */}
            <div className="p-8 bg-blue-500/5 dark:bg-blue-600/[0.03] border border-blue-500/10 dark:border-blue-500/20 rounded-[2.5rem] space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-500">
                    <FiSettings size={20} />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-blue-600 dark:text-blue-400 uppercase tracking-tight">Filtro por IDs de Produto (Opcional)</h4>
                    <p className="text-[10px] text-gray-500 font-medium">Processe apenas webhooks de produtos específicos</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer scale-110">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={formData.product_filtering}
                    onChange={(e) => setFormData({ ...formData, product_filtering: e.target.checked })}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-[#0b1120] peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-white/10 peer-checked:bg-blue-600 shadow-sm"></div>
                </label>
              </div>

              {formData.product_filtering && (
                <div className="space-y-4 pt-2 animate-in slide-in-from-top-4 duration-500">
                  <div className="flex flex-wrap gap-2">
                    {formData.product_whitelist.map((prodId, idx) => (
                      <span key={idx} className="inline-flex items-center gap-2 bg-white dark:bg-[#0b1120] border border-blue-500/20 text-blue-600 dark:text-blue-400 px-4 py-2 rounded-xl text-xs font-black shadow-inner">
                        {prodId}
                        <button
                          type="button"
                          onClick={() => {
                            const newList = [...formData.product_whitelist];
                            newList.splice(idx, 1);
                            setFormData({ ...formData, product_whitelist: newList });
                          }}
                          className="hover:text-red-500 transition-colors"
                        >
                          <FiX size={14} />
                        </button>
                      </span>
                    ))}
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Adicionar ID do Produto..."
                        className="bg-white dark:bg-[#0b1120] border border-blue-500/20 rounded-xl px-4 py-2 text-xs font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none min-w-[220px] shadow-inner"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && e.target.value.trim()) {
                            e.preventDefault();
                            setFormData({
                              ...formData,
                              product_whitelist: [...formData.product_whitelist, e.target.value.trim()]
                            });
                            e.target.value = '';
                          }
                        }}
                      />
                      <FiPlus className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-500 opacity-50" />
                    </div>
                  </div>
                  <p className="text-[10px] text-gray-400 italic">Pressione Enter para adicionar cada ID. Se a lista estiver vazia, todos os produtos serão aceitos.</p>
                </div>
              )}
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
