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
    let thankYouMode = false;

    const path = window.location.pathname;
    const hash = window.location.hash;

    if (path.includes('/obrigado') || hash.includes('/obrigado')) {
      thankYouMode = true;
      setIsThankYou(true);
    }

    if (!activeSlug) {
      if (path.length > 1 && !path.startsWith('/p/')) {
        activeSlug = path.replace('/', '').split('/')[0];
      } else if (hash.startsWith('#/')) {
        const cleanHash = hash.replace('#/p/', '').replace('#/', '');
        activeSlug = cleanHash.split('/')[0];
      }
    }

    if (activeSlug) {
      setSlug(activeSlug);
      fetchPublicConfig(activeSlug, thankYouMode);
    } else {
      setLoading(false);
      setError('Página não encontrada.');
    }
  }, [slugOverride]);

  const fetchPublicConfig = async (targetSlug, thankYouMode = false) => {
    try {
      setLoading(true);
      setError('');
      const res = await fetch(getApiUrl(`/api/p/${targetSlug}`));
      if (!res.ok) {
        throw new Error('Página de captura não encontrada.');
      }
      const data = await res.json();
      setConfig(data);

      // Definir título da aba do navegador dinamicamente
      if (thankYouMode && data.thank_you_title) {
        document.title = data.thank_you_title;
      } else if (data.main_title) {
        document.title = data.main_title;
      } else if (data.headline) {
        document.title = data.headline;
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
      if (window.location.pathname.length > 1) {
        window.history.pushState({}, '', `/${slug}/obrigado`);
      } else {
        window.location.hash = `#/${slug}/obrigado`;
      }
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
      <div className="min-h-screen bg-[#0b1017] text-white flex flex-col items-center justify-center p-4 font-sans relative overflow-hidden">
        {/* Glow suave e discreto no centro */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-emerald-500/5 blur-[140px] rounded-full pointer-events-none" />

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

  // Visual Principal da Página de Captura (Alinhado à esquerda com imagem de fundo Matrix/Neon)
  return (
    <div className="min-h-screen bg-[#060a0f] text-white flex flex-col justify-center p-6 sm:p-12 font-sans relative overflow-hidden">
      {/* Imagem de Fundo customizada cobrindo 100% da tela */}
      {config?.bg_image_url && (
        <div 
          className="fixed inset-0 w-full h-full bg-cover bg-center bg-no-repeat z-0"
          style={{ backgroundImage: `url(${config.bg_image_url})` }}
        >
          {/* Overlay em gradiente escuro profissional para equilibrar o contraste e não estourar a imagem */}
          <div className="absolute inset-0 bg-gradient-to-r from-gray-950/90 via-gray-950/70 to-gray-950/40" />
        </div>
      )}

      {/* Glow Neon de Fundo */}
      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-emerald-500/10 blur-[160px] rounded-full pointer-events-none" />

      {/* Container Principal com Conteúdo Alinhado à Esquerda (Assim como na Imagem de Referência) */}
      <div className="max-w-md w-full relative z-10 space-y-6">

        {/* Headline em Destaque (ex: INTENSIVO) */}
        {config?.headline && (
          <h2 className="text-4xl sm:text-5xl font-black text-white tracking-widest uppercase leading-none drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]">
            {config.headline}
          </h2>
        )}

        {/* Badge do Instrutor e Status AO VIVO */}
        <div className="flex items-center gap-3">
          <span className="text-base font-bold text-gray-200 drop-shadow">
            {config?.badge_text || 'Aulas do Miguel'}
          </span>
          {config?.badge_status && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-red-600/30 border border-red-500/50 text-red-400 uppercase tracking-wider shadow-lg">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
              {config.badge_status}
            </span>
          )}
        </div>

        {/* Pill da Data do Evento com Borda Neon Fluorescente */}
        {config?.event_date && (
          <div className="inline-flex items-center gap-2.5 px-6 py-2.5 rounded-full bg-black/60 border border-emerald-500 text-emerald-400 font-extrabold text-sm shadow-[0_0_20px_rgba(16,185,129,0.4)] backdrop-blur-md">
            <span>📅</span>
            <span>{config.event_date}</span>
          </div>
        )}

        {/* Título Principal (ex: VOCÊ ESTÁ QUASE LÁ!) */}
        <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white drop-shadow-md">
          {config?.main_title || 'VOCÊ ESTÁ QUASE LÁ!'}
        </h1>

        {/* Descrição com destaque em Texto Verde Fluorescente */}
        <p className="text-sm text-gray-300 leading-relaxed max-w-sm drop-shadow">
          {config?.main_description ? (
            <span>{config.main_description}</span>
          ) : (
            <>
              Cadastre seu melhor email para receber o link de acesso e <span className="text-emerald-400 font-bold">garantir sua vaga no intensivo.</span>
            </>
          )}
        </p>

        {/* Mensagem de Erro de Validação */}
        {error && (
          <div className="p-3.5 bg-red-500/20 border border-red-500/40 rounded-xl text-red-400 text-xs font-semibold backdrop-blur-md">
            {error}
          </div>
        )}

        {/* Formulário de Captura */}
        <form onSubmit={handleSubmit} className="space-y-4 max-w-sm">
          <div>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={config?.email_placeholder || 'Seu melhor email'}
              className="w-full bg-black/60 border border-gray-800 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/40 text-white placeholder-gray-500 rounded-2xl px-5 py-4 font-medium text-sm transition-all outline-none backdrop-blur-md shadow-inner"
            />
          </div>

          {/* Botão Neon Verde Fluorescente */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-4 px-6 bg-[#00ff55] hover:bg-[#00e64d] text-black font-black rounded-2xl shadow-[0_0_30px_rgba(0,255,85,0.6)] transition-all transform hover:scale-[1.02] active:scale-[0.98] uppercase text-sm tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
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
        <div className="flex items-center gap-2 text-xs text-gray-400 max-w-sm drop-shadow">
          <span>🔒</span>
          <span>{config?.footer_note || 'Seus dados estão seguros. Não enviamos spam.'}</span>
        </div>

      </div>
    </div>
  );
}
