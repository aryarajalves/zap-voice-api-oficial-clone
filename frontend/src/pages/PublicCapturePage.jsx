import React, { useState, useEffect } from 'react';
import { getApiUrl } from '../config';

export default function PublicCapturePage({ slugOverride }) {
  const [slug, setSlug] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [config, setConfig] = useState(null);

  // Form State
  const [email, setEmail] = useState('');

  // Thank You State
  const [isThankYou, setIsThankYou] = useState(false);
  const [thankYouData, setThankYouData] = useState(null);

  useEffect(() => {
    let activeSlug = slugOverride;
    if (!activeSlug) {
      const hash = window.location.hash; // e.g. #/p/masterclass or #/p/masterclass/obrigado
      if (hash.startsWith('#/p/')) {
        const parts = hash.replace('#/p/', '').split('/');
        activeSlug = parts[0];
        if (parts[1] === 'obrigado') {
          setIsThankYou(true);
        }
      }
    }

    if (activeSlug) {
      setSlug(activeSlug);
      fetchPublicConfig(activeSlug);
    } else {
      setLoading(false);
      setError('Página não encontrada.');
    }
  }, [slugOverride]);

  const fetchPublicConfig = async (targetSlug) => {
    try {
      setLoading(true);
      setError('');
      const res = await fetch(getApiUrl(`/api/p/${targetSlug}`));
      if (!res.ok) {
        throw new Error('Página de captura não encontrada.');
      }
      const data = await res.json();
      setConfig(data);
      if (data.main_title) {
        document.title = data.main_title;
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'Erro ao carregar página.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      setError('Por favor, informe um e-mail válido.');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      const res = await fetch(getApiUrl(`/api/p/${slug}/submit`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Erro ao registrar sua inscrição.');
      }

      setThankYouData(data);
      setIsThankYou(true);
      window.location.hash = `#/p/${slug}/obrigado`;
    } catch (err) {
      console.error(err);
      setError(err.message || 'Erro ao processar. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#060a0f] text-white flex flex-col items-center justify-center p-4 font-sans">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-gray-400 text-sm font-medium">Carregando conteúdo...</p>
      </div>
    );
  }

  if (error && !config) {
    return (
      <div className="min-h-screen bg-[#060a0f] text-white flex flex-col items-center justify-center p-4 font-sans text-center">
        <div className="max-w-md w-full bg-[#0b121a]/90 backdrop-blur-xl border border-red-500/30 p-8 rounded-2xl shadow-2xl">
          <div className="w-14 h-14 bg-red-500/10 text-red-400 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
            !
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Ops! Página indisponível</h2>
          <p className="text-gray-400 text-sm mb-6">{error}</p>
        </div>
      </div>
    );
  }

  // Visual da Página de Obrigado
  if (isThankYou) {
    const title = thankYouData?.thank_you_title || config?.thank_you_title || "Inscrição Confirmada!";
    const desc = thankYouData?.thank_you_description || config?.thank_you_description || "Entre no grupo VIP do WhatsApp para receber o link de acesso.";
    const groupUrl = thankYouData?.redirect_url || config?.whatsapp_group_url || "https://chat.whatsapp.com/";
    const btnText = thankYouData?.whatsapp_button_text || config?.whatsapp_button_text || "ENTRAR NO GRUPO DO WHATSAPP";

    return (
      <div className="min-h-screen bg-[#060a0f] text-white flex flex-col items-center justify-center p-4 font-sans relative overflow-hidden">
        {/* Glow de fundo */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-emerald-500/10 blur-[120px] rounded-full pointer-events-none" />

        <div className="max-w-md w-full bg-[#091119]/90 backdrop-blur-2xl border border-emerald-500/30 p-8 rounded-3xl shadow-[0_0_50px_rgba(16,185,129,0.15)] text-center relative z-10">
          {/* Ícone Check Animado */}
          <div className="w-20 h-20 bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 rounded-full flex items-center justify-center mx-auto mb-6 text-3xl shadow-[0_0_20px_rgba(16,185,129,0.4)] animate-bounce">
            ✓
          </div>

          <h1 className="text-2xl font-extrabold text-white tracking-wide uppercase mb-3">
            {title}
          </h1>

          <p className="text-gray-300 text-sm leading-relaxed mb-8">
            {desc}
          </p>

          {/* Botão de Redirecionamento para o Grupo VIP no WhatsApp */}
          <a
            href={groupUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-4 px-6 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold rounded-2xl shadow-[0_0_30px_rgba(16,185,129,0.5)] transition-all transform hover:scale-105 active:scale-95 flex items-center justify-center gap-3 uppercase text-sm tracking-wider"
          >
            <span>💬</span>
            <span>{btnText}</span>
          </a>

          <p className="text-xs text-gray-500 mt-6">
            Você será direcionado diretamente para o aplicativo do WhatsApp.
          </p>
        </div>
      </div>
    );
  }

  // Visual Principal da Página de Captura (Inspirado no Design Dark/Neon Matrix da Imagem)
  return (
    <div className="min-h-screen bg-[#060a0f] text-white flex flex-col items-center justify-center p-4 font-sans relative overflow-hidden">
      {/* Glow Neon Superior */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-emerald-500/10 blur-[150px] rounded-full pointer-events-none" />

      {/* Container Central com Borda Neon e Efeito Vibe Matrix */}
      <div className="max-w-lg w-full bg-[#080d14]/95 backdrop-blur-2xl border border-emerald-500/30 p-8 sm:p-10 rounded-3xl shadow-[0_0_60px_rgba(16,185,129,0.12)] text-center relative z-10">

        {/* Headline em Destaque */}
        {config?.headline && (
          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-widest uppercase mb-1">
            {config.headline}
          </h2>
        )}

        {/* Badge do Instrutor e Status AO VIVO */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <span className="text-sm font-semibold text-gray-300">
            {config?.badge_text || 'Aulas do Miguel'}
          </span>
          {config?.badge_status && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-red-500/20 border border-red-500/40 text-red-400 uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
              {config.badge_status}
            </span>
          )}
        </div>

        {/* Pill da Data do Evento com Borda Neon */}
        {config?.event_date && (
          <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-emerald-950/40 border border-emerald-500/40 text-emerald-400 font-bold text-xs sm:text-sm mb-8 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
            <span>📅</span>
            <span>{config.event_date}</span>
          </div>
        )}

        {/* Título Principal */}
        <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white mb-3">
          {config?.main_title || 'VOCÊ ESTÁ QUASE LÁ!'}
        </h1>

        {/* Descrição em Texto Verde Fluorescente */}
        <p className="text-sm text-gray-300 leading-relaxed mb-8 max-w-md mx-auto">
          {config?.main_description ? (
            <span className="text-emerald-400 font-semibold">{config.main_description}</span>
          ) : (
            'Cadastre seu melhor email para receber o link de acesso e garantir sua vaga no intensivo.'
          )}
        </p>

        {/* Mensagem de Erro de Validação */}
        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs font-medium">
            {error}
          </div>
        )}

        {/* Formulário de Captura */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={config?.email_placeholder || 'Seu melhor email'}
              className="w-full bg-[#0d1622] border border-gray-800 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 text-white placeholder-gray-500 rounded-2xl px-5 py-4 text-center font-medium text-sm transition-all outline-none"
            />
          </div>

          {/* Botão Neon Verde */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-4 px-6 bg-emerald-500 hover:bg-emerald-400 text-black font-black rounded-2xl shadow-[0_0_25px_rgba(16,185,129,0.4)] transition-all transform hover:scale-[1.02] active:scale-[0.98] uppercase text-sm tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <span className="inline-flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                Processando...
              </span>
            ) : (
              config?.button_text || 'QUERO PARTICIPAR DO INTENSIVO!'
            )}
          </button>
        </form>

        {/* Nota de Segurança e Privacidade */}
        <div className="flex items-center justify-center gap-2 text-xs text-gray-500 mt-6">
          <span>🔒</span>
          <span>{config?.footer_note || 'Seus dados estão seguros. Não enviamos spam.'}</span>
        </div>

      </div>
    </div>
  );
}
