import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { FiEdit2, FiUserPlus, FiX, FiEyeOff, FiEye, FiCopy, FiCheck } from 'react-icons/fi';
import { fetchWithAuth } from '../../../AuthContext';
import { API_URL } from '../../../config';
import { toast } from 'react-hot-toast';

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
                    client_ids: userData.client_ids
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

    const handleClose = () => {
        setGeneratedLink('');
        setValidityHours(24);
        setIsOpen(false);
    };

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-[#1e293b] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-200 dark:border-white/5 max-h-[90vh] flex flex-col">
                <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-900/30 flex-shrink-0">
                    <h3 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                        {editingUser ? <FiEdit2 className="text-blue-600" /> : <FiUserPlus className="text-blue-600" />}
                        {editingUser ? "Editar Usuário" : "Convidar Novo Usuário"}
                    </h3>
                    <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                        <FiX size={20} />
                    </button>
                </div>

                {generatedLink ? (
                    /* Tela de sucesso ao gerar link */
                    <div className="p-6 space-y-6 flex flex-col items-center text-center">
                        <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center text-green-600 dark:text-green-400">
                            <FiCheck size={32} />
                        </div>
                        <div className="space-y-2">
                            <h4 className="text-lg font-bold text-gray-900 dark:text-white">Convite Pronto!</h4>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                Copie o link abaixo e envie para o novo usuário se cadastrar.
                            </p>
                        </div>

                        <div className="w-full flex items-center gap-2 p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900/30">
                            <input
                                readOnly
                                type="text"
                                value={generatedLink}
                                className="w-full bg-transparent text-sm text-gray-600 dark:text-gray-300 outline-none select-all px-2 font-mono"
                            />
                            <button
                                onClick={handleCopyLink}
                                className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-colors flex-shrink-0"
                                title="Copiar Link"
                            >
                                {copied ? <FiCheck size={18} /> : <FiCopy size={18} />}
                            </button>
                        </div>

                        <button
                            onClick={handleClose}
                            className="w-full py-2.5 bg-blue-600 text-white font-bold hover:bg-blue-700 rounded-lg transition-all shadow-lg shadow-blue-500/30 hover:-translate-y-0.5"
                        >
                            Concluir
                        </button>
                    </div>
                ) : (
                    /* Formulário principal */
                    <form 
                        onSubmit={editingUser ? handleSubmit : handleGenerateInvite} 
                        className="p-6 space-y-5 overflow-y-auto custom-scrollbar" 
                        autoComplete="off"
                    >
                        {/* Hidden inputs to trick browsers */}
                        <input type="text" style={{ display: 'none' }} />
                        <input type="password" style={{ display: 'none' }} />

                        {editingUser ? (
                            /* Modo Edição: Formulário Original */
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
                                <div>
                                    <label className="block text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1">
                                        Nova Senha (deixe vazio para manter)
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            name="new-user-password"
                                            autoComplete="new-password"
                                            value={userData.password}
                                            onChange={(e) => setUserData({ ...userData, password: e.target.value })}
                                            className="w-full p-2.5 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 dark:text-white outline-none transition-all"
                                            placeholder="••••••••"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                                        >
                                            {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                                        </button>
                                    </div>
                                </div>
                            </>
                        ) : (
                            /* Modo Criação: Cadastro de Convite */
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
                                onChange={(e) => setUserData({ ...userData, role: e.target.value })}
                                className={`w-full p-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 dark:text-white outline-none font-medium ${editingUser?.role === 'super_admin' ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                {editingUser?.role === 'super_admin' && (
                                    <option value="super_admin">Super Admin</option>
                                )}
                                <option value="admin">Administrador (Configurações Totais)</option>
                                <option value="premium">Usuário Premium (Sem Configurações Avançadas)</option>
                                <option value="user">Usuário (Histórico Apenas)</option>
                            </select>
                        </div>

                        {/* Seleção de Clientes */}
                        <div>
                            <label className="block text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2">Acesso aos Clientes</label>
                            <div className="space-y-2 max-h-32 overflow-y-auto p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900/30 custom-scrollbar">
                                {clients.map(client => (
                                    <div key={client.id} className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            id={`client-${client.id}`}
                                            checked={userData.client_ids.includes(client.id)}
                                            onChange={() => toggleClientAccess(client.id)}
                                            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                                        />
                                        <label htmlFor={`client-${client.id}`} className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer truncate">
                                            {client.name}
                                        </label>
                                    </div>
                                ))}
                                {clients.length === 0 && <p className="text-[10px] text-gray-400 italic">Nenhum cliente cadastrado.</p>}
                            </div>
                            <p className="mt-1 text-[10px] text-gray-400 italic">O usuário terá acesso e permissão para gerenciar os clientes marcados acima.</p>
                        </div>

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

                        <div className="flex gap-3 pt-4 flex-shrink-0">
                            <button
                                type="button"
                                onClick={handleClose}
                                className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 font-bold hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={isGenerating}
                                className="flex-1 px-4 py-2 bg-blue-600 text-white font-bold hover:bg-blue-700 rounded-lg transition-all shadow-lg shadow-blue-500/30 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
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
