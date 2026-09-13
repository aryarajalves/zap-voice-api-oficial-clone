import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { fetchWithAuth } from '../../../../AuthContext';
import { API_URL } from '../../../../config';

export function useUserModalLogic({
  userData,
  setUserData,
  editingUser,
  onInviteGenerated,
  setIsOpen
}) {
  const [validityHours, setValidityHours] = useState(24);
  const [generatedLink, setGeneratedLink] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  // Estados para Redefinição de Senha via Link
  const [resetLink, setResetLink] = useState('');
  const [resetCopied, setResetCopied] = useState(false);
  const [isGeneratingReset, setIsGeneratingReset] = useState(false);

  const handleGenerateInvite = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setIsGenerating(true);
    const loadingToast = toast.loading("Gerando convite...");
    try {
      const res = await fetchWithAuth(`${API_URL}/auth/invitations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          validity_hours: Number(validityHours),
          role: userData.role,
          client_ids: userData.client_ids,
          blocked_features: userData.blocked_features || []
        })
      });

      if (res.ok) {
        const data = await res.json();
        const link = `${window.location.origin}/invite/${data.token}`;
        setGeneratedLink(link);
        toast.success("Link de convite gerado com sucesso!");
        if (onInviteGenerated) {
          onInviteGenerated();
        }
      } else {
        const error = await res.json();
        throw new Error(error.detail || "Erro ao gerar convite.");
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsGenerating(false);
      toast.dismiss(loadingToast);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(generatedLink);
      setCopied(true);
      toast.success("Link de convite copiado!");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error("Erro ao copiar link.");
    }
  };

  const handleGenerateResetLink = async () => {
    if (!editingUser) return;
    setIsGeneratingReset(true);
    const loadingToast = toast.loading("Gerando link de redefinição...");
    try {
      const res = await fetchWithAuth(`${API_URL}/auth/users/${editingUser.id}/reset-password-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ validity_hours: 24 })
      });
      if (res.ok) {
        const data = await res.json();
        const fullLink = `${window.location.origin}/reset-password/${data.token}`;
        setResetLink(fullLink);
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(fullLink).catch(() => {});
        }
        setResetCopied(true);
        setTimeout(() => setResetCopied(false), 3000);
        toast.success("Link de redefinição gerado e copiado!");
      } else {
        const errData = await res.json();
        throw new Error(errData.detail || "Erro ao gerar link de redefinição.");
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsGeneratingReset(false);
      toast.dismiss(loadingToast);
    }
  };

  const handleCopyResetLink = () => {
    if (!resetLink) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(resetLink).catch(() => {});
    }
    setResetCopied(true);
    toast.success("Link copiado para a área de transferência!");
    setTimeout(() => setResetCopied(false), 3000);
  };

  const handleClose = () => {
    setGeneratedLink('');
    setResetLink('');
    setResetCopied(false);
    setValidityHours(24);
    setIsOpen(false);
  };

  return {
    validityHours,
    setValidityHours,
    generatedLink,
    setGeneratedLink,
    isGenerating,
    copied,
    resetLink,
    resetCopied,
    isGeneratingReset,
    handleGenerateInvite,
    handleCopyLink,
    handleGenerateResetLink,
    handleCopyResetLink,
    handleClose
  };
}
