import React, { useState, useEffect, useLayoutEffect } from 'react';
import { FiRefreshCw } from 'react-icons/fi';
import toast, { Toaster } from 'react-hot-toast';
import { getApiUrl } from '../config';

// Subcomponentes Modulares
import PublicCheckoutHeader from './PublicCheckout/components/PublicCheckoutHeader';
import PublicCheckoutForm from './PublicCheckout/components/PublicCheckoutForm';
import { sanitizePhoneNumber } from './PublicCheckout/constants/ddiOptions';

export default function PublicCheckoutPage({ slug }) {
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Título em cache para evitar qualquer milissegundo de flicker do ZapVoice ao atualizar
  const cachedTitle = typeof window !== 'undefined' && slug ? sessionStorage.getItem(`checkout_title_${slug}`) : null;

  // Configuração da Página carregada do servidor
  const [pageConfig, setPageConfig] = useState({
    title: cachedTitle || 'Aplicação Mentoria',
    page_tab_title: cachedTitle || undefined,
    description: 'Preencha seus dados para continuar com sua aplicação',
    badge_text: '⚡ Vagas Limitadas',
    destination_url: 'https://whatsapp.com',
    button_text: 'Continuar com Aplicação →'
  });

  // Campos do formulário
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [ddi, setDdi] = useState('+55');
  const [phone, setPhone] = useState('');

  // Carregar dados da página por slug
  useEffect(() => {
    const fetchPage = async () => {
      try {
        setLoadingConfig(true);
        const res = await fetch(getApiUrl(`/api/checkout-presell/public/${slug}`));
        if (res.ok) {
          const data = await res.json();
          setPageConfig(data);
        } else {
          setNotFound(true);
        }
      } catch (err) {
        console.error(err);
        setNotFound(true);
      } finally {
        setLoadingConfig(false);
      }
    };

    if (slug) {
      fetchPage();
    }
  }, [slug]);

  // Definir Título da Aba do Navegador sincronamente (evita flicker do "ZapVoice")
  useLayoutEffect(() => {
    const titleToApply = pageConfig?.page_tab_title || pageConfig?.title || cachedTitle || 'Aplicação Mentoria';
    document.title = titleToApply;
    if (slug && titleToApply) {
      sessionStorage.setItem(`checkout_title_${slug}`, titleToApply);
    }
  }, [pageConfig, slug, cachedTitle]);

  // Ler Query Params para Pré-populamento automático nativamente sem react-router-dom
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const paramName = searchParams.get('name') || searchParams.get('nome') || '';
    const paramEmail = searchParams.get('email') || '';
    const paramPhone = searchParams.get('phone') || searchParams.get('telefone') || searchParams.get('zap') || '';

    if (paramName) setName(paramName);
    if (paramEmail) setEmail(paramEmail);
    if (paramPhone) {
      setPhone(sanitizePhoneNumber(paramPhone, '+55'));
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !phone.trim()) {
      toast.error('Preencha todos os campos para continuar.', { position: 'top-right' });
      return;
    }

    try {
      setSubmitting(true);
      const cleanPhoneNumbers = phone.replace(/\D/g, '');
      const cleanDdiNumbers = ddi.replace(/\D/g, '');
      const fullPhone = `${cleanDdiNumbers}${cleanPhoneNumbers}`;

      const res = await fetch(getApiUrl(`/api/checkout-presell/public/${slug}/submit`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: fullPhone
        })
      });

      if (res.ok) {
        const data = await res.json();
        toast.success('Inscrição realizada com sucesso! Redirecionando...', {
          position: 'top-right',
          duration: 3500
        });

        // Redirecionar para URL de destino prepopulada
        if (data.redirect_url) {
          setTimeout(() => {
            window.location.href = data.redirect_url;
          }, 800);
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        toast.error(errData.detail || 'Erro ao processar sua inscrição. Tente novamente.', {
          position: 'top-right'
        });
      }
    } catch (err) {
      console.error(err);
      toast.error('Erro de conexão ao enviar dados. Tente novamente.', {
        position: 'top-right'
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingConfig) {
    return (
      <div className="min-h-screen bg-[#070a12] text-white flex items-center justify-center p-4 font-sans">
        <div className="flex flex-col items-center gap-3">
          <FiRefreshCw className="animate-spin text-blue-500" size={32} />
          <p className="text-sm text-gray-400 font-medium">Carregando página de aplicação...</p>
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-[#070a12] text-white flex items-center justify-center p-4 font-sans">
        <div className="text-center space-y-4 max-w-md bg-[#0e1322] p-8 rounded-3xl border border-gray-800 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center mx-auto text-2xl font-bold">
            404
          </div>
          <h1 className="text-2xl font-bold">Página não encontrada</h1>
          <p className="text-gray-400 text-sm">O link digitado não existe ou a página foi desativada pelo administrador.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070a12] text-white font-sans selection:bg-blue-600 selection:text-white flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-hidden">
      {/* Componente de Toasts no Canto Superior Direito */}
      <Toaster position="top-right" reverseOrder={false} />

      {/* Elementos de Iluminação Neon de Fundo */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[300px] h-[300px] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Conteúdo Centralizado */}
      <div className="w-full max-w-md mx-auto space-y-6 relative z-10">
        {/* Header Superior: Badge + Título */}
        <PublicCheckoutHeader pageConfig={pageConfig} />

        {/* Card do Formulário */}
        <PublicCheckoutForm
          pageConfig={pageConfig}
          name={name}
          setName={setName}
          email={email}
          setEmail={setEmail}
          ddi={ddi}
          setDdi={setDdi}
          phone={phone}
          setPhone={setPhone}
          submitting={submitting}
          onSubmit={handleSubmit}
        />
      </div>
    </div>
  );
}
