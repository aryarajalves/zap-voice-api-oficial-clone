import { createPortal } from 'react-dom';
import { FiEye, FiEyeOff, FiSettings } from 'react-icons/fi';
import { toast } from 'react-hot-toast';

export default function InstagramSettingsModal({
  isOpen,
  onClose,
  onSave,
  isSaving,
  instaAccountID,
  setInstaAccountID,
  instaAccessToken,
  setInstaAccessToken,
  setTokenRevelado,
  tokenJaConfigurado,
  showToken,
  revealingToken,
  onRevealToken,
  webhookBaseUrl,
  instaWebhookSlug,
  setInstaWebhookSlug,
}) {
  if (!isOpen) return null;

  return createPortal(
    <div
      className="flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        zIndex: 99999, width: '100vw', height: '100vh'
      }}
    >
      <div className="w-full max-w-xl bg-white dark:bg-[#1e293b] rounded-3xl shadow-2xl border border-gray-100 dark:border-white/5 overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-gray-100 dark:border-gray-800">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <FiSettings className="text-pink-500" /> Parâmetros de Integração com o Meta
          </h3>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Configure as credenciais manuais da API do Instagram Business. Use o token permanente gerado no Painel de Desenvolvedores do Meta.
          </p>
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">ID da Conta do Instagram Business</label>
              <input
                type="text"
                value={instaAccountID}
                onChange={(e) => setInstaAccountID(e.target.value)}
                placeholder="Ex: 178414002345678"
                className="w-full px-4 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 border border-transparent focus:border-pink-500 outline-none text-sm font-semibold transition-all text-gray-950 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Token de Acesso da Página (Page Access Token)</label>
              <div className="relative">
                <input
                  type={showToken ? 'text' : 'password'}
                  value={instaAccessToken}
                  onChange={(e) => { setInstaAccessToken(e.target.value); setTokenRevelado(''); }}
                  placeholder={tokenJaConfigurado && !instaAccessToken ? '••••••••••••••••••••••••••••••••••••••••' : 'EAAGb...'}
                  autoComplete="new-password"
                  className="w-full px-4 py-3 pr-12 rounded-xl bg-gray-100 dark:bg-gray-800 border border-transparent focus:border-pink-500 outline-none text-sm font-semibold transition-all text-gray-950 dark:text-white"
                />
                <button
                  type="button"
                  onClick={onRevealToken}
                  disabled={revealingToken}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-pink-400 transition-colors p-1 disabled:opacity-50"
                  title={showToken ? 'Ocultar token' : 'Clique para revelar o token salvo'}
                >
                  {revealingToken
                    ? <span className="animate-spin text-xs">...</span>
                    : showToken ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                </button>
              </div>
              {tokenJaConfigurado && !instaAccessToken && (
                <span className="text-[10px] text-green-500 mt-1 block font-bold">✅ Token salvo. Clique no olho para revelar ou digite um novo para atualizar.</span>
              )}
            </div>

            <div>
              <label className="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Slug do Webhook (final da URL)</label>
              <input
                type="text"
                value={instaWebhookSlug}
                onChange={(e) => setInstaWebhookSlug(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                placeholder="Ex: minha_automacao"
                className="w-full px-4 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 border border-transparent focus:border-pink-500 outline-none text-sm font-semibold transition-all text-gray-950 dark:text-white"
              />
              <span className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 block">Apenas letras minúsculas, números, underscores (_) e hífens (-).</span>
            </div>

            <div className="mt-2">
              <label className="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">URL do Webhook (configurar no Meta)</label>
              <div className="relative">
                <input
                  type="text"
                  readOnly
                  value={webhookBaseUrl ? `${webhookBaseUrl}/api/instagram/webhook/${instaWebhookSlug}` : 'Configure WEBHOOK_BASE_URL no servidor'}
                  className="w-full px-4 py-3 pr-24 rounded-xl bg-gray-100/50 dark:bg-gray-800/50 border border-dashed border-pink-500/30 outline-none text-xs font-mono text-gray-500 dark:text-gray-400 cursor-default"
                />
                <button
                  type="button"
                  onClick={() => {
                    const url = webhookBaseUrl ? `${webhookBaseUrl}/api/instagram/webhook/${instaWebhookSlug}` : '';
                    if (url) { navigator.clipboard.writeText(url); toast.success('URL copiada!'); }
                    else toast.error('WEBHOOK_BASE_URL não configurada no servidor.');
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-pink-600/20 hover:bg-pink-600/40 text-pink-400 text-[9px] font-black rounded-lg transition-all uppercase tracking-wider"
                >
                  Copiar
                </button>
              </div>
              <span className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 block">
                Cole esta URL no campo &quot;URL de Callback&quot; do webhook do Instagram no painel do Meta Developers.
              </span>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 text-xs font-bold rounded-xl hover:bg-gray-50 dark:hover:bg-gray-850 transition-all uppercase tracking-wider"
            >
              Fechar
            </button>
            <button
              onClick={onSave}
              disabled={isSaving}
              className="px-5 py-2 bg-pink-600 hover:bg-pink-500 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-pink-600/10 uppercase tracking-wider"
            >
              {isSaving ? "Salvando..." : "Salvar Conexão"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
