import React, { useState } from 'react';
import { FiEye, FiEyeOff, FiUser, FiMail, FiLock, FiCheck, FiX, FiKey } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { generateSecurePassword } from '../../utils/passwordGenerator';

const RegisterFormStep = ({
  fullName,
  setFullName,
  email,
  setEmail,
  password,
  setPassword,
  confirmPassword,
  setConfirmPassword,
  onSubmit,
  isSubmitting
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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

  const isFormValid = fullName.trim().length > 0 &&
                      email.trim().length > 0 &&
                      hasMinLength &&
                      hasLetter &&
                      hasNumber &&
                      hasSpecial &&
                      passwordsMatch;

  return (
    <form onSubmit={onSubmit} className="space-y-4" autoComplete="off">
      {/* Hidden inputs para desativar autofill agressivo de navegadores */}
      <input type="text" name="prevent_autofill_user" style={{ display: 'none' }} />
      <input type="password" name="prevent_autofill_pwd" style={{ display: 'none' }} />

      {/* Nome Completo */}
      <div>
        <label className="block text-xs font-semibold text-gray-300 mb-1">
          Nome Completo
        </label>
        <div className="relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500">
            <FiUser size={18} />
          </span>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            autoComplete="off"
            className="w-full pl-10 pr-4 py-2.5 bg-[#0f172a] border border-gray-700 rounded-xl text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition placeholder-gray-500 text-sm"
            placeholder="Seu nome completo"
          />
        </div>
      </div>

      {/* Endereço de E-mail */}
      <div>
        <label className="block text-xs font-semibold text-gray-300 mb-1">
          Endereço de E-mail
        </label>
        <div className="relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500">
            <FiMail size={18} />
          </span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="off"
            className="w-full pl-10 pr-4 py-2.5 bg-[#0f172a] border border-gray-700 rounded-xl text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition placeholder-gray-500 text-sm"
            placeholder="exemplo@email.com"
          />
        </div>
      </div>

      {/* Senha de Acesso */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="block text-xs font-semibold text-gray-300">
            Senha de Acesso (Mínimo 12 caracteres)
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
            placeholder="Sua senha de acesso"
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

      {/* Confirmação da Senha */}
      <div>
        <label className="block text-xs font-semibold text-gray-300 mb-1">
          Confirmar Senha
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
            placeholder="Confirme sua senha de acesso"
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

      {/* Botão de Enviar Código e Prosseguir */}
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
            <span>Enviando código...</span>
          </>
        ) : (
          <span>Registrar e Ativar Conta</span>
        )}
      </button>
    </form>
  );
};

export default RegisterFormStep;
