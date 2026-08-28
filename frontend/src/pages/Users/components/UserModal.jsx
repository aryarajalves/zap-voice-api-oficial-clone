import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { FiEdit2, FiUserPlus, FiX, FiLink, FiCopy, FiCheck } from 'react-icons/fi';
import { fetchWithAuth } from '../../../AuthContext';
import { API_URL } from '../../../config';
import { toast } from 'react-hot-toast';

// Subcomponentes Modulares
import InviteSuccessView from './UserModal/InviteSuccessView';
import UserPanelsAccessSection from './UserModal/UserPanelsAccessSection';
import UserFunnelNodesSection from './UserModal/UserFunnelNodesSection';
import UserClientsAccessSection from './UserModal/UserClientsAccessSection';
import UserSetupStatusSection from './UserModal/UserSetupStatusSection';

const UserModal = ({ 
  isOpen, 
  setIsOpen, 
  editingUser, 
  userData, 
  setUserData, 
  handleSubmit, 
  showPassword, 
  setShowPassword, 
  clients, 
  toggleClientAccess,
  onInviteGenerated
}) => {
  const [validityHours, setValidityHours] = useState(24);
  const [generatedLink, setGeneratedLink] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  // Estados para Redefinição de Senha via Link
  const [resetLink, setResetLink] = useState('');
  const [resetCopied, setResetCopied] = useState(false);
  const [isGeneratingReset, setIsGeneratingReset] = useState(false);

  if (!isOpen) return null;

  const handleGenerateInvite = async (e) => {
    e.preventDefault();
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

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#1e293b] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-200 dark:border-white/5 max-h-[90vh] flex flex-col">
        {/* Header do Modal */}
        <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-900/30 flex-shrink-0">
          <h3 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
            {editingUser ? <FiEdit2 className="text-blue-600" /> : <FiUserPlus className="text-blue-600" />}
            {editingUser ? "Editar Usuário" : "Convidar Novo Usuário"}
          </h3>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors cursor-pointer">
            <FiX size={20} />
          </button>
        </div>

        {generatedLink ? (
          <InviteSuccessView
            generatedLink={generatedLink}
            copied={copied}
            onCopyLink={handleCopyLink}
            onClose={handleClose}
          />
        ) : (
          <form 
            onSubmit={editingUser ? handleSubmit : handleGenerateInvite} 
            className="p-6 space-y-5 overflow-y-auto custom-scrollbar" 
            autoComplete="off"
          >
            {/* Hidden inputs to trick browsers */}
            <input type="text" style={{ display: 'none' }} />
            <input type="password" style={{ display: 'none' }} />

            {editingUser ? (
              <>
                <div>
                  <label className="block text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1">Nome Completo</label>
                  <input
                    required
                    type="text"
                    name="new-user-name"
                    autoComplete="off"
                    value={userData.full_name}
                    onChange={(e) => setUserData({ ...userData, full_name: e.target.value })}
                    className="w-full p-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 dark:text-white outline-none transition-all"
                    placeholder="Ex: João Silva"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1">Email das Boas-vindas</label>
                  <input
                    required
                    type="email"
                    name="new-user-email"
                    autoComplete="off"
                    value={userData.email}
                    onChange={(e) => setUserData({ ...userData, email: e.target.value })}
                    className="w-full p-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 dark:text-white outline-none transition-all"
                    placeholder="exemplo@email.com"
                  />
                </div>

                {/* Redefinição de Senha via Link para o Usuário */}
                <div className="p-3.5 bg-gray-50 dark:bg-[#0f172a] rounded-xl border border-gray-200 dark:border-gray-700/70 space-y-2">
                  <div>
                    <label className="block text-xs font-black text-gray-700 dark:text-gray-200 uppercase tracking-wider">
                      Redefinição de Senha
                    </label>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                      Gere um link para que o usuário crie uma nova senha para a conta dele.
                    </p>
                  </div>

                  {resetLink ? (
                    <div className="pt-2 border-t border-gray-200 dark:border-gray-700/60 space-y-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          readOnly
                          value={resetLink}
                          className="w-full text-xs p-2 bg-white dark:bg-[#1e293b] border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 font-mono select-all outline-none"
                        />
                        <button
                          type="button"
                          onClick={handleCopyResetLink}
                          className={`px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                            resetCopied
                              ? 'bg-emerald-600 text-white'
                              : 'bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-500/20'
                          }`}
                        >
                          {resetCopied ? <FiCheck size={14} /> : <FiCopy size={14} />}
                          <span>{resetCopied ? 'Copiado!' : 'Copiar'}</span>
                        </button>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-gray-400">
                        <span>⏱️ Válido por 24 horas</span>
                        <button
                          type="button"
                          onClick={handleGenerateResetLink}
                          className="text-blue-500 hover:text-blue-400 font-medium cursor-pointer"
                        >
                          Gerar Novo Link
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={handleGenerateResetLink}
                      disabled={isGeneratingReset}
                      className="w-full py-2.5 px-3 bg-blue-600/10 hover:bg-blue-600/20 text-blue-600 dark:text-blue-400 border border-blue-500/30 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                    >
                      {isGeneratingReset ? (
                        <>
                          <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <span>Gerando link...</span>
                        </>
                      ) : (
                        <>
                          <FiLink size={14} />
                          <span>Criar Link de Nova Senha</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </>
            ) : (
              <div>
                <label className="block text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1">Prazo de Validade do Convite</label>
                <select
                  value={validityHours}
                  onChange={(e) => setValidityHours(Number(e.target.value))}
                  className="w-full p-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 dark:text-white outline-none font-medium"
                >
                  <option value={7}>7 Horas</option>
                  <option value={14}>14 Horas</option>
                  <option value={24}>24 Horas</option>
                  <option value={48}>48 Horas</option>
                  <option value={72}>72 Horas</option>
                  <option value={0}>Sem Expiração</option>
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1">Nível de Acesso (Cargo)</label>
              <select
                disabled={editingUser?.role === 'super_admin'}
                value={userData.role}
                onChange={(e) => {
                  const nextRole = e.target.value;
                  let defaultBlocked = [];
                  if (nextRole === 'premium') {
                    defaultBlocked = ['settings'];
                  } else if (nextRole === 'user') {
                    defaultBlocked = ['settings', 'schedules', 'funnels', 'leads'];
                  } else if (nextRole === 'vendedor') {
                    defaultBlocked = ['settings', 'schedules', 'funnels', 'leads', 'history', 'whatsapp', 'bulk_sender'];
                  }
                  setUserData({ ...userData, role: nextRole, blocked_features: defaultBlocked });
                }}
                className={`w-full p-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 dark:text-white outline-none font-medium ${editingUser?.role === 'super_admin' ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {editingUser?.role === 'super_admin' && (
                  <option value="super_admin">Super Admin</option>
                )}
                <option value="admin">Administrador (Configurações Totais)</option>
                <option value="premium">Usuário Premium (Sem Configurações Avançadas)</option>
                <option value="user">Usuário (Histórico Apenas)</option>
                <option value="vendedor">Vendedor (Painel de Atendimento)</option>
              </select>
            </div>

            {/* Banner de Acesso do Cargo Vendedor */}
            {userData.role === 'vendedor' && (
              <div className="p-3 border border-blue-200 dark:border-blue-800/50 rounded-xl bg-blue-50/50 dark:bg-blue-900/20">
                <div className="flex items-start gap-2">
                  <span className="text-blue-500 text-lg">🔒</span>
                  <div>
                    <p className="text-sm font-semibold text-blue-700 dark:text-blue-300">Acesso restrito ao Painel de Atendimento</p>
                    <p className="text-xs text-blue-600/70 dark:text-blue-400/70 mt-0.5">O cargo <strong>Vendedor</strong> tem acesso exclusivo ao chat de atendimento. Todos os outros módulos ficam automaticamente bloqueados.</p>
                  </div>
                </div>
              </div>
            )}

            {/* Painéis e Status de Construção */}
            {userData.role !== 'super_admin' && userData.role !== 'vendedor' && (
              <UserPanelsAccessSection userData={userData} setUserData={setUserData} />
            )}

            {/* Restrições de Nós do Funil */}
            {userData.role !== 'super_admin' && userData.role !== 'vendedor' && !(userData.blocked_features || []).includes('funnels') && (
              <UserFunnelNodesSection userData={userData} setUserData={setUserData} />
            )}

            {/* Peso do Vendedor */}
            {userData.role === 'vendedor' && (
              <div className="animate-in fade-in slide-in-from-top-1 duration-200">
                <label className="block text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1">
                  Pontuação do Vendedor (Peso de Distribuição)
                </label>
                <select
                  value={userData.seller_weight || 1}
                  onChange={(e) => setUserData({ ...userData, seller_weight: Number(e.target.value) })}
                  className="w-full p-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 dark:text-white outline-none font-medium"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(val => (
                    <option key={val} value={val}>{val} {val === 1 ? '(Normal)' : val === 10 ? '(Máximo)' : ''}</option>
                  ))}
                </select>
                <p className="mt-1 text-[10px] text-gray-400 italic">
                  Pesos maiores garantem proporcionalmente mais leads na distribuição (Rodízio/Aleatório).
                </p>
              </div>
            )}

            {/* Seleção de Clientes */}
            <UserClientsAccessSection
              clients={clients}
              userData={userData}
              toggleClientAccess={toggleClientAccess}
            />

            {editingUser && (
              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_active"
                    disabled={editingUser?.role === 'super_admin'}
                    checked={userData.is_active}
                    onChange={(e) => setUserData({ ...userData, is_active: e.target.checked })}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 transition-all cursor-pointer"
                  />
                  <label htmlFor="is_active" className="text-sm font-bold text-gray-700 dark:text-gray-300 cursor-pointer">Usuário Ativo</label>
                </div>
              </div>
            )}

            {/* Status de Finalização da Configuração */}
            {editingUser && (
              <UserSetupStatusSection userData={userData} setUserData={setUserData} />
            )}

            <div className="flex gap-3 pt-4 flex-shrink-0">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 font-bold hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isGenerating}
                className="flex-1 px-4 py-2 bg-blue-600 text-white font-bold hover:bg-blue-700 rounded-lg transition-all shadow-lg shadow-blue-500/30 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {editingUser ? "Salvar Alterações" : "Gerar Link de Convite"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body
  );
};

export default UserModal;
