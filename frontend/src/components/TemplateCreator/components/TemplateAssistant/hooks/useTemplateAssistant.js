import { useState, useEffect, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { API_URL } from '../../../../../config';
import { fetchWithAuth } from '../../../../../AuthContext';

export function extractJSON(text) {
  try {
    const regex = /```json\s*([\s\S]*?)\s*```/;
    const match = text.match(regex);
    if (match && match[1]) {
      const parsed = JSON.parse(match[1]);
      if (parsed.body_text || parsed.name) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Erro ao fazer parse do JSON sugerido:', e);
  }
  return null;
}

export function useTemplateAssistant(logic) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content:
        'Olá! Sou o assistente inteligente do ZapVoice. Posso ajudar você a criar e refinar seus templates de mensagens para o WhatsApp.\n\nPara começarmos, me conte: mais ou menos do que se trata o seu template? (Ex: É para boas-vindas de pós-compra, recuperação de boleto, oferta especial, etc.)'
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [expandedCardIndex, setExpandedCardIndex] = useState(null);

  const [fieldsToApply, setFieldsToApply] = useState({
    name: true,
    category: true,
    header: true,
    body: true,
    footer: true,
    buttons: true
  });

  const chatEndRef = useRef(null);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSend = async (e) => {
    if (e) e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg = { role: 'user', content: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const history = [...messages, userMsg];
      const res = await fetchWithAuth(
        `${API_URL}/whatsapp/assistant/chat`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: history })
        },
        logic?.activeClient?.id
      );

      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => [...prev, { role: 'assistant', content: data.content }]);
      } else {
        const err = await res.json();
        toast.error(err.detail || 'Erro ao conversar com o assistente.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Erro de rede ao conectar com o assistente.');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyTemplate = (tplData) => {
    if (!tplData || !logic) return;

    const updatedData = { ...logic.formData };

    if (fieldsToApply.name && tplData.name) updatedData.name = tplData.name;
    if (fieldsToApply.category && tplData.category) updatedData.category = tplData.category;

    if (fieldsToApply.header) {
      updatedData.header_type = tplData.header_type || 'NONE';
      updatedData.header_text = tplData.header_text || '';
      updatedData.header_media_url = tplData.header_media_url || '';
    }

    if (fieldsToApply.body && tplData.body_text) updatedData.body_text = tplData.body_text;
    if (fieldsToApply.footer && tplData.footer_text) updatedData.footer_text = tplData.footer_text;

    if (fieldsToApply.buttons) {
      updatedData.buttons = Array.isArray(tplData.buttons)
        ? tplData.buttons.map((b) => ({
            type: b.type || 'QUICK_REPLY',
            text: b.text || '',
            phone_number: b.phone_number || '',
            url: b.url || ''
          }))
        : [];
    }

    logic.setFormData(updatedData);
    toast.success('Campos selecionados aplicados ao formulário com sucesso!');

    const formEl = document.getElementById('templateForm');
    if (formEl) {
      formEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const toggleField = (field) => {
    setFieldsToApply((prev) => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  return {
    isOpen,
    setIsOpen,
    isMaximized,
    setIsMaximized,
    messages,
    setMessages,
    input,
    setInput,
    loading,
    expandedCardIndex,
    setExpandedCardIndex,
    fieldsToApply,
    toggleField,
    chatEndRef,
    handleSend,
    handleApplyTemplate
  };
}

export default useTemplateAssistant;
