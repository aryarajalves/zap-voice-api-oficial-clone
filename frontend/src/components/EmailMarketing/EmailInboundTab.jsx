import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'react-hot-toast';
import { FiMessageSquare, FiMail, FiSearch, FiCheck, FiSend, FiX, FiCopy, FiInfo, FiClock, FiUser, FiZap, FiCode } from 'react-icons/fi';
import { API_URL } from '../../config';
import { useClient } from '../../contexts/ClientContext';

const CONTACT_VARIABLES = [
  { code: '{{nome}}', label: 'Nome do Contato', desc: 'Nome completo do lead' },
  { code: '{{email}}', label: 'E-mail do Contato', desc: 'Endereço de e-mail principal' },
  { code: '{{phone}}', label: 'Telefone do Contato', desc: 'Número de telefone / WhatsApp' },
  { code: '{{produto}}', label: 'Nome do Produto', desc: 'Produto comprado pelo lead' },
  { code: '{{plataforma}}', label: 'Plataforma de Origem', desc: 'Ex: Hotmart, Kiwify, Eduzz, etc' },
  { code: '{{valor}}', label: 'Valor da Compra', desc: 'Preço / Valor transacionado' },
];

export default function EmailInboundTab() {
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
    navigator.clipboard.writeText(text);
    toast.success("URL do Webhook copiada para a área de transferência!");
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    try {
      const d = new Date(dateStr);
      return d.toLocaleString('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return dateStr;
    }
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

  return (
    <div className="space-y-6">
      {/* Card Informativo do Webhook de Entrada */}
      <div className="bg-gradient-to-r from-blue-600/10 via-indigo-600/10 to-purple-600/10 p-5 rounded-2xl border border-blue-500/20 backdrop-blur-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h3 className="text-sm font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <FiInfo className="text-blue-500" /> Webhook de Captura de Respostas (Inbound Emails)
          </h3>
          <p className="text-xs text-gray-600 dark:text-gray-300">
            Configure esta URL de Webhook no seu provedor de e-mail (Resend Inbound, Amazon SES ou Cloudflare) para receber todas as respostas dos leads direto no ZapVoice.
          </p>
          <div className="flex items-center gap-2 pt-1 font-mono text-xs text-blue-600 dark:text-blue-400 bg-white/60 dark:bg-slate-900/60 px-3 py-1.5 rounded-xl border border-blue-500/20 w-fit">
            <span>{webhookUrl}</span>
            <button onClick={() => copyToClipboard(webhookUrl)} className="hover:text-blue-800 dark:hover:text-blue-200">
              <FiCopy />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-4 py-2 bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-white/10 text-center">
            <span className="text-xs text-gray-500 dark:text-gray-400 block">Total Recebidos</span>
            <span className="text-lg font-black text-gray-800 dark:text-white">{inbounds.length}</span>
          </div>
          <div className="px-4 py-2 bg-blue-500/10 rounded-xl border border-blue-500/20 text-center">
            <span className="text-xs text-blue-600 dark:text-blue-400 block font-bold">Não Lidas</span>
            <span className="text-lg font-black text-blue-600 dark:text-blue-400">{unreadCount}</span>
          </div>
        </div>
      </div>

      {/* Barra de Filtro e Busca */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            placeholder="Buscar por lead, e-mail ou assunto..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full px-3.5 py-2 pl-9 bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs text-gray-800 dark:text-white shadow-sm"
          />
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        </div>
        <button
          onClick={fetchInbounds}
          className="px-3.5 py-2 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 rounded-xl text-xs font-semibold hover:bg-gray-200"
        >
          Atualizar Lista
        </button>
      </div>

      {/* Tabela de Respostas Recebidas */}
      {loading ? (
        <div className="p-8 text-center text-gray-400">Carregando respostas recebidas...</div>
      ) : inbounds.length === 0 ? (
        <div className="bg-white dark:bg-slate-800/80 p-8 rounded-2xl border border-gray-100 dark:border-white/10 text-center space-y-3">
          <FiMessageSquare size={40} className="mx-auto text-gray-400" />
          <h3 className="font-bold text-gray-700 dark:text-gray-200">Nenhuma resposta recebida até o momento</h3>
          <p className="text-xs text-gray-500">As respostas enviadas pelos seus leads aparecerão nesta lista em tempo real.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800/80 backdrop-blur-md rounded-2xl border border-gray-100 dark:border-white/10 shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 dark:bg-slate-900/60 text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider border-b border-gray-100 dark:border-gray-700">
                <tr>
                  <th className="p-4">Status</th>
                  <th className="p-4">Remetente / Lead</th>
                  <th className="p-4">Assunto</th>
                  <th className="p-4">Data / Hora (Brasília)</th>
                  <th className="p-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                {inbounds.map(item => (
                  <tr
                    key={item.id}
                    className={`hover:bg-blue-500/5 transition-colors cursor-pointer ${
                      !item.is_read ? 'bg-blue-500/10 font-bold' : ''
                    }`}
                    onClick={() => handleOpenInbound(item)}
                  >
                    <td className="p-4">
                      {!item.is_read ? (
                        <span className="px-2.5 py-1 bg-blue-500 text-white text-[10px] font-bold rounded-full animate-pulse shadow-sm">
                          NOVA
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-[10px] font-semibold rounded-full">
                          LIDA
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-blue-600/10 text-blue-600 rounded-full flex items-center justify-center font-bold">
                          <FiUser size={12} />
                        </div>
                        <div>
                          <div className="text-gray-800 dark:text-white">{item.from_name || 'Lead sem nome'}</div>
                          <div className="text-[11px] text-gray-400 font-mono">{item.from_email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="text-gray-800 dark:text-white max-w-xs truncate">{item.subject || 'Sem assunto'}</div>
                    </td>
                    <td className="p-4 text-gray-500 font-mono text-[11px]">
                      <div className="flex items-center gap-1">
                        <FiClock size={12} /> {formatDate(item.created_at)}
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleOpenInbound(item); }}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-[11px] transition-all shadow-sm"
                      >
                        Ver & Responder
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal / Drawer para Leitura e Resposta Direta usando React Portal */}
      {selectedInbound && createPortal(
        <div className="fixed inset-0 z-[99990] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-3xl w-full border border-gray-100 dark:border-white/10 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-700">
              <div>
                <h3 className="text-base font-bold text-gray-800 dark:text-white flex items-center gap-2">
                  <FiMail className="text-blue-500" /> Resposta de {selectedInbound.from_name || selectedInbound.from_email}
                </h3>
                <p className="text-xs text-gray-400 font-mono mt-0.5">
                  De: {selectedInbound.from_email} | Recebido em: {formatDate(selectedInbound.created_at)}
                </p>
              </div>
              <button onClick={() => setSelectedInbound(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <FiX size={20} />
              </button>
            </div>

            {/* Mensagem Recebida do Lead */}
            <div className="bg-gray-50 dark:bg-slate-900/80 p-4 rounded-xl border border-gray-200 dark:border-gray-700 space-y-2">
              <div className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center justify-between">
                <span>📌 Assunto: {selectedInbound.subject}</span>
                <span className="text-[10px] text-blue-500 font-mono uppercase">Via {selectedInbound.provider}</span>
              </div>
              <div className="text-xs text-gray-800 dark:text-gray-200 font-mono whitespace-pre-wrap leading-relaxed pt-2 border-t border-gray-200 dark:border-gray-800">
                {selectedInbound.body_text || selectedInbound.body_html.replace(/<[^>]*>?/gm, '')}
              </div>
            </div>

            {/* Formulário de Réplica para o Lead */}
            <form onSubmit={handleSendReply} className="space-y-3 pt-2">
              <h4 className="text-xs font-bold text-gray-800 dark:text-white flex items-center gap-1.5">
                <FiSend className="text-blue-500" /> Enviar Resposta para {selectedInbound.from_email}
              </h4>

              <div>
                <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Assunto da Réplica *
                </label>
                <input
                  type="text"
                  required
                  value={replySubject}
                  onChange={e => setReplySubject(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-900 border border-gray-300 dark:border-gray-700 rounded-xl text-xs text-gray-800 dark:text-white"
                />
              </div>

              <div className="relative">
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300">
                    Mensagem de Resposta (HTML / Texto) *
                  </label>
                  <span className="text-[10px] text-gray-400">Digite <kbd className="px-1 bg-gray-200 dark:bg-gray-700 rounded font-mono font-bold">/</kbd> para variáveis</span>
                </div>

                <textarea
                  ref={replyBodyRef}
                  rows={6}
                  required
                  value={replyBody}
                  onChange={handleBodyChange}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-900 border border-gray-300 dark:border-gray-700 rounded-xl text-xs text-gray-800 dark:text-white font-mono leading-relaxed resize-y"
                />

                {/* Popover Autocomplete Slash Command */}
                {slashActive && filteredSlashVars.length > 0 && (
                  <div className="absolute left-3 bottom-10 w-64 bg-white dark:bg-slate-800 border border-blue-500/40 rounded-xl shadow-2xl z-[999999] overflow-hidden">
                    <div className="p-1.5 bg-blue-600 text-white text-[10px] font-bold uppercase">Variáveis do Contato</div>
                    <div className="max-h-40 overflow-y-auto p-1">
                      {filteredSlashVars.map(v => (
                        <button
                          key={v.code}
                          type="button"
                          onClick={() => insertVariableCode(v.code)}
                          className="w-full text-left p-1.5 rounded hover:bg-blue-500/10 text-xs font-mono text-blue-600 dark:text-blue-400 block"
                        >
                          {v.code} - <span className="text-gray-500 text-[10px] font-sans">{v.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedInbound(null)}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={replyLoading}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/20 flex items-center gap-2"
                >
                  <FiSend size={14} /> {replyLoading ? 'Enviando Réplica...' : 'Enviar Resposta'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
