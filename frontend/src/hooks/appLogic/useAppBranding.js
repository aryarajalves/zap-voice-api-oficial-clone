import { useState, useEffect, useCallback } from 'react';
import { API_URL } from '../../config';
import { fetchWithAuth } from '../../AuthContext';

export function useAppBranding(activeClient) {
  const [clientName, setClientName] = useState('');
  const [appBranding, setAppBranding] = useState(() => {
    try {
      const saved = localStorage.getItem('appBranding');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.name) {
          return parsed;
        }
      }
    } catch (e) {
      console.error("Erro ao carregar branding inicial do localStorage:", e);
    }
    return { name: 'ZapVoice', logo: null, logoSize: 'medium' };
  });

  const fetchSettings = useCallback(async () => {
    if (!activeClient) return;
    try {
      const res = await fetchWithAuth(`${API_URL}/settings/`, {}, activeClient.id);
      if (res.ok) {
        const data = await res.json();
        if (data.CLIENT_NAME) {
          setClientName(data.CLIENT_NAME);
        }
        setAppBranding({
          name: data.APP_NAME || 'ZapVoice',
          logo: data.APP_LOGO || null,
          logoSize: data.APP_LOGO_SIZE || 'medium',
          WA_HAS_AI_AGENT: data.WA_HAS_AI_AGENT,
          APPOINTMENTS_ENABLED: data.APPOINTMENTS_ENABLED
        });
      }
    } catch (err) {
      console.error("Erro ao buscar configurações:", err);
    }
  }, [activeClient]);

  useEffect(() => {
    if (appBranding.name) {
      // Não sobrescrever o título da aba se estivermos em uma rota de página pública
      const isPublicPage = window.location.pathname.startsWith('/p/') ||
        window.location.hash.startsWith('#/p/') ||
        (window.location.pathname.length > 1 && !['/login', '/dashboard', '/funnels', '/bulk', '/schedules', '/integrations', '/settings', '/users', '/logs', '/financial', '/checkout-presell', '/capture-page', '/blocked', '/hot-leads'].includes(window.location.pathname));

      if (!isPublicPage) {
        document.title = appBranding.name;
      }
      try {
        localStorage.setItem('appBranding', JSON.stringify(appBranding));
      } catch (e) {
        console.error("Erro ao salvar branding no localStorage:", e);
      }
    }
  }, [appBranding]);

  return {
    clientName,
    setClientName,
    appBranding,
    setAppBranding,
    fetchSettings,
  };
}
