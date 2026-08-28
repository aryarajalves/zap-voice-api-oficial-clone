import React, { useState, useEffect } from 'react';
import { API_URL, resolveUrl } from '../../config';
import { toast } from 'react-hot-toast';
import { FiAlertTriangle } from 'react-icons/fi';
import RegisterFormStep from './RegisterFormStep';
import VerificationCodeStep from './VerificationCodeStep';

const InviteRegister = ({ token }) => {
  const [invitation, setInvitation] = useState(null);
  const [loadingInvite, setLoadingInvite] = useState(true);
  const [inviteError, setInviteError] = useState('');
  const [branding, setBranding] = useState({ name: 'ZapVoice Funnels', logo: null });

  // Fluxo de Etapas: 'form' | 'verify'
  const [step, setStep] = useState('form');

  // Dados do formulário
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [code, setCode] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    document.title = 'Criando Conta';

    // Buscar Branding
    const fetchBranding = async () => {
      try {
        const res = await fetch(`${API_URL}/settings/branding`);
        if (res.ok) {
          const data = await res.json();
          if (data.APP_NAME) {
            setBranding({
              name: data.APP_NAME,
              logo: data.APP_LOGO || null
            });
            document.title = `Criando Conta - ${data.APP_NAME}`;
          }
        }
      } catch (err) {
        console.error("Erro ao buscar branding:", err);
      }
    };

    // Verificar token de convite
    const verifyInvitation = async () => {
      try {
        const res = await fetch(`${API_URL}/auth/invitations/${token}`);
        if (res.ok) {
          const data = await res.json();
          setInvitation(data);
        } else {
          const errData = await res.json();
          setInviteError(errData.detail || "Este convite é inválido ou expirou.");
        }
      } catch (err) {
        setInviteError("Erro de conexão ao verificar o convite.");
      } finally {
        setLoadingInvite(false);
      }
    };

    fetchBranding();
    verifyInvitation();
  }, [token]);

  // Etapa 1: Enviar código de verificação via Brevo
  const handleSendCode = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (password !== confirmPassword) {
      toast.error("As senhas informadas não coincidem.");
      return;
    }

    setIsSubmitting(true);
    const loadingToast = toast.loading("Enviando código de verificação...");

    try {
      const res = await fetch(`${API_URL}/auth/invitations/${token}/send-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName,
          email: email,
          password: password,
          confirm_password: confirmPassword
        })
      });

      if (res.ok) {
        toast.success("Código de 6 dígitos enviado para seu e-mail!");
        setStep('verify');
      } else {
        const errData = await res.json();
        throw new Error(errData.detail || "Erro ao solicitar código de verificação.");
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
      toast.dismiss(loadingToast);
    }
  };

  // Reenviar código (a partir da etapa de verificação)
  const handleResendCode = async () => {
    setIsResending(true);
    const loadingToast = toast.loading("Reenviando código para seu e-mail...");

    try {
      const res = await fetch(`${API_URL}/auth/invitations/${token}/send-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName,
          email: email,
          password: password,
          confirm_password: confirmPassword
        })
      });

      if (res.ok) {
        toast.success("Novo código enviado com sucesso!");
        return true;
      } else {
        const errData = await res.json();
        throw new Error(errData.detail || "Erro ao reenviar código.");
      }
    } catch (err) {
      toast.error(err.message);
      return false;
    } finally {
      setIsResending(false);
      toast.dismiss(loadingToast);
    }
  };

  // Etapa 2: Validar código e ativar conta
  const handleRegister = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const cleanCode = code.replace(/\D/g, '').slice(0, 6);
    if (cleanCode.length !== 6) {
      toast.error("Por favor, informe o código de 6 dígitos completo.");
      return;
    }

    setIsSubmitting(true);
    const loadingToast = toast.loading("Ativando sua conta...");

    try {
      const res = await fetch(`${API_URL}/auth/invitations/${token}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName,
          email: email,
          password: password,
          code: cleanCode
        })
      });

      if (res.ok) {
        toast.success("Conta criada e ativada com sucesso! Redirecionando para o login...");
        setTimeout(() => {
          window.location.href = '/';
        }, 1500);
      } else {
        const errData = await res.json();
        throw new Error(errData.detail || "Erro ao ativar conta.");
      }
    } catch (err) {
      toast.error(err.message);
      setIsSubmitting(false);
    } finally {
      toast.dismiss(loadingToast);
    }
  };

  const translateRole = (role) => {
    switch (role) {
      case 'super_admin': return 'Super Administrador';
      case 'admin': return 'Administrador';
      case 'premium': return 'Usuário Premium';
      default: return 'Usuário';
    }
  };

  const renderAppName = () => {
    const name = branding.name || 'ZapVoice Funnels';
    const parts = name.split(' ');
    if (parts.length === 1) return name;
    const last = parts.pop();
    return (
      <>
        {parts.join(' ')} <span className="text-blue-500">{last}</span>
      </>
    );
  };

  if (loadingInvite) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center p-4">
        <div className="text-center space-y-4">
          <svg className="animate-spin h-12 w-12 text-blue-600 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-gray-400 text-sm">Verificando convite...</p>
        </div>
      </div>
    );
  }

  if (inviteError) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-4">
        <div className="bg-[#1e293b] rounded-2xl shadow-2xl w-full max-w-md p-8 border border-gray-700 text-center space-y-6">
          <div className="w-16 h-16 bg-red-900/30 rounded-full flex items-center justify-center text-red-500 mx-auto">
            <FiAlertTriangle size={32} />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-white">Convite Inválido</h2>
            <p className="text-gray-400 text-sm">{inviteError}</p>
          </div>
          <button
            onClick={() => (window.location.href = '/')}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition duration-200 cursor-pointer"
          >
            Voltar para o Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-4">
      <div className="bg-[#1e293b] rounded-2xl shadow-2xl w-full max-w-md p-8 border border-gray-700">
        {/* Branding/Header */}
        <div className="text-center mb-6">
          <div className="flex flex-col items-center gap-3 mb-3">
            {branding.logo ? (
              <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-lg border border-gray-700">
                <img src={resolveUrl(branding.logo)} alt={branding.name} className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg border-t border-blue-400">
                <span className="text-white text-4xl font-bold font-sans">
                  {(branding.name || 'Z')[0].toUpperCase()}
                </span>
              </div>
            )}
            <h1 className="text-2xl font-bold text-white">
              {renderAppName()}
            </h1>
          </div>
          <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg px-3.5 py-1.5 inline-block">
            <p className="text-[11px] text-blue-400 font-bold tracking-wider uppercase">
              Você foi convidado como {translateRole(invitation?.role)}
            </p>
          </div>
        </div>

        {/* Renderiza Etapa 1 ou Etapa 2 */}
        {step === 'form' ? (
          <RegisterFormStep
            fullName={fullName}
            setFullName={setFullName}
            email={email}
            setEmail={setEmail}
            password={password}
            setPassword={setPassword}
            confirmPassword={confirmPassword}
            setConfirmPassword={setConfirmPassword}
            onSubmit={handleSendCode}
            isSubmitting={isSubmitting}
          />
        ) : (
          <VerificationCodeStep
            email={email}
            code={code}
            setCode={setCode}
            onSubmit={handleRegister}
            onResend={handleResendCode}
            onBack={() => setStep('form')}
            isSubmitting={isSubmitting}
            isResending={isResending}
          />
        )}

        {/* Footer */}
        <div className="mt-6 pt-5 border-t border-gray-800 text-center text-[11px] text-gray-500">
          <p>{branding.name} © {new Date().getFullYear()}</p>
        </div>
      </div>
    </div>
  );
};

export default InviteRegister;
