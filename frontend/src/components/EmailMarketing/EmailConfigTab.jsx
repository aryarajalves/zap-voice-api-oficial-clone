import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { FiSave, FiSend, FiShield, FiCheckCircle } from 'react-icons/fi';
import { API_URL } from '../../config';
import { useClient } from '../../contexts/ClientContext';

// Subcomponentes Modulares
import EmailProviderSelector from './components/config/EmailProviderSelector';
import EmailSenderFields from './components/config/EmailSenderFields';
import EmailProviderFields from './components/config/EmailProviderFields';
import EmailWebhookStatusCard from './components/config/EmailWebhookStatusCard';
import EmailTestModal from './components/config/EmailTestModal';

export default function EmailConfigTab() {
  const { activeClient } = useClient();
  const [loading, setLoading] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);

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
          <EmailProviderSelector
            selectedProvider={formData.provider}
            onSelectProvider={provId => setFormData(prev => ({ ...prev, provider: provId }))}
          />

          {/* Dados do Remetente */}
          <EmailSenderFields
            fromEmail={formData.from_email}
            fromName={formData.from_name}
            onChangeFromEmail={email => setFormData(prev => ({ ...prev, from_email: email }))}
            onChangeFromName={name => setFormData(prev => ({ ...prev, from_name: name }))}
          />

          {/* Campos Específicos por Provedor */}
          <EmailProviderFields
            formData={formData}
            setFormData={setFormData}
          />

          {/* Card do Webhook da Brevo / Provedores */}
          <EmailWebhookStatusCard />

          {/* Botões de Ação */}
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

      {/* Modal de Teste de E-mail */}
      <EmailTestModal
        isOpen={isTestModalOpen}
        onClose={() => setIsTestModalOpen(false)}
        testEmail={testEmail}
        setTestEmail={setTestEmail}
        onSendTest={handleTestEmail}
        testLoading={testLoading}
      />
    </div>
  );
}
