import { toast } from 'react-hot-toast';

export async function copyTextToClipboard(text) {
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (err) {
    console.warn('navigator.clipboard falhou, usando fallback de textarea:', err);
  }
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    textarea.style.top = '-9999px';
    textarea.style.opacity = '0';
    textarea.style.userSelect = 'text';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    textarea.setSelectionRange(0, textarea.value.length);
    const successful = document.execCommand('copy');
    document.body.removeChild(textarea);
    return successful;
  } catch (fallbackErr) {
    console.error('Fallback execCommand falhou:', fallbackErr);
    return false;
  }
}

export function useCopyContacts({
  selectedPhones = [],
  safeModalContacts = [],
  totalCount = 0,
  isClientSidePaging = false,
  getAllTargetContacts,
  getContactPhone = (c) => (typeof c === 'string' ? c : c?.phone_number || c?.phone || null)
}) {
  const handleCopyContacts = async () => {
    let phonesToCopy = [];
    let copyToast = null;
    try {
      if (selectedPhones.length > 0) {
        phonesToCopy = selectedPhones;
      } else if (safeModalContacts.length >= totalCount || totalCount <= 20 || isClientSidePaging) {
        phonesToCopy = (safeModalContacts || []).map(getContactPhone).filter(Boolean);
      } else {
        copyToast = toast.loading(`Buscando todos os ${totalCount} contatos de todas as páginas...`);
        const allContacts = await getAllTargetContacts();
        phonesToCopy = (allContacts || []).map(getContactPhone).filter(Boolean);
      }

      if (phonesToCopy.length === 0) {
        if (copyToast) {
          toast.error('Nenhum contato disponível para copiar.', { id: copyToast });
        } else {
          toast.error('Nenhum contato disponível para copiar.');
        }
        return;
      }

      const text = phonesToCopy.join('\n');
      await copyTextToClipboard(text);

      const count = phonesToCopy.length;
      const msg = count === 1 ? '1 contato copiado para a área de transferência!' : `${count} contatos copiados para a área de transferência!`;
      if (copyToast) {
        toast.success(msg, { id: copyToast });
      } else {
        toast.success(msg);
      }
    } catch (err) {
      console.error('Erro ao copiar contatos:', err);
      if (copyToast) {
        toast.error('Erro ao copiar contatos.', { id: copyToast });
      } else {
        toast.error('Erro ao copiar contatos.');
      }
    }
  };

  return {
    handleCopyContacts,
    copyTextToClipboard
  };
}
