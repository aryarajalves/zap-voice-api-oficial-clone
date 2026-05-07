import React from 'react';
import { createPortal } from 'react-dom';
import { FiEdit2, FiUserPlus, FiX, FiEyeOff, FiEye } from 'react-icons/fi';

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
    toggleClientAccess 
}) => {
    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-[#1e293b] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-200 dark:border-white/5 max-h-[90vh] flex flex-col">
                <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-900/30 flex-shrink-0">
                    <h3 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                        {editingUser ? <FiEdit2 className="text-blue-600" /> : <FiUserPlus className="text-blue-600" />}
                        {editingUser ? "Editar Usuário" : "Criar Novo Usuário"}
                    </h3>
                    <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                        <FiX size={20} />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto custom-scrollbar" autoComplete="off">
                    {/* Hidden inputs to trick browsers */}
                    <input type="text" style={{ display: 'none' }} />
                    <input type="password" style={{ display: 'none' }} />

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
                            {editingUser ? "Nova Senha (deixe vazio para manter)" : "Senha Inicial"}
                        </label>
                        <div className="relative">
                            <input
                                required={!editingUser}
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
                    <div>
                        <label className="block text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1">Nível de Acesso (Role)</label>
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
                        <p className="mt-1 text-[10px] text-gray-400 italic">Usuários só poderão ver e gerenciar os clientes marcados aqui.</p>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                        {editingUser && (
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
                        )}
                    </div>

                    <div className="flex gap-3 pt-4 flex-shrink-0">
                        <button
                            type="button"
                            onClick={() => setIsOpen(false)}
                            className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 font-bold hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        >
                            Voltar
                        </button>
                        <button
                            type="submit"
                            className="flex-1 px-4 py-2 bg-blue-600 text-white font-bold hover:bg-blue-700 rounded-lg transition-all shadow-lg shadow-blue-500/30 hover:-translate-y-0.5"
                        >
                            {editingUser ? "Salvar Alterações" : "Criar Agora"}
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
};

export default UserModal;
