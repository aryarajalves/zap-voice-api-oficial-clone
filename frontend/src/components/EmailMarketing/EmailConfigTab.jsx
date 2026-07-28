import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'react-hot-toast';
import { FiSave, FiSend, FiShield, FiCheckCircle, FiAlertCircle, FiKey, FiMail, FiEye, FiEyeOff } from 'react-icons/fi';
import { API_URL, WEBHOOK_BASE_URL } from '../../config';

import { useClient } from '../../contexts/ClientContext';

export default function EmailConfigTab() {
  const { activeClient } = useClient();
  const [loading, setLoading] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);

  // Estados para visibilidade de senhas e chaves
  const [showSmtpPassword, setShowSmtpPassword] = useState(false);
  const [showAwsSecret, setShowAwsSecret] = useState(false);
  const [showResendKey, setShowResendKey] = useState(false);

  const [formData, setFormData] = useState({
    provider: 'ses',
    aws_access_key_id: '',
    aws_secret_access_key: '',
    aws_region: 'us-east-1',
    resend_api_key: '',
    smtp_host: '',
    smtp_port: 587,
    smtp_user: '',
    smtp_password: '',
    smtp_encryption: 'tls',
    from_email: '',
    from_name: 'ZapVoice'
  });

  const [isConfigured, setIsConfigured] = useState(false);

  const getHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'X-Client-ID': activeClient?.id ? String(activeClient.id) : ''
    };
  };

  useEffect(() => {
    fetchConfig();
  }, [activeClient]);

  const fetchConfig = async () => {
    if (!activeClient) return;
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/email/config`, { headers: getHeaders() });

      if (res.ok) {
        const data = await res.json();
        if (data.configured && data.config) {
          setIsConfigured(true);
          setFormData(prev => ({
            ...prev,
            ...data.config,
            aws_secret_access_key: data.config.aws_secret_access_key || '',
            smtp_password: data.config.smtp_password || '',
            resend_api_key: data.config.resend_api_key || ''
          }));
        }
      }
    } catch (err) {
      console.error("Erro ao carregar configuração de e-mail:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.from_email) {
      return toast.error("Por favor, preencha o E-mail de Remetente.");
    }
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/email/config`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(formData)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Erro ao salvar configuração.");
      }
      toast.success("Configuração de e-mail salva com sucesso!");
      setIsConfigured(true);
    } catch (err) {
      toast.error(err.message || "Erro ao salvar configuração.");
    } finally {
      setLoading(false);
    }
  };

  const handleTestEmail = async () => {
    if (!testEmail || !testEmail.includes('@')) {
      return toast.error("Digite um e-mail de destino válido.");
    }
    try {
      setTestLoading(true);
      const res = await fetch(`${API_URL}/email/test`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ to_email: testEmail })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Erro ao enviar e-mail de teste.");
      }
      toast.success(data.message || "E-mail de teste enviado com sucesso!");
      setIsTestModalOpen(false);
      setTestEmail('');
    } catch (err) {
      toast.error(err.message || "Erro ao enviar e-mail de teste.");
    } finally {
      setTestLoading(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div className="bg-white dark:bg-slate-800/80 backdrop-blur-md p-6 rounded-2xl border border-gray-100 dark:border-white/10 shadow-lg">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
              <FiShield className="text-blue-500" /> Provedor de Envio de E-mail
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Escolha e configure o serviço responsável por entregar seus e-mails marketing.
            </p>
          </div>
          {isConfigured && (
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-500/10 border border-green-500/30 text-green-600 dark:text-green-400 text-xs font-semibold rounded-full">
              <FiCheckCircle /> Ativo & Configurado
            </span>
          )}
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          {/* Seletor de Provedor */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Selecione o Provedor
            </label>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, provider: 'ses' })}
                className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between ${
                  formData.provider === 'ses'
                    ? 'border-blue-500 bg-blue-500/10 ring-2 ring-blue-500/30'
                    : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-slate-900/50 hover:border-gray-300'
                }`}
              >
                <div>
                  <div className="font-bold text-gray-800 dark:text-white flex items-center gap-2 text-sm">
                    ⚡ Amazon SES
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Custo ultra baixo ($0.10 / 1.000 e-mails) e alta entregabilidade.
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setFormData({ ...formData, provider: 'resend' })}
                className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between ${
                  formData.provider === 'resend'
                    ? 'border-blue-500 bg-blue-500/10 ring-2 ring-blue-500/30'
                    : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-slate-900/50 hover:border-gray-300'
                }`}
              >
                <div>
                  <div className="font-bold text-gray-800 dark:text-white flex items-center gap-2 text-sm">
                    🚀 Resend
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Configuração em 30 segundos usando apenas 1 API Key.
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setFormData({ ...formData, provider: 'smtp' })}
                className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between ${
                  formData.provider === 'smtp'
                    ? 'border-blue-500 bg-blue-500/10 ring-2 ring-blue-500/30'
                    : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-slate-900/50 hover:border-gray-300'
                }`}
              >
                <div>
                  <div className="font-bold text-gray-800 dark:text-white flex items-center gap-2 text-sm">
                    ⚙️ SMTP Customizado
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Qualquer servidor próprio (Host, Porta, Usuário e Senha).
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setFormData({ ...formData, provider: 'direct' })}
                className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between ${
                  formData.provider === 'direct'
                    ? 'border-purple-500 bg-purple-500/10 ring-2 ring-purple-500/30'
                    : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-slate-900/50 hover:border-gray-300'
                }`}
              >
                <div>
                  <div className="font-bold text-gray-800 dark:text-white flex items-center gap-2 text-sm">
                    ✉️ Envio Direto (Sem SMTP)
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Envio grátis pelo servidor. Pode ir para caixa de SPAM.
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* Dados do Remetente */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-gray-100 dark:border-gray-800">
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                E-mail do Remetente *
              </label>
              <input
                type="email"
                required
                placeholder="contato@seu-dominio.com.br"
                value={formData.from_email}
                onChange={e => setFormData({ ...formData, from_email: e.target.value })}
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 text-gray-800 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                Nome do Remetente
              </label>
              <input
                type="text"
                placeholder="Ex: ZapVoice Equipe"
                value={formData.from_name}
                onChange={e => setFormData({ ...formData, from_name: e.target.value })}
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 text-gray-800 dark:text-white"
              />
            </div>
          </div>

          {/* Campos Específicos: AMAZON SES */}
          {formData.provider === 'ses' && (
            <div className="space-y-4 p-4 bg-blue-500/5 rounded-xl border border-blue-500/20">
              <h4 className="text-sm font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                <FiKey /> Configuração Amazon SES (AWS)
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    AWS Access Key ID *
                  </label>
                  <input
                    type="text"
                    placeholder="AKIAIOSFODNN7EXAMPLE"
                    value={formData.aws_access_key_id}
                    onChange={e => setFormData({ ...formData, aws_access_key_id: e.target.value })}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-gray-700 rounded-lg text-sm text-gray-800 dark:text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    AWS Secret Access Key {formData.has_aws_secret ? '(Mantida)' : '*'}
                  </label>
                  <div className="relative">
                    <input
                      type={showAwsSecret ? "text" : "password"}
                      autoComplete="new-password"
                      placeholder={formData.has_aws_secret ? '••••••••••••••••' : 'Digite a Secret Key'}
                      value={formData.aws_secret_access_key}
                      onChange={e => setFormData({ ...formData, aws_secret_access_key: e.target.value })}
                      className="w-full px-3 py-2 pr-10 bg-white dark:bg-slate-800 border border-gray-300 dark:border-gray-700 rounded-lg text-sm text-gray-800 dark:text-white font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowAwsSecret(!showAwsSecret)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200 transition-colors p-1"
                      title={showAwsSecret ? "Ocultar secret" : "Ver secret"}
                    >
                      {showAwsSecret ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                    </button>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Região AWS (Default: us-east-1)
                </label>
                <select
                  value={formData.aws_region}
                  onChange={e => setFormData({ ...formData, aws_region: e.target.value })}
                  className="w-full md:w-1/2 px-3 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-gray-700 rounded-lg text-sm text-gray-800 dark:text-white"
                >
                  <option value="us-east-1">US East (N. Virginia) - us-east-1</option>
                  <option value="us-east-2">US East (Ohio) - us-east-2</option>
                  <option value="us-west-2">US West (Oregon) - us-west-2</option>
                  <option value="sa-east-1">South America (São Paulo) - sa-east-1</option>
                  <option value="eu-west-1">Europe (Ireland) - eu-west-1</option>
                </select>
              </div>
            </div>
          )}

          {/* Campos Específicos: RESEND */}
          {formData.provider === 'resend' && (
            <div className="space-y-4 p-4 bg-purple-500/5 rounded-xl border border-purple-500/20">
              <h4 className="text-sm font-bold text-purple-600 dark:text-purple-400 flex items-center gap-1.5">
                <FiKey /> Configuração Resend API
              </h4>
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Resend API Key *
                </label>
                <div className="relative">
                  <input
                    type={showResendKey ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="re_123456789..."
                    value={formData.resend_api_key}
                    onChange={e => setFormData({ ...formData, resend_api_key: e.target.value })}
                    className="w-full px-3 py-2 pr-10 bg-white dark:bg-slate-800 border border-gray-300 dark:border-gray-700 rounded-lg text-sm text-gray-800 dark:text-white font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowResendKey(!showResendKey)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200 transition-colors p-1"
                    title={showResendKey ? "Ocultar chave" : "Ver chave"}
                  >
                    {showResendKey ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Campos Específicos: SMTP */}
          {formData.provider === 'smtp' && (
            <div className="space-y-4 p-4 bg-slate-500/5 rounded-xl border border-slate-500/20">
              <h4 className="text-sm font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                <FiKey /> Configuração Servidor SMTP
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Servidor SMTP Host *
                  </label>
                  <input
                    type="text"
                    placeholder="smtp.seu-servidor.com"
                    value={formData.smtp_host}
                    onChange={e => setFormData({ ...formData, smtp_host: e.target.value })}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-gray-700 rounded-lg text-sm text-gray-800 dark:text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Porta (587 / 465)
                  </label>
                  <input
                    type="number"
                    value={formData.smtp_port}
                    onChange={e => setFormData({ ...formData, smtp_port: parseInt(e.target.value) || 587 })}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-gray-700 rounded-lg text-sm text-gray-800 dark:text-white font-mono"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Usuário SMTP
                  </label>
                  <input
                    type="text"
                    placeholder="seu_usuario"
                    value={formData.smtp_user}
                    onChange={e => setFormData({ ...formData, smtp_user: e.target.value })}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-gray-700 rounded-lg text-sm text-gray-800 dark:text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Senha SMTP {formData.has_smtp_password ? '(Mantida)' : ''}
                  </label>
                  <div className="relative">
                    <input
                      type={showSmtpPassword ? "text" : "password"}
                      autoComplete="new-password"
                      placeholder={formData.has_smtp_password ? '••••••••' : 'Digite a senha'}
                      value={formData.smtp_password}
                      onChange={e => setFormData({ ...formData, smtp_password: e.target.value })}
                      className="w-full px-3 py-2 pr-10 bg-white dark:bg-slate-800 border border-gray-300 dark:border-gray-700 rounded-lg text-sm text-gray-800 dark:text-white font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSmtpPassword(!showSmtpPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200 transition-colors p-1"
                      title={showSmtpPassword ? "Ocultar senha" : "Ver senha"}
                    >
                      {showSmtpPassword ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Campos Específicos: Envio Direto / Sendmail Local */}
          {formData.provider === 'direct' && (
            <div className="p-4 bg-purple-500/10 rounded-xl border border-purple-500/20 space-y-2">
              <h4 className="text-sm font-bold text-purple-400 flex items-center gap-1.5">
                <FiMail /> Envio Direto via Servidor Local (Sem SMTP)
              </h4>
              <p className="text-xs text-gray-300 leading-relaxed">
                Nesta modalidade, o ZapVoice faz a entrega do e-mail conectando-se diretamente ao servidor de destino (como Gmail ou Outlook) na porta 25.
              </p>
              <div className="flex items-center gap-2 text-xs text-amber-400 bg-amber-500/10 p-2.5 rounded-lg border border-amber-500/20 mt-2">
                <FiAlertCircle className="shrink-0 text-base" />
                <span>
                  <strong>Atenção:</strong> Não é necessário digitar senhas ou hosts. Porém, e-mails enviados sem registros SPF/DKIM configurados no seu domínio podem ir direto para a <strong>caixa de SPAM</strong> dos contatos.
                </span>
              </div>
            </div>
          )}

          {/* Botões de Ação */}
          {/* Card do Webhook da Brevo / Provedores */}
          <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                <FiMail size={14} /> Webhook de Status de Entrega (Brevo / SES / Resend)
              </span>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-300">
              Copie a URL pública abaixo e cadastre na Brevo (em <em>Transactional &gt; Settings &gt; Webhooks</em>) para rastrear entregas, bounces e confirmações em tempo real:
            </p>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={`${WEBHOOK_BASE_URL.replace(/\/+$/, '')}/api/email/status-webhook`}
                className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800 rounded-lg text-xs font-mono text-gray-800 dark:text-gray-200 select-all"
              />
              <button
                type="button"
                onClick={() => {
                  const url = `${WEBHOOK_BASE_URL.replace(/\/+$/, '')}/api/email/status-webhook`;
                  navigator.clipboard.writeText(url);
                  toast.success("URL do Webhook copiada!");
                }}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all whitespace-nowrap"
              >
                Copiar URL
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-700">
            <button
              type="button"
              onClick={() => setIsTestModalOpen(true)}
              className="px-4 py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-semibold rounded-xl text-sm transition-all flex items-center gap-2"
            >
              <FiSend /> Testar Envio de E-mail
            </button>

            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm transition-all shadow-md shadow-blue-500/20 flex items-center gap-2 disabled:opacity-50"
            >
              <FiSave /> {loading ? 'Salvando...' : 'Salvar Configuração'}
            </button>
          </div>
        </form>
      </div>

      {/* Modal de Teste de E-mail usando React Portal para ocupar 100% da viewport */}
      {isTestModalOpen && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-md w-full border border-gray-100 dark:border-white/10 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
              <FiMail className="text-blue-500" /> Enviar E-mail de Teste
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Digite o e-mail que receberá a mensagem de teste para validar se o provedor está funcionando.
            </p>
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                E-mail de Destino
              </label>
              <input
                type="email"
                placeholder="seuemail@gmail.com"
                value={testEmail}
                onChange={e => setTestEmail(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-900 border border-gray-300 dark:border-gray-700 rounded-xl text-sm text-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-center justify-end gap-3 pt-3">
              <button
                type="button"
                onClick={() => setIsTestModalOpen(false)}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={testLoading}
                onClick={handleTestEmail}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/20 disabled:opacity-50"
              >
                {testLoading ? 'Enviando...' : 'Enviar Teste'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
