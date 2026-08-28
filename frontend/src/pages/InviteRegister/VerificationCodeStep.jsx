import React, { useState, useEffect } from 'react';
import { FiMail, FiCheckCircle, FiRefreshCw, FiArrowLeft, FiShield } from 'react-icons/fi';

const VerificationCodeStep = ({
  email,
  code,
  setCode,
  onSubmit,
  onResend,
  onBack,
  isSubmitting,
  isResending
}) => {
  const [cooldown, setCooldown] = useState(60);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleResendClick = async () => {
    if (cooldown > 0 || isResending) return;
    const success = await onResend();
    if (success) {
      setCooldown(60);
    }
  };

  const cleanCode = code.replace(/\D/g, '').slice(0, 6);

  const handleCodeChange = (e) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setCode(value);
  };

  return (
    <form onSubmit={onSubmit} className="space-y-5" autoComplete="off">
      {/* Header explicativo da verificação */}
      <div className="text-center space-y-2">
        <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-400 mx-auto border border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.15)]">
          <FiShield size={24} />
        </div>
        <h2 className="text-lg font-bold text-white tracking-tight">
          Verifique seu E-mail
        </h2>
        <p className="text-gray-400 text-xs leading-relaxed px-2">
          Enviamos um código de segurança de 6 dígitos para:
        </p>
        <div className="inline-block bg-blue-900/30 border border-blue-500/40 rounded-lg px-3 py-1 text-xs text-blue-300 font-semibold break-all">
          {email}
        </div>
      </div>

      {/* Campo de Código */}
      <div className="space-y-1.5">
        <label className="block text-xs font-semibold text-gray-300 text-center">
          Digite o código de 6 dígitos
        </label>
        <div className="flex justify-center">
          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            autoFocus
            value={cleanCode}
            onChange={handleCodeChange}
            placeholder="000000"
            className="w-full max-w-[240px] text-center tracking-[10px] text-2xl font-mono font-black py-3 bg-[#0f172a] border-2 border-blue-500/50 rounded-xl text-blue-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-none transition placeholder-gray-600"
          />
        </div>
        <p className="text-[11px] text-gray-500 text-center">
          Válido por 15 minutos. Verifique também sua caixa de spam.
        </p>
      </div>

      {/* Botão de Confirmação */}
      <button
        type="submit"
        disabled={isSubmitting || cleanCode.length !== 6}
        className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-4 rounded-xl transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-4 shadow-lg shadow-blue-500/20 cursor-pointer"
      >
        {isSubmitting ? (
          <>
            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>Ativando conta...</span>
          </>
        ) : (
          <>
            <FiCheckCircle size={18} />
            <span>Confirmar e Ativar Conta</span>
          </>
        )}
      </button>

      {/* Ações Secundárias: Reenviar e Voltar */}
      <div className="pt-3 border-t border-gray-800 flex flex-col items-center gap-2.5 text-xs">
        <button
          type="button"
          onClick={handleResendClick}
          disabled={cooldown > 0 || isResending}
          className="text-blue-400 hover:text-blue-300 disabled:text-gray-500 disabled:cursor-not-allowed font-medium transition flex items-center gap-1.5 cursor-pointer"
        >
          <FiRefreshCw size={14} className={isResending ? 'animate-spin' : ''} />
          {isResending
            ? 'Enviando novo código...'
            : cooldown > 0
            ? `Reenviar código em ${cooldown}s`
            : 'Reenviar Código'}
        </button>

        <button
          type="button"
          onClick={onBack}
          disabled={isSubmitting}
          className="text-gray-400 hover:text-gray-200 transition flex items-center gap-1 cursor-pointer pt-1"
        >
          <FiArrowLeft size={14} />
          <span>Voltar e alterar dados</span>
        </button>
      </div>
    </form>
  );
};

export default VerificationCodeStep;
