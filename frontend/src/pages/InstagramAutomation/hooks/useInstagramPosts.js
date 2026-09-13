import { useState, useCallback } from 'react';
import { API_URL } from '../../../config';
import { fetchWithAuth } from '../../../AuthContext';

export default function useInstagramPosts(activeClient, tokenJaConfigurado) {
  const [instagramPosts, setInstagramPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [postsError, setPostsError] = useState('');

  const fetchInstagramPosts = useCallback(async (forceHasToken = null) => {
    if (!activeClient) return;
    const hasToken = forceHasToken !== null ? forceHasToken : tokenJaConfigurado;
    if (!hasToken) return;
    setLoadingPosts(true);
    setPostsError('');
    try {
      const res = await fetchWithAuth(`${API_URL}/instagram/posts`, {}, activeClient.id);
      if (res.ok) {
        const data = await res.json();
        setInstagramPosts(data);
      } else {
        const err = await res.json();
        setPostsError(err.detail || "Não foi possível carregar os posts do Instagram.");
      }
    } catch (err) {
      console.error(err);
      setPostsError("Erro ao conectar ao servidor para buscar posts.");
    } finally {
      setLoadingPosts(false);
    }
  }, [activeClient, tokenJaConfigurado]);

  return {
    instagramPosts,
    setInstagramPosts,
    loadingPosts,
    postsError,
    fetchInstagramPosts
  };
}
