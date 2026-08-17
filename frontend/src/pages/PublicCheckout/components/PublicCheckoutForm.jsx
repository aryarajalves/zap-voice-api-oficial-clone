import React from 'react';
import { FiRefreshCw, FiShield } from 'react-icons/fi';
import DdiDropdown from './DdiDropdown';
import { sanitizePhoneNumber } from '../constants/ddiOptions';

export default function PublicCheckoutForm({
  pageConfig,
  name,
  setName,
  email,
  setEmail,
  ddi,
  setDdi,
  phone,
  setPhone,
  submitting,
  onSubmit
}) {
  return (
    <div className="bg-[#0e1322]/90 backdrop-blur-xl border border-gray-800/80 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
      <form onSubmit={onSubmit} className="space-y-5">
        {/* Campo Nome Completo */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider">
            Nome Completo
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Seu nome completo"
            required
            className="w-full px-4 py-3.5 bg-[#141b2d] border border-gray-700/60 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-sm font-medium"
          />
        </div>

        {/* Campo E-mail */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider">
            Seu melhor Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="seu@email.com"
            required
            className="w-full px-4 py-3.5 bg-[#141b2d] border border-gray-700/60 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-sm font-medium"
          />
        </div>

        {/* Campo WhatsApp com DDI Customizado Pesquisável */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider">
            WhatsApp
          </label>
          <div className="flex gap-2 relative">
            <DdiDropdown
              ddi={ddi}
              setDdi={setDdi}
              setPhone={setPhone}
            />

            {/* Number Input (Apenas DDD + Número) */}
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(sanitizePhoneNumber(e.target.value, ddi))}
              placeholder="85 99999-9999"
              required
              className="w-full px-4 py-3.5 bg-[#141b2d] border border-gray-700/60 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-sm font-medium"
            />
          </div>
        </div>

        {/* Botão de Envio Principal */}
        <button
          type="submit"
          disabled={submitting}
          className="w-full py-4 px-6 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold rounded-2xl shadow-xl shadow-blue-600/30 transition-all transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 flex items-center justify-center gap-2 text-base cursor-pointer"
        >
          {submitting ? (
            <>
              <FiRefreshCw className="animate-spin" size={18} />
              <span>Enviando dados...</span>
            </>
          ) : (
            <>
              <span>{pageConfig?.button_text || 'Continuar com Aplicação →'}</span>
            </>
          )}
        </button>
      </form>

      {/* Selo de Segurança */}
      <div className="pt-2 border-t border-gray-800/60 flex items-center justify-center gap-2 text-xs text-gray-500 font-medium">
        <FiShield size={14} className="text-gray-400" />
        <span>Seus dados estão seguros e protegidos</span>
      </div>
    </div>
  );
}
