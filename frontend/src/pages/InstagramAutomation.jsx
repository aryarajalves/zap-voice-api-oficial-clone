import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { FiPlus, FiTrash2, FiEdit2, FiZap, FiSettings, FiCheckCircle, FiXCircle, FiEye, FiEyeOff } from 'react-icons/fi';
import { API_URL } from '../config';
import { useClient } from '../contexts/ClientContext';
import { fetchWithAuth } from '../AuthContext';
import { toast } from 'react-hot-toast';
import ConfirmModal from '../components/ConfirmModal';

export default function InstagramAutomation() {
  const { activeClient } = useClient();
  const [automations, setAutomations] = useState([]);
  const [funnels, setFunnels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Form State
  const [editingId, setEditingId] = useState(null);
  const [name, setName] = useState('');
  const [postId, setPostId] = useState('all');
  const [triggerType, setTriggerType] = useState('keyword');
  const [keywords, setKeywords] = useState('');
  const [actionType, setActionType] = useState('both');
  const [replyComments, setReplyComments] = useState(['']);
  const [funnelId, setFunnelId] = useState('');
  const [isActive, setIsActive] = useState(true);

  // Settings configs
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

  // Confirm delete
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Instagram Posts state
  const [instagramPosts, setInstagramPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [postsError, setPostsError] = useState('');
  const [selectedPostIds, setSelectedPostIds] = useState(['all']);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const fetchAutomations = async () => {
    if (!activeClient) return;
    setLoading(true);
    try {
      const res = await fetchWithAuth(`${API_URL}/instagram/automations`, {}, activeClient.id);
      if (res.ok) {
        const data = await res.json();
        setAutomations(data);
      }
    } catch (err) {
      console.error("Erro ao buscar automações:", err);
      toast.error("Erro ao carregar automações do Instagram.");
    } finally {
      setLoading(false);
    }
  };

  const fetchFunnels = async () => {
    if (!activeClient) return;
    try {
      const res = await fetchWithAuth(`${API_URL}/funnels`, {}, activeClient.id);
      if (res.ok) {
        const data = await res.json();
        setFunnels(data);
      }
    } catch (err) {
      console.error("Erro ao buscar funis:", err);
    }
  };

  const fetchSettings = async () => {
    if (!activeClient) return;
    try {
      const res = await fetchWithAuth(`${API_URL}/settings/`, {}, activeClient.id);
      if (res.ok) {
        const data = await res.json();
        setInstaAccountID(data.INSTAGRAM_ACCOUNT_ID || '');
        // O backend mascara o token (ex: EAAb****7xyz) — se vier preenchido, já foi configurado
        setTokenJaConfigurado(!!(data.INSTAGRAM_ACCESS_TOKEN));
        setWebhookBaseUrl(data.WEBHOOK_BASE_URL || '');
        setInstaWebhookSlug(data.INSTAGRAM_WEBHOOK_SLUG || '');
        // Reseta o token revelado ao recarregar settings
        setTokenRevelado('');
        setShowToken(false);
      }
    } catch (err) {
      console.error('Erro ao carregar configurações do Instagram:', err);
    }
  };

  const fetchInstagramPosts = async () => {
    if (!activeClient) return;
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
  };

  const handleRevealToken = async () => {
    if (tokenRevelado) {
      // Já revelado: apenas alterna visibilidade
      setShowToken(prev => !prev);
      return;
    }
    if (!activeClient || !tokenJaConfigurado) return;
    setRevealingToken(true);
    try {
      const res = await fetchWithAuth(`${API_URL}/settings/reveal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'INSTAGRAM_ACCESS_TOKEN' })
      }, activeClient.id);
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

  useEffect(() => {
    fetchAutomations();
    fetchFunnels();
    fetchSettings();
    fetchInstagramPosts();
  }, [activeClient]);

  const handleSaveSettings = async () => {
    if (!activeClient) return;
    setIsConfiguringSettings(true);
    const loadingToast = toast.loading("Salvando configurações...");
    try {
      // Monta o payload: inclui o token APENAS se o usuário digitou algo novo
      const settingsPayload = {
        INSTAGRAM_ACCOUNT_ID: instaAccountID,
        INSTAGRAM_WEBHOOK_SLUG: instaWebhookSlug,
      };
      if (instaAccessToken.trim()) {
        settingsPayload.INSTAGRAM_ACCESS_TOKEN = instaAccessToken;
      }

      const res = await fetchWithAuth(`${API_URL}/settings/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: settingsPayload })
      }, activeClient.id);

      if (res.ok) {
        toast.success("Configurações do Instagram salvas com sucesso!", { id: loadingToast });
        fetchSettings();
      } else {
        const err = await res.json();
        toast.error(err.detail || "Erro ao salvar configurações.", { id: loadingToast });
      }
    } catch (err) {
      console.error(err);
      toast.error("Erro de conexão ao salvar configurações.", { id: loadingToast });
    } finally {
      setIsConfiguringSettings(false);
    }
  };

  const handleOpenNew = () => {
    setEditingId(null);
    setName('');
    setPostId('all');
    setSelectedPostIds(['all']);
    setTriggerType('keyword');
    setKeywords('');
    setActionType('both');
    setReplyComments(['']);
    setFunnelId('');
    setIsActive(true);
    setIsModalOpen(true);
    setIsDropdownOpen(false);
    fetchInstagramPosts();
  };

  const handleOpenEdit = (item) => {
    setEditingId(item.id);
    setName(item.name);
    setPostId(item.post_id);
    if (item.post_id === 'all') {
      setSelectedPostIds(['all']);
    } else {
      setSelectedPostIds(item.post_id.split(',').map(s => s.trim()));
    }
    setTriggerType(item.trigger_type);
    setKeywords(item.keywords || '');
    setActionType(item.action_type);
    setReplyComments(item.reply_comments || ['']);
    setFunnelId(item.funnel_id || '');
    setIsActive(item.is_active);
    setIsModalOpen(true);
    setIsDropdownOpen(false);
    fetchInstagramPosts();
  };

  const handleAddReplyVariation = () => {
    setReplyComments([...replyComments, '']);
  };

  const handleRemoveReplyVariation = (index) => {
    if (replyComments.length <= 1) return;
    const newReplies = replyComments.filter((_, i) => i !== index);
    setReplyComments(newReplies);
  };

  const handleReplyChange = (index, val) => {
    const newReplies = [...replyComments];
    newReplies[index] = val;
    setReplyComments(newReplies);
  };

  const handleSaveAutomation = async (e) => {
    e.preventDefault();
    if (!activeClient) return;

    const filteredReplies = replyComments.filter(r => r.trim());
    if (actionType !== 'send_dm' && filteredReplies.length === 0) {
      toast.error("Você precisa definir pelo menos uma resposta de comentário.");
      return;
    }

    setIsSaving(true);
    const payload = {
      name,
      post_id: selectedPostIds.includes('all') ? 'all' : selectedPostIds.join(','),
      trigger_type: triggerType,
      keywords: triggerType === 'keyword' ? keywords : null,
      action_type: actionType,
      reply_comments: filteredReplies,
      funnel_id: funnelId ? parseInt(funnelId) : null,
      is_active: isActive
    };

    try {
      const url = editingId 
        ? `${API_URL}/instagram/automations/${editingId}`
        : `${API_URL}/instagram/automations`;
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetchWithAuth(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }, activeClient.id);

      if (res.ok) {
        toast.success(editingId ? "Automação atualizada!" : "Automação criada!");
        setIsModalOpen(false);
        fetchAutomations();
      } else {
        const err = await res.json();
        toast.error(err.detail || "Erro ao salvar automação.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Erro ao conectar com o servidor.");
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDelete = (item) => {
    setDeleteTarget(item);
    setDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (!activeClient || !deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await fetchWithAuth(`${API_URL}/instagram/automations/${deleteTarget.id}`, {
        method: 'DELETE'
      }, activeClient.id);

      if (res.ok) {
        toast.success("Automação excluída com sucesso!");
        setDeleteModalOpen(false);
        fetchAutomations();
      } else {
        toast.error("Erro ao deletar automação.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Erro de conexão ao excluir.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-700">
      {/* Banner */}
      <div className="bg-[#1e293b]/80 backdrop-blur-xl rounded-3xl p-6 border border-white/5 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-5">
          <div className="w-12 h-12 bg-pink-500/10 rounded-2xl flex items-center justify-center text-pink-500 border border-pink-500/20 shadow-[0_0_15px_rgba(236,72,153,0.1)]">
            <FiZap size={24} fill="currentColor" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
              Automação de Comentários (Instagram)
            </h2>
            <p className="text-gray-400 text-[11px] font-medium mt-0.5">
              Responda comentários automaticamente e envie mensagens privadas no Direct (DMs).
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setInstaAccessToken('');
              fetchSettings();
              setIsSettingsModalOpen(true);
            }}
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-gray-800/50 hover:bg-gray-800 text-gray-300 transition-all font-bold text-[10px] border border-white/5 uppercase tracking-widest"
          >
            <FiSettings size={14} /> Configurações
          </button>
          <button
            onClick={handleOpenNew}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-pink-600 hover:bg-pink-500 text-white transition-all font-black text-[10px] shadow-lg shadow-pink-600/20 active:scale-95 uppercase tracking-widest"
          >
            <FiPlus size={14} /> Nova Regra
          </button>
        </div>
      </div>


      {/* Tabela de Automacões */}
      <div className="bg-white/50 dark:bg-[#1e293b]/40 rounded-2xl border border-gray-100 dark:border-white/5 backdrop-blur-xl shadow-xl overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-800/50">
              <th className="px-6 py-4 text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]">Nome</th>
              <th className="px-6 py-4 text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]">Post ID</th>
              <th className="px-6 py-4 text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]">Trigger</th>
              <th className="px-6 py-4 text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]">Ações</th>
              <th className="px-6 py-4 text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] text-right">Opções</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {loading ? (
              <tr><td colSpan="5" className="px-6 py-10 text-center text-gray-500 italic">Carregando automações...</td></tr>
            ) : automations.length === 0 ? (
              <tr><td colSpan="5" className="px-6 py-10 text-center text-gray-500 italic">Nenhuma automação cadastrada.</td></tr>
            ) : automations.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-white/[0.01] transition-all">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-950 dark:text-white">{item.name}</span>
                    {item.is_active ? (
                      <FiCheckCircle className="text-green-500" title="Ativo" />
                    ) : (
                      <FiXCircle className="text-red-500" title="Inativo" />
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 text-xs font-semibold">
                  {item.post_id === 'all' 
                    ? 'Todos os Posts' 
                    : item.post_id.split(',').length === 1 
                    ? '1 Post específico' 
                    : `${item.post_id.split(',').length} Posts específicos`}
                </td>
                <td className="px-6 py-4">
                  {item.trigger_type === 'keyword' ? (
                    <span className="px-2.5 py-1 rounded-lg bg-pink-100 dark:bg-pink-950/40 text-pink-700 dark:text-pink-400 text-xs font-bold">
                      Palavra-chave: {item.keywords}
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-lg bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 text-xs font-bold">
                      Qualquer Comentário
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 text-xs font-semibold">
                  {item.action_type === 'both' && 'Responder e Enviar DM'}
                  {item.action_type === 'reply_comment' && 'Apenas Responder'}
                  {item.action_type === 'send_dm' && 'Apenas Enviar DM'}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button onClick={() => handleOpenEdit(item)} className="p-1.5 text-gray-400 hover:text-blue-500 transition-all" title="Editar"><FiEdit2 size={15} /></button>
                    <button onClick={() => confirmDelete(item)} className="p-1.5 text-gray-400 hover:text-red-500 transition-all" title="Excluir"><FiTrash2 size={15} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal Criar / Editar - Portal para cobrir 100% da tela */}
      {isModalOpen && createPortal(
        <div
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            zIndex: 99999,
            width: '100vw',
            height: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            backgroundColor: 'rgba(0,0,0,0.65)',
            backdropFilter: 'blur(4px)'
          }}
        >
          <div className="w-full max-w-xl bg-white dark:bg-[#1e293b] rounded-3xl shadow-2xl border border-gray-100 dark:border-white/5 overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-100 dark:border-gray-800">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                {editingId ? 'Editar Regra de Automação' : 'Nova Regra de Automação'}
              </h3>
            </div>
            
            <form onSubmit={handleSaveAutomation} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
              <div>
                <label className="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Nome da Automação</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Campanha Desconto"
                  className="w-full px-4 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 border border-transparent focus:border-pink-500 outline-none text-sm font-semibold transition-all text-gray-950 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Posts do Instagram</label>
                {loadingPosts ? (
                  <div className="text-xs text-gray-400 animate-pulse py-1">Carregando posts...</div>
                ) : postsError ? (
                  <div className="text-xs text-red-500 py-1">{postsError}</div>
                ) : null}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="w-full text-left px-4 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 border border-transparent focus:border-pink-500 outline-none text-sm font-semibold transition-all text-gray-950 dark:text-white flex justify-between items-center"
                  >
                    <span>
                      {selectedPostIds.includes('all')
                        ? 'Todos os Posts (Qualquer Post)'
                        : selectedPostIds.length === 1
                        ? '1 post selecionado'
                        : `${selectedPostIds.length} posts selecionados`}
                    </span>
                    <span className="text-gray-400">▼</span>
                  </button>
                  
                  {isDropdownOpen && (
                    <div className="absolute z-[999999] mt-2 w-full bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl shadow-2xl max-h-60 overflow-y-auto p-2 space-y-1">
                      <label className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg cursor-pointer text-xs font-semibold text-gray-900 dark:text-white">
                        <input
                          type="checkbox"
                          checked={selectedPostIds.includes('all')}
                          onChange={() => {
                            if (selectedPostIds.includes('all')) {
                              setSelectedPostIds([]);
                            } else {
                              setSelectedPostIds(['all']);
                            }
                          }}
                          className="rounded text-pink-600 focus:ring-pink-500"
                        />
                        <span>Todos os Posts (Qualquer Post)</span>
                      </label>
                      
                      <div className="border-t border-gray-100 dark:border-gray-705 my-1"></div>
                      
                      {instagramPosts.length === 0 ? (
                        <div className="text-xs text-gray-500 italic p-2 text-center">Nenhum post encontrado.</div>
                      ) : (
                        instagramPosts.map(post => {
                          const isChecked = selectedPostIds.includes(post.id);
                          return (
                            <label key={post.id} className="flex items-start gap-2 px-2 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg cursor-pointer text-xs text-gray-900 dark:text-white">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {
                                  let newSelection = [...selectedPostIds].filter(id => id !== 'all');
                                  if (isChecked) {
                                    newSelection = newSelection.filter(id => id !== post.id);
                                  } else {
                                    newSelection.push(post.id);
                                  }
                                  if (newSelection.length === 0) {
                                    newSelection = ['all'];
                                  }
                                  setSelectedPostIds(newSelection);
                                }}
                                className="rounded text-pink-600 focus:ring-pink-500 mt-0.5"
                              />
                              <div className="flex-1 min-w-0">
                                <p className="font-bold truncate">{post.caption || 'Sem legenda'}</p>
                                <p className="text-[10px] text-gray-400 font-mono mt-0.5">{post.id}</p>
                              </div>
                            </label>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
                <span className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 block">Escolha todos, um ou múltiplos posts para ativar esta automação.</span>
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Tipo de Gatilho</label>
                <select
                  value={triggerType}
                  onChange={(e) => setTriggerType(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 border border-transparent focus:border-pink-500 outline-none text-sm font-semibold transition-all text-gray-950 dark:text-white"
                >
                  <option value="keyword">Palavra-chave (Keyword)</option>
                  <option value="any_comment">Qualquer comentário</option>
                </select>
              </div>

              {triggerType === 'keyword' && (
                <div>
                  <label className="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Palavras-chave Gatilho</label>
                  <input
                    type="text"
                    required
                    value={keywords}
                    onChange={(e) => setKeywords(e.target.value)}
                    placeholder="Ex: quero, cupom, desconto"
                    className="w-full px-4 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 border border-transparent focus:border-pink-500 outline-none text-sm font-semibold transition-all text-gray-950 dark:text-white"
                  />
                  <span className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 block">Separe múltiplas palavras-chave por vírgula.</span>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Ação ao Receber Comentário</label>
                <select
                  value={actionType}
                  onChange={(e) => setActionType(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 border border-transparent focus:border-pink-500 outline-none text-sm font-semibold transition-all text-gray-950 dark:text-white"
                >
                  <option value="both">Responder Comentário e Enviar Mensagem Privada (DM)</option>
                  <option value="reply_comment">Apenas responder comentário com mensagem pública</option>
                  <option value="send_dm">Apenas enviar mensagem privada no Direct (DM)</option>
                </select>
              </div>

              {actionType !== 'send_dm' && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-wider">Variações de Resposta (Comentários)</label>
                    <button
                      type="button"
                      onClick={handleAddReplyVariation}
                      className="text-[9px] font-bold text-pink-500 hover:underline"
                    >
                      + Adicionar Variação
                    </button>
                  </div>
                  {replyComments.map((reply, index) => (
                    <div key={index} className="flex gap-2 items-center">
                      <input
                        type="text"
                        required
                        value={reply}
                        onChange={(e) => handleReplyChange(index, e.target.value)}
                        placeholder={`Resposta #${index + 1}`}
                        className="flex-1 px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 border border-transparent focus:border-pink-500 outline-none text-sm font-semibold transition-all text-gray-950 dark:text-white"
                      />
                      {replyComments.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveReplyVariation(index)}
                          className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-all"
                        >
                          <FiTrash2 size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                  <span className="text-[10px] text-gray-400 dark:text-gray-500 block">Use várias opções de frases diferentes para diminuir as chances de bloqueio do Instagram.</span>
                </div>
              )}

              {actionType !== 'reply_comment' && (
                <div>
                  <label className="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Funil do ZapVoice (Disparo no Direct)</label>
                  <select
                    value={funnelId}
                    onChange={(e) => setFunnelId(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 border border-transparent focus:border-pink-500 outline-none text-sm font-semibold transition-all text-gray-950 dark:text-white"
                  >
                    <option value="">Nenhum - Enviar mensagem padrão</option>
                    {funnels.map(f => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>
                  <span className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 block">A primeira mensagem de texto deste funil será enviada ao direct do usuário.</span>
                </div>
              )}

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-4 h-4 text-pink-600 rounded"
                />
                <label htmlFor="is_active" className="text-sm font-semibold text-gray-700 dark:text-gray-300">Automação Ativa</label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 text-xs font-bold rounded-xl hover:bg-gray-50 dark:hover:bg-gray-850 transition-all uppercase tracking-wider"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 bg-pink-600 hover:bg-pink-500 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-pink-600/10 uppercase tracking-wider"
                >
                  {isSaving ? 'Salvando...' : 'Salvar Automação'}
                </button>
              </div>
            </form>
          </div>
        </div>
      , document.body)}

      {/* Confirm Delete Modal - Portal */}
      {deleteModalOpen && createPortal(
        <ConfirmModal
          isOpen={deleteModalOpen}
          title="Excluir Automação"
          message={`Deseja realmente apagar a regra de automação "${deleteTarget?.name}"? Esta ação não pode ser desfeita.`}
          confirmText="Apagar"
          isDangerous={true}
          onClose={() => setDeleteModalOpen(false)}
          onConfirm={handleDelete}
        />
      , document.body)}

      {/* Settings Modal (Instagram Params) - Portal para cobrir 100% da tela */}
      {isSettingsModalOpen && createPortal(
        <div
          className="flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 99999,
            width: '100vw',
            height: '100vh'
          }}
        >
          <div className="w-full max-w-xl bg-white dark:bg-[#1e293b] rounded-3xl shadow-2xl border border-gray-100 dark:border-white/5 overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-100 dark:border-gray-800">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <FiSettings className="text-pink-500" /> Parâmetros de Integração com o Meta
              </h3>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Configure as credenciais manuais da API do Instagram Business. Use o token permanente gerado no Painel de Desenvolvedores do Meta.
              </p>
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">ID da Conta do Instagram Business</label>
                  <input
                    type="text"
                    value={instaAccountID}
                    onChange={(e) => setInstaAccountID(e.target.value)}
                    placeholder="Ex: 178414002345678"
                    className="w-full px-4 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 border border-transparent focus:border-pink-500 outline-none text-sm font-semibold transition-all text-gray-950 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Token de Acesso da Página (Page Access Token)</label>
                  <div className="relative">
                    <input
                      type={showToken ? 'text' : 'password'}
                      value={instaAccessToken}
                      onChange={(e) => { setInstaAccessToken(e.target.value); setTokenRevelado(''); }}
                      placeholder={tokenJaConfigurado && !instaAccessToken ? '••••••••••••••••••••••••••••••••••••••••' : 'EAAGb...'}
                      autoComplete="new-password"
                      className="w-full px-4 py-3 pr-12 rounded-xl bg-gray-100 dark:bg-gray-800 border border-transparent focus:border-pink-500 outline-none text-sm font-semibold transition-all text-gray-950 dark:text-white"
                    />
                    <button
                      type="button"
                      onClick={handleRevealToken}
                      disabled={revealingToken}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-pink-400 transition-colors p-1 disabled:opacity-50"
                      title={showToken ? 'Ocultar token' : 'Clique para revelar o token salvo'}
                    >
                      {revealingToken
                        ? <span className="animate-spin text-xs">...</span>
                        : showToken ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                    </button>
                  </div>
                  {tokenJaConfigurado && !instaAccessToken && (
                    <span className="text-[10px] text-green-500 mt-1 block font-bold">✅ Token salvo. Clique no olho para revelar ou digite um novo para atualizar.</span>
                  )}
                </div>

                {/* Slug do Webhook do Instagram */}
                <div>
                  <label className="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Slug do Webhook (final da URL)</label>
                  <input
                    type="text"
                    value={instaWebhookSlug}
                    onChange={(e) => setInstaWebhookSlug(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                    placeholder="Ex: minha_automacao"
                    className="w-full px-4 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 border border-transparent focus:border-pink-500 outline-none text-sm font-semibold transition-all text-gray-950 dark:text-white"
                  />
                  <span className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 block">Apenas letras minúsculas, números, underscores (_) e hífens (-).</span>
                </div>

                {/* Webhook URL do Instagram */}
                <div className="mt-2">
                  <label className="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">URL do Webhook (configurar no Meta)</label>
                  <div className="relative">
                    <input
                      type="text"
                      readOnly
                      value={webhookBaseUrl ? `${webhookBaseUrl}/api/instagram/webhook/${instaWebhookSlug}` : 'Configure WEBHOOK_BASE_URL no servidor'}
                      className="w-full px-4 py-3 pr-24 rounded-xl bg-gray-100/50 dark:bg-gray-800/50 border border-dashed border-pink-500/30 outline-none text-xs font-mono text-gray-500 dark:text-gray-400 cursor-default"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const url = webhookBaseUrl ? `${webhookBaseUrl}/api/instagram/webhook/${instaWebhookSlug}` : '';
                        if (url) {
                          navigator.clipboard.writeText(url);
                          toast.success('URL copiada!');
                        } else {
                          toast.error('WEBHOOK_BASE_URL não configurada no servidor.');
                        }
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-pink-600/20 hover:bg-pink-600/40 text-pink-400 text-[9px] font-black rounded-lg transition-all uppercase tracking-wider"
                    >
                      Copiar
                    </button>
                  </div>
                  <span className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 block">
                    Cole esta URL no campo "URL de Callback" do webhook do Instagram no painel do Meta Developers.
                  </span>
                </div>
              </div>
              
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
                <button
                  onClick={() => setIsSettingsModalOpen(false)}
                  className="px-4 py-2 border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 text-xs font-bold rounded-xl hover:bg-gray-50 dark:hover:bg-gray-850 transition-all uppercase tracking-wider"
                >
                  Fechar
                </button>
                <button
                  onClick={async () => {
                    await handleSaveSettings();
                    setIsSettingsModalOpen(false);
                  }}
                  disabled={isConfiguringSettings}
                  className="px-5 py-2 bg-pink-600 hover:bg-pink-500 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-pink-600/10 uppercase tracking-wider"
                >
                  {isConfiguringSettings ? "Salvando..." : "Salvar Conexão"}
                </button>
              </div>
            </div>
          </div>
        </div>
      , document.body)}
    </div>
  );
}
