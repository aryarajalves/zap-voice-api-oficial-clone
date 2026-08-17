import React from 'react';
import { FiZap, FiSave, FiRefreshCw } from 'react-icons/fi';

export default function CheckoutPresellConfigTab({
  config,
  setConfig,
  loadingConfig,
  savingConfig,
  onSaveConfig,
  getPublicUrl
}) {
  return (
    <div className="bg-white dark:bg-[#1e293b] border border-gray-200 dark:border-white/5 rounded-2xl p-6 shadow-sm space-y-6 animate-fade-in">
      <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-4">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <FiZap className="text-yellow-500" /> Configurações do Checkout
        </h2>
        {loadingConfig && <span className="text-xs text-gray-400 animate-pulse">Carregando...</span>}
      </div>

      <form onSubmit={onSaveConfig} className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Slug */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
            URL Personalizada (Slug) *
          </label>
          <div className="flex items-center rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 overflow-hidden focus-within:ring-2 focus-within:ring-blue-500">
            <span className="px-3 text-xs text-gray-400 font-mono border-r border-gray-200 dark:border-gray-800 bg-gray-100 dark:bg-gray-800 py-3">/c/</span>
            <input
              type="text"
              value={config.slug}
              onChange={(e) => setConfig({ ...config, slug: e.target.value })}
              placeholder="mentoria-vip"
              className="w-full px-3 py-2 bg-transparent text-gray-900 dark:text-white focus:outline-none text-sm font-mono"
              required
            />
          </div>
          <p className="text-xs text-gray-400 mt-1">Sua página estará disponível em: <span className="font-mono text-blue-500">{getPublicUrl(config.slug)}</span></p>
        </div>

        {/* URL de Destino Final */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
            URL de Destino Final (Checkout ou WhatsApp) *
          </label>
          <input
            type="url"
            value={config.destination_url}
            onChange={(e) => setConfig({ ...config, destination_url: e.target.value })}
            placeholder="https://pay.kiwify.com.br/seu-checkout"
            className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
            required
          />
          <p className="text-xs text-gray-400 mt-1">Ao submeter, o lead será redirecionado para esta URL com dados pré-populados.</p>
        </div>

        {/* Título Principal */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
            Título da Página
          </label>
          <input
            type="text"
            value={config.title}
            onChange={(e) => setConfig({ ...config, title: e.target.value })}
            placeholder="Aplicação Mentoria"
            className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
          />
        </div>

        {/* Subtítulo / Descrição */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
            Subtítulo / Descrição
          </label>
          <input
            type="text"
            value={config.description}
            onChange={(e) => setConfig({ ...config, description: e.target.value })}
            placeholder="Preencha seus dados para continuar com sua aplicação"
            className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
          />
        </div>

        {/* Texto da Badge */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
            Texto da Badge Superior
          </label>
          <input
            type="text"
            value={config.badge_text}
            onChange={(e) => setConfig({ ...config, badge_text: e.target.value })}
            placeholder="⚡ Vagas Limitadas"
            className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
          />
        </div>

        {/* Tag Automática do Lead */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
            Etiqueta Automática do Lead (Tag)
          </label>
          <input
            type="text"
            value={config.tag_name}
            onChange={(e) => setConfig({ ...config, tag_name: e.target.value })}
            placeholder="Checkout Presell"
            className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
          />
        </div>

        {/* Título da Aba do Navegador (Document Title) */}
        <div className="md:col-span-2">
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
            Título da Aba do Navegador (Nome que aparece na aba do browser)
          </label>
          <input
            type="text"
            value={config.page_tab_title || ''}
            onChange={(e) => setConfig({ ...config, page_tab_title: e.target.value })}
            placeholder="Aplicação Mentoria - Vagas Limitadas"
            className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm font-medium"
          />
        </div>

        {/* Texto do Botão */}
        <div className="md:col-span-2">
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
            Texto do Botão Principal
          </label>
          <input
            type="text"
            value={config.button_text}
            onChange={(e) => setConfig({ ...config, button_text: e.target.value })}
            placeholder="Continuar com Aplicação →"
            className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
          />
        </div>

        {/* Submit Button */}
        <div className="md:col-span-2 flex justify-end pt-2">
          <button
            type="submit"
            disabled={savingConfig}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {savingConfig ? <FiRefreshCw className="animate-spin" /> : <FiSave />}
            {savingConfig ? 'Salvando...' : 'Salvar Configurações'}
          </button>
        </div>
      </form>
    </div>
  );
}
