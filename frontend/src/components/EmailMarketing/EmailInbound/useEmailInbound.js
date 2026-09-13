import { useState, useEffect, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { API_URL } from '../../../config';
import { useClient } from '../../../contexts/ClientContext';
import { CONTACT_VARIABLES } from './constants';

export function useEmailInbound() {
  const { activeClient } = useClient();
  const [inbounds, setInbounds] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  // Estado do Drawer de Leitura / Resposta
  const [selectedInbound, setSelectedInbound] = useState(null);
  const [replySubject, setReplySubject] = useState('');
  const [replyBody, setReplyBody] = useState('');
  const [replyLoading, setReplyLoading] = useState(false);

  // Estados para Slash Command ( / ) no formulário de réplica
  const [slashActive, setSlashActive] = useState(false);
  const [slashSearch, setSlashSearch] = useState('');
  const [slashSelectedIndex, setSlashSelectedIndex] = useState(0);
  const replyBodyRef = useRef(null);

  const webhookUrl = `${window.location.origin}/api/email/inbound-webhook`;

  const getHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'X-Client-ID': activeClient?.id ? String(activeClient.id) : ''
    };
  };

  useEffect(() => {
    fetchInbounds();
  }, [activeClient, search]);

  const fetchInbounds = async () => {
    if (!activeClient) return;
    try {
      setLoading(true);
      const url = `${API_URL}/email/inbounds?search=${encodeURIComponent(search)}`;
      const res = await fetch(url, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setInbounds(data.items || []);
        setUnreadCount(data.total_unread || 0);
      }
    } catch (err) {
      console.error("Erro ao listar respostas de e-mail:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenInbound = async (item) => {
    setSelectedInbound(item);
    setReplySubject(item.subject ? (item.subject.startsWith('Re:') ? item.subject : `Re: ${item.subject}`) : 'Re: Resposta de E-mail');
    setReplyBody(`<p>Olá ${item.from_name || 'cliente'},</p>\n<p>Obrigado pelo retorno! </p>`);

    // Marcar como lida se ainda não foi
    if (!item.is_read) {
      try {
        await fetch(`${API_URL}/email/inbounds/${item.id}/read`, {
          method: 'PUT',
          headers: getHeaders()
        });
        setInbounds(prev => prev.map(i => i.id === item.id ? { ...i, is_read: true } : i));
        setUnreadCount(prev => Math.max(0, prev - 1));
      } catch (err) {
        console.error("Erro ao marcar e-mail como lido:", err);
      }
    }
  };

  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!selectedInbound || !replySubject || !replyBody) {
      return toast.error("Preencha o assunto e o corpo da resposta.");
    }
    try {
      setReplyLoading(true);
      const res = await fetch(`${API_URL}/email/inbounds/${selectedInbound.id}/reply`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          subject: replySubject,
          body_html: replyBody
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Erro ao enviar resposta.");

      toast.success(data.message || "Réplica enviada com sucesso!");
      setSelectedInbound(null);
      fetchInbounds();
    } catch (err) {
      toast.error(err.message || "Erro ao enviar resposta de e-mail.");
    } finally {
      setReplyLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
    }
    toast.success("URL do Webhook copiada para a área de transferência!");
  };

  // Inserção da variável na réplica
  const insertVariableCode = (varCode) => {
    const inputEl = replyBodyRef.current;
    const currentText = replyBody || '';

    if (inputEl && typeof inputEl.selectionStart === 'number') {
      const pos = inputEl.selectionStart;
      const textBefore = currentText.substring(0, pos);
      const textAfter = currentText.substring(pos);

      const slashMatch = textBefore.match(/\/([a-zA-Z0-9_]*)$/);
      let newText = '';
      let newCursorPos = 0;

      if (slashMatch) {
        const slashIndex = slashMatch.index;
        newText = currentText.substring(0, slashIndex) + varCode + ' ' + textAfter;
        newCursorPos = slashIndex + varCode.length + 1;
      } else {
        newText = textBefore + varCode + ' ' + textAfter;
        newCursorPos = pos + varCode.length + 1;
      }

      setReplyBody(newText);

      setTimeout(() => {
        if (inputEl) {
          inputEl.focus();
          inputEl.setSelectionRange(newCursorPos, newCursorPos);
        }
      }, 50);
    } else {
      setReplyBody(currentText + ` ${varCode} `);
    }
    setSlashActive(false);
  };

  const handleBodyChange = (e) => {
    const val = e.target.value;
    setReplyBody(val);

    const pos = e.target.selectionStart;
    const textBefore = val.substring(0, pos);
    const slashMatch = textBefore.match(/\/([a-zA-Z0-9_]*)$/);

    if (slashMatch) {
      setSlashActive(true);
      setSlashSearch(slashMatch[1].toLowerCase());
      setSlashSelectedIndex(0);
    } else {
      setSlashActive(false);
    }
  };

  const filteredSlashVars = CONTACT_VARIABLES.filter(v =>
    v.code.toLowerCase().includes(slashSearch) ||
    v.label.toLowerCase().includes(slashSearch)
  );

  return {
    inbounds,
    unreadCount,
    loading,
    search,
    setSearch,
    selectedInbound,
    setSelectedInbound,
    replySubject,
    setReplySubject,
    replyBody,
    setReplyBody,
    replyLoading,
    slashActive,
    replyBodyRef,
    webhookUrl,
    fetchInbounds,
    handleOpenInbound,
    handleSendReply,
    copyToClipboard,
    insertVariableCode,
    handleBodyChange,
    filteredSlashVars
  };
}
