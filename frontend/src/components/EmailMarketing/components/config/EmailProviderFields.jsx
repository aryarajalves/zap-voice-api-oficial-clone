import React, { useState } from 'react';
import { FiKey, FiMail, FiEye, FiEyeOff, FiAlertCircle } from 'react-icons/fi';

export default function EmailProviderFields({
  formData,
  setFormData
}) {
  const [showSmtpPassword, setShowSmtpPassword] = useState(false);
  const [showAwsSecret, setShowAwsSecret] = useState(false);
  const [showResendKey, setShowResendKey] = useState(false);

  return (
    <>
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
    </>
  );
}
