import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { API_URL } from '../../../config';
import { fetchWithAuth } from '../../../AuthContext';

export default function useInstagramSettings(activeClient, onTokenLoaded) {
  const [instaAccountID, setInstaAccountID] = useState('');
  const [instaAccessToken, setInstaAccessToken] = useState('');
  const [isConfiguringSettings, setIsConfiguringSettings] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [tokenJaConfigurado, setTokenJaConfigurado] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [revealingToken, setRevealingToken] = useState(false);
  const [tokenRevelado, setTokenRevelado] = useState('');
  const [webhookBaseUrl, setWebhookBaseUrl] = useState('');
  const [instaWebhookSlug, setInstaWebhookSlug] = useState('');

  const onTokenLoadedRef = useRef(onTokenLoaded);
  useEffect(() => {
    onTokenLoadedRef.current = onTokenLoaded;
  }, [onTokenLoaded]);

  const fetchSettings = useCallback(async () => {
    if (!activeClient) return;
    try {
      const res = await fetchWithAuth(`${API_URL}/settings/`, {}, activeClient.id);
      if (res.ok) {
        const data = await res.json();
        setInstaAccountID(data.INSTAGRAM_ACCOUNT_ID || '');
        const hasToken = !!data.INSTAGRAM_ACCESS_TOKEN;
        setTokenJaConfigurado(hasToken);
        setWebhookBaseUrl(data.WEBHOOK_BASE_URL || '');
        setInstaWebhookSlug(data.INSTAGRAM_WEBHOOK_SLUG || '');
        setTokenRevelado('');
        setShowToken(false);
        if (hasToken && data.INSTAGRAM_ACCOUNT_ID && onTokenLoadedRef.current) {
          onTokenLoadedRef.current(true);
        }
      }
    } catch (err) {
      console.error('Erro ao carregar configurações do Instagram:', err);
    }
  }, [activeClient]);

  const handleRevealToken = async () => {
    if (tokenRevelado) {
      setShowToken(prev => !prev);
      return;
    }
    if (!activeClient || !tokenJaConfigurado) return;
    setRevealingToken(true);
    try {
      const res = await fetchWithAuth(
        `${API_URL}/settings/reveal`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: 'INSTAGRAM_ACCESS_TOKEN' })
        },
        activeClient.id
      );
      if (res.ok) {
        const data = await res.json();
        setTokenRevelado(data.value || '');
        setInstaAccessToken(data.value || '');
        setShowToken(true);
      } else {
        toast.error('Não foi possível revelar o token.');
      }
    } catch (err) {
      toast.error('Erro ao revelar o token.');
    } finally {
      setRevealingToken(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!activeClient) return;
    setIsConfiguringSettings(true);
    const loadingToast = toast.loading('Salvando configurações...');
    try {
      const settingsPayload = {
        INSTAGRAM_ACCOUNT_ID: instaAccountID,
        INSTAGRAM_WEBHOOK_SLUG: instaWebhookSlug
      };
      if (instaAccessToken.trim()) {
        settingsPayload.INSTAGRAM_ACCESS_TOKEN = instaAccessToken;
      }
      const res = await fetchWithAuth(
        `${API_URL}/settings/`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ settings: settingsPayload })
        },
        activeClient.id
      );
      if (res.ok) {
        toast.success('Configurações do Instagram salvas com sucesso!', { id: loadingToast });
        fetchSettings();
      } else {
        const err = await res.json();
        toast.error(err.detail || 'Erro ao salvar configurações.', { id: loadingToast });
      }
    } catch (err) {
      console.error(err);
      toast.error('Erro de conexão ao salvar configurações.', { id: loadingToast });
    } finally {
      setIsConfiguringSettings(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  return {
    instaAccountID,
    setInstaAccountID,
    instaAccessToken,
    setInstaAccessToken,
    isConfiguringSettings,
    isSettingsModalOpen,
    setIsSettingsModalOpen,
    tokenJaConfigurado,
    showToken,
    revealingToken,
    tokenRevelado,
    setTokenRevelado,
    webhookBaseUrl,
    instaWebhookSlug,
    setInstaWebhookSlug,
    fetchSettings,
    handleRevealToken,
    handleSaveSettings
  };
}
