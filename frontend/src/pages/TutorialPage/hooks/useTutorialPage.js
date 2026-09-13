import { useState } from 'react';
import { toast } from 'react-hot-toast';

export const useTutorialPage = () => {
  const [selectedTutorial, setSelectedTutorial] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  const getPublicLink = (slug) => {
    return `${window.location.protocol}//${window.location.host}/help/${slug}`;
  };

  const handleCopyLink = (e, slug) => {
    if (e && e.stopPropagation) e.stopPropagation();
    const link = getPublicLink(slug);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(link);
    }
    setCopiedId(slug);
    toast.success('Link público de compartilhamento copiado!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleOpenNewTab = (e, slug) => {
    if (e && e.stopPropagation) e.stopPropagation();
    const link = getPublicLink(slug);
    window.open(link, '_blank');
  };

  return {
    selectedTutorial,
    setSelectedTutorial,
    copiedId,
    handleCopyLink,
    handleOpenNewTab
  };
};
