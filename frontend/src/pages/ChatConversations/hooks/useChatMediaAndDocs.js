import { useState, useEffect } from 'react';
import { API_URL } from '../../../config';
import { fetchWithAuth } from '../../../AuthContext';

const INITIAL_MEDIA_DATA = {
  total_media: 0,
  total_docs: 0,
  total_links: 0,
  total_notes: 0,
  total_all: 0,
  media: [],
  docs: [],
  links: [],
  notes: []
};

export function useChatMediaAndDocs({ activeClient, selectedConvo, setPrivateNote }) {
  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);
  const [mediaData, setMediaData] = useState(INITIAL_MEDIA_DATA);
  const [isLoadingMedia, setIsLoadingMedia] = useState(false);

  const loadConversationMedia = async (convoId) => {
    if (!activeClient?.id || !convoId) return;
    setIsLoadingMedia(true);
    try {
      const res = await fetchWithAuth(`${API_URL}/chat/conversations/${convoId}/media-and-docs`, {}, activeClient.id);
      if (res.ok) {
        const data = await res.json();
        setMediaData(data);
      } else {
        setMediaData(INITIAL_MEDIA_DATA);
      }
    } catch (err) {
      setMediaData(INITIAL_MEDIA_DATA);
    } finally {
      setIsLoadingMedia(false);
    }
  };

  useEffect(() => {
    if (setPrivateNote) setPrivateNote('');
    if (selectedConvo?.id) {
      loadConversationMedia(selectedConvo.id);
    } else {
      setMediaData(INITIAL_MEDIA_DATA);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedConvo?.id]);

  return {
    isMediaModalOpen,
    setIsMediaModalOpen,
    mediaData,
    setMediaData,
    isLoadingMedia,
    setIsLoadingMedia,
    loadConversationMedia
  };
}
