import React from 'react';
import { FiGlobe, FiSave, FiUpload, FiX, FiCheckCircle } from 'react-icons/fi';

export default function CapturePageConfigTab({
  formData,
  setFormData,
  saving,
  onSaveConfig,
  handleBgUpload,
  uploadingBg
}) {
  return (
    <form onSubmit={onSaveConfig} className="bg-white dark:bg-[#0d1520] p-6 rounded-2xl border border-gray-200 dark:border-gray-800 space-y-6 shadow-xl">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Seção 1: Configuração do Link (Slug) */}
        <div className="col-span-full bg-gray-50 dark:bg-blue-950/20 p-4 rounded-xl border border-gray-200 dark:border-blue-900/40 space-y-3">
          <h3 className="text-sm font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-2">
            <FiGlobe /> URL Pública & Slug
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Slug da Página (Endereço Único)</label>
              <div className="flex items-center rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 overflow-hidden">
                <span className="bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-xs px-3 py-2.5 border-r border-gray-300 dark:border-gray-700 font-mono">/</span>
                <input
                  type="text"
                  required
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  className="w-full bg-transparent text-gray-900 dark:text-white text-xs px-3 py-2.5 focus:outline-none font-mono"
                  placeholder="masterclass"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Tag para os Leads Capturados</label>
              <input
                type="text"
                value={formData.tag_name}
                onChange={(e) => setFormData({ ...formData, tag_name: e.target.value })}
                className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white text-xs rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                placeholder="Página de Captura"
              />
            </div>
          </div>
        </div>

        {/* Seção 2: Textos da Página de Captura */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider border-b border-gray-200 dark:border-gray-800 pb-2">
            1. Textos da Página de Captura
          </h3>
          
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Headline Principal (Topo)</label>
            <input
              type="text"
              value={formData.headline}
              onChange={(e) => setFormData({ ...formData, headline: e.target.value })}
              className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white text-xs rounded-xl p-3 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              placeholder="INTENSIVO"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Badge de Texto</label>
              <input
                type="text"
                value={formData.badge_text}
                onChange={(e) => setFormData({ ...formData, badge_text: e.target.value })}
                className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white text-xs rounded-xl p-3 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                placeholder="Aulas do Miguel"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Badge de Status</label>
              <input
                type="text"
                value={formData.badge_status}
                onChange={(e) => setFormData({ ...formData, badge_status: e.target.value })}
                className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white text-xs rounded-xl p-3 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                placeholder="AO VIVO"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Data do Evento</label>
            <input
              type="text"
              value={formData.event_date}
              onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
              className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white text-xs rounded-xl p-3 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              placeholder="Hoje, 21 de Dezembro, às 20h"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Título de Chamada</label>
            <input
              type="text"
              value={formData.main_title}
              onChange={(e) => setFormData({ ...formData, main_title: e.target.value })}
              className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white text-xs rounded-xl p-3 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              placeholder="VOCÊ ESTÁ QUASE LÁ!"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Descrição em Destaque</label>
            <textarea
              rows="3"
              value={formData.main_description}
              onChange={(e) => setFormData({ ...formData, main_description: e.target.value })}
              className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white text-xs rounded-xl p-3 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              placeholder="Cadastre seu melhor email para receber o link de acesso..."
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Placeholder do E-mail</label>
              <input
                type="text"
                value={formData.email_placeholder}
                onChange={(e) => setFormData({ ...formData, email_placeholder: e.target.value })}
                className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white text-xs rounded-xl p-3 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                placeholder="Seu melhor email"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Texto do Botão CTA</label>
              <input
                type="text"
                value={formData.button_text}
                onChange={(e) => setFormData({ ...formData, button_text: e.target.value })}
                className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white text-xs rounded-xl p-3 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                placeholder="QUERO PARTICIPAR DO INTENSIVO!"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">Imagem de Fundo da Página (Upload)</label>
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                Recomendado: 1920x1080 (Foco no lado direito)
              </span>
            </div>
            
            {formData.bg_image_url ? (
              <div className="relative rounded-2xl overflow-hidden border border-emerald-500/40 bg-gray-50 dark:bg-gray-900 p-3 flex items-center gap-4">
                <img 
                  src={formData.bg_image_url} 
                  alt="Fundo da Página" 
                  className="w-20 h-14 object-cover rounded-xl border border-gray-300 dark:border-gray-700"
                />
                <div className="flex-1 truncate">
                  <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <FiCheckCircle /> Imagem Carregada
                  </p>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate font-mono">{formData.bg_image_url}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, bg_image_url: '' })}
                  className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl transition-all cursor-pointer"
                  title="Remover Imagem"
                >
                  <FiX />
                </button>
              </div>
            ) : (
              <div className="relative border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-emerald-500/50 rounded-2xl bg-gray-50 dark:bg-gray-900 p-4 text-center transition-all">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleBgUpload}
                  disabled={uploadingBg}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 disabled:cursor-not-allowed"
                />
                <div className="flex flex-col items-center justify-center gap-2">
                  <div className="w-10 h-10 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center text-lg">
                    {uploadingBg ? (
                      <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <FiUpload />
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-900 dark:text-white">
                      {uploadingBg ? 'Fazendo Upload...' : 'Clique para selecionar uma imagem do seu computador'}
                    </p>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                      Tamanho ideal: <strong className="text-emerald-600 dark:text-emerald-400">1920x1080px</strong> (PNG, JPG, WEBP até 10MB)
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Nota de Segurança / Rodapé</label>
            <input
              type="text"
              value={formData.footer_note}
              onChange={(e) => setFormData({ ...formData, footer_note: e.target.value })}
              className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white text-xs rounded-xl p-3 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              placeholder="Seus dados estão seguros. Não enviamos spam."
            />
          </div>
        </div>

        {/* Seção 3: Textos & Link da Página de Obrigado */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider border-b border-gray-200 dark:border-gray-800 pb-2">
            2. Página de Obrigado & WhatsApp
          </h3>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Título de Confirmação</label>
            <input
              type="text"
              value={formData.thank_you_title}
              onChange={(e) => setFormData({ ...formData, thank_you_title: e.target.value })}
              className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white text-xs rounded-xl p-3 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              placeholder="Inscrição Confirmada!"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Instruções da Página de Obrigado</label>
            <textarea
              rows="3"
              value={formData.thank_you_description}
              onChange={(e) => setFormData({ ...formData, thank_you_description: e.target.value })}
              className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white text-xs rounded-xl p-3 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              placeholder="Entre no grupo VIP do WhatsApp para receber o link de acesso..."
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-emerald-600 dark:text-emerald-400 mb-1">URL / Link do Grupo de WhatsApp</label>
            <input
              type="url"
              required
              value={formData.whatsapp_group_url}
              onChange={(e) => setFormData({ ...formData, whatsapp_group_url: e.target.value })}
              className="w-full bg-gray-50 dark:bg-gray-900 border border-emerald-500/50 dark:border-emerald-500/40 text-emerald-600 dark:text-emerald-300 text-xs rounded-xl p-3 focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono"
              placeholder="https://chat.whatsapp.com/xyz123"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Texto do Botão do WhatsApp</label>
            <input
              type="text"
              value={formData.whatsapp_button_text}
              onChange={(e) => setFormData({ ...formData, whatsapp_button_text: e.target.value })}
              className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white text-xs rounded-xl p-3 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              placeholder="ENTRAR NO GRUPO DO WHATSAPP"
            />
          </div>
        </div>

      </div>

      <div className="flex justify-end pt-4 border-t border-gray-800">
        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-sm px-6 py-3 rounded-xl transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50 cursor-pointer"
        >
          <FiSave />
          {saving ? 'Salvando Alterações...' : 'Salvar Configuração'}
        </button>
      </div>
    </form>
  );
}
