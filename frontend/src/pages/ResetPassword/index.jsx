import React, { useState, useEffect } from 'react';
import { API_URL, resolveUrl } from '../../config';
import { toast } from 'react-hot-toast';
import { FiAlertTriangle, FiLock, FiEye, FiEyeOff, FiCheck, FiX, FiKey, FiUser, FiCheckCircle } from 'react-icons/fi';
import { generateSecurePassword } from '../../utils/passwordGenerator';

const ResetPassword = ({ token }) => {
  const [tokenInfo, setTokenInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [branding, setBranding] = useState({ name: 'ZapVoice Funnels', logo: null });

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    document.title = 'Redefinir Senha';

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
            document.title = `Redefinir Senha - ${data.APP_NAME}`;
          }
        }
      } catch (err) {
        console.error("Erro ao buscar branding:", err);
      }
    };

    const verifyToken = async () => {
      try {
        const res = await fetch(`${API_URL}/auth/reset-password-token/${token}`);
        if (res.ok) {
          const data = await res.json();
          setTokenInfo(data);
        } else {
          const errData = await res.json();
          setErrorMsg(errData.detail || "Este link de redefinição é inválido ou expirou.");
        }
      } catch (err) {
        setErrorMsg("Erro de conexão ao verificar o link de redefinição.");
      } finally {
        setLoading(false);
      }
    };

    fetchBranding();
    verifyToken();
  }, [token]);

  const handleGeneratePassword = () => {
    const newPassword = generateSecurePassword({ length: 16 });
    setPassword(newPassword);
    setConfirmPassword(newPassword);
    setShowPassword(true);
    setShowConfirmPassword(true);

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(newPassword).catch(() => {});
    }
    toast.success('Senha forte gerada e preenchida!');
  };

  // Validações em tempo real da senha
  const hasMinLength = password.length >= 12;
  const hasLetter = /[A-Za-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;

  const isFormValid = hasMinLength && hasLetter && hasNumber && hasSpecial && passwordsMatch;

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!isFormValid) return;

    setIsSubmitting(true);
    const loadingToast = toast.loading("Salvando nova senha...");

    try {
      const res = await fetch(`${API_URL}/auth/reset-password-token/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: password,
          confirm_password: confirmPassword
        })
      });

      if (res.ok) {
        toast.success("Sua senha foi redefinida com sucesso!");
        setSuccess(true);
        setTimeout(() => {
          window.location.href = '/';
        }, 2000);
      } else {
        const errData = await res.json();
        throw new Error(errData.detail || "Erro ao redefinir senha.");
      }
    } catch (err) {
      toast.error(err.message);
      setIsSubmitting(false);
    } finally {
      toast.dismiss(loadingToast);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center p-4">
        <div className="text-center space-y-4">
          <svg className="animate-spin h-12 w-12 text-blue-600 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-gray-400 text-sm">Verificando link de redefinição...</p>
        </div>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-4">
        <div className="bg-[#1e293b] rounded-2xl shadow-2xl w-full max-w-md p-8 border border-gray-700 text-center space-y-6">
          <div className="w-16 h-16 bg-red-900/30 rounded-full flex items-center justify-center text-red-500 mx-auto">
            <FiAlertTriangle size={32} />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-white">Link Inválido ou Expirado</h2>
            <p className="text-gray-400 text-sm">{errorMsg}</p>
          </div>
          <button
            onClick={() => (window.location.href = '/')}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition duration-200 cursor-pointer"
          >
            Ir para o Login
          </button>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-4">
        <div className="bg-[#1e293b] rounded-2xl shadow-2xl w-full max-w-md p-8 border border-gray-700 text-center space-y-6 animate-in zoom-in-95 duration-200">
          <div className="w-16 h-16 bg-emerald-900/30 rounded-full flex items-center justify-center text-emerald-400 mx-auto border border-emerald-500/30">
            <FiCheckCircle size={36} />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-white">Senha Atualizada!</h2>
            <p className="text-gray-300 text-sm">Sua senha foi redefinida com sucesso. Redirecionando para o login...</p>
          </div>
          <button
            onClick={() => (window.location.href = '/')}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition duration-200 cursor-pointer"
          >
            Fazer Login Agora
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-4">
      <div className="bg-[#1e293b] rounded-2xl shadow-2xl w-full max-w-md p-8 border border-gray-700">
        {/* Header/Branding */}
        <div className="text-center mb-6">
          <div className="flex flex-col items-center gap-3 mb-3">
            {branding.logo ? (
              <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-lg border border-gray-700">
                <img src={resolveUrl(branding.logo)} alt={branding.name} className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center text-2xl font-bold shadow-lg shadow-blue-500/30 border border-blue-400/30">
                Z
              </div>
            )}
            <h1 className="text-2xl font-black text-white tracking-tight">{renderAppName()}</h1>
          </div>

          <div className="inline-block bg-blue-900/40 border border-blue-700/50 rounded-lg px-3 py-1 text-xs font-semibold text-blue-300 uppercase tracking-wider">
            REDEFINIR SENHA DE ACESSO
          </div>
        </div>

        {/* Card do Usuário */}
        {tokenInfo && (
          <div className="bg-[#0f172a] p-3 rounded-xl border border-gray-700/60 mb-5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center font-bold">
              <FiUser size={18} />
            </div>
            <div className="overflow-hidden">
              <div className="text-sm font-bold text-white truncate">{tokenInfo.full_name || 'Usuário'}</div>
              <div className="text-xs text-gray-400 truncate">{tokenInfo.email}</div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
          {/* Nova Senha */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-gray-300">
                Nova Senha (Mínimo 12 caracteres)
              </label>
              <button
                type="button"
                onClick={handleGeneratePassword}
                data-testid="generate-password-btn"
                className="text-[11px] font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors cursor-pointer"
                title="Gerar senha aleatória segura (12 a 20 caracteres)"
              >
                <FiKey size={13} className="text-blue-400" />
                <span>Gerar Senha</span>
              </button>
            </div>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500">
                <FiLock size={18} />
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
                className="w-full pl-10 pr-12 py-2.5 bg-[#0f172a] border border-gray-700 rounded-xl text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition placeholder-gray-500 text-sm"
                placeholder="Digite sua nova senha"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 focus:outline-none cursor-pointer"
                title={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
              </button>
            </div>
          </div>

          {/* Confirmar Nova Senha */}
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1">
              Confirmar Nova Senha
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500">
                <FiLock size={18} />
              </span>
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
                className={`w-full pl-10 pr-12 py-2.5 bg-[#0f172a] border rounded-xl text-white focus:ring-2 outline-none transition placeholder-gray-500 text-sm ${
                  confirmPassword.length > 0
                    ? passwordsMatch
                      ? 'border-emerald-500/60 focus:ring-emerald-500'
                      : 'border-rose-500/60 focus:ring-rose-500'
                    : 'border-gray-700 focus:ring-blue-500'
                }`}
                placeholder="Confirme sua nova senha"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 focus:outline-none cursor-pointer"
                title={showConfirmPassword ? 'Ocultar confirmação' : 'Mostrar confirmação'}
              >
                {showConfirmPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
              </button>
            </div>
          </div>

          {/* Checklist Visual de Requisitos de Senha */}
          <div className="bg-[#0b1120]/80 rounded-xl p-3 border border-gray-800 space-y-1.5 text-xs">
            <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">
              Requisitos de Segurança da Senha
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <div className={`flex items-center gap-1.5 transition-colors ${hasMinLength ? 'text-emerald-400 font-medium' : 'text-gray-500'}`}>
                {hasMinLength ? <FiCheck className="text-emerald-400 flex-shrink-0" size={14} /> : <FiX className="text-gray-600 flex-shrink-0" size={14} />}
                <span>12+ caracteres</span>
              </div>
              <div className={`flex items-center gap-1.5 transition-colors ${hasLetter ? 'text-emerald-400 font-medium' : 'text-gray-500'}`}>
                {hasLetter ? <FiCheck className="text-emerald-400 flex-shrink-0" size={14} /> : <FiX className="text-gray-600 flex-shrink-0" size={14} />}
                <span>Contém letras</span>
              </div>
              <div className={`flex items-center gap-1.5 transition-colors ${hasNumber ? 'text-emerald-400 font-medium' : 'text-gray-500'}`}>
                {hasNumber ? <FiCheck className="text-emerald-400 flex-shrink-0" size={14} /> : <FiX className="text-gray-600 flex-shrink-0" size={14} />}
                <span>Contém números</span>
              </div>
              <div className={`flex items-center gap-1.5 transition-colors ${hasSpecial ? 'text-emerald-400 font-medium' : 'text-gray-500'}`}>
                {hasSpecial ? <FiCheck className="text-emerald-400 flex-shrink-0" size={14} /> : <FiX className="text-gray-600 flex-shrink-0" size={14} />}
                <span>Caractere especial</span>
              </div>
            </div>

            {confirmPassword.length > 0 && (
              <div className={`flex items-center gap-1.5 pt-1 border-t border-gray-800 transition-colors ${passwordsMatch ? 'text-emerald-400 font-medium' : 'text-rose-400'}`}>
                {passwordsMatch ? <FiCheck className="text-emerald-400 flex-shrink-0" size={14} /> : <FiX className="text-rose-400 flex-shrink-0" size={14} />}
                <span>{passwordsMatch ? 'As senhas coincidem' : 'As senhas não coincidem'}</span>
              </div>
            )}
          </div>

          {/* Botão de Salvar Nova Senha */}
          <button
            type="submit"
            disabled={isSubmitting || !isFormValid}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-4 rounded-xl transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-3 shadow-lg shadow-blue-500/20 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Salvando nova senha...</span>
              </>
            ) : (
              <span>Salvar Nova Senha</span>
            )}
          </button>
        </form>

        <div className="pt-4 text-center text-[11px] text-gray-500 mt-4">
          <p>{branding.name} © {new Date().getFullYear()}</p>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
