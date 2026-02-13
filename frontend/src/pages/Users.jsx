import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { API_URL, WS_URL } from '../config';
import { fetchWithAuth } from '../AuthContext';
import { toast } from 'react-hot-toast';
import { FiUserPlus, FiTrash2, FiShield, FiUser, FiCheck, FiX, FiSearch, FiFilter, FiEdit2, FiEye, FiEyeOff } from 'react-icons/fi';
import ConfirmModal from '../components/ConfirmModal';

const Users = () => {
    const [users, setUsers] = useState([]);
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [userToDelete, setUserToDelete] = useState(null);
    const [editingUser, setEditingUser] = useState(null);
    const [showPassword, setShowPassword] = useState(false);

    // Filtros
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');

    const [userData, setUserData] = useState({
        email: '',
        password: '',
        full_name: '',
        role: 'admin',
        is_active: true,
        client_ids: []
    });

    useEffect(() => {
        fetchData();
    }, []);

    // WebSocket Realtime Sync para Usuários
    useEffect(() => {
        let ws;
        try {
            const wsFinalUrl = WS_URL.endsWith('/ws') ? WS_URL : `${WS_URL}/ws`;
            ws = new WebSocket(wsFinalUrl);

            ws.onmessage = (event) => {
                try {
                    const payload = JSON.parse(event.data);

                    if (payload.event === "user_created") {
                        setUsers(prev => {
                            const exists = prev.find(u => u.id === payload.data.id);
                            if (exists) return prev;
                            const newList = [...prev, payload.data];
                            return newList.sort((a, b) => {
                                if (a.role === 'super_admin' && b.role !== 'super_admin') return -1;
                                if (a.role !== 'super_admin' && b.role === 'super_admin') return 1;
                                return (a.full_name || '').localeCompare(b.full_name || '');
                            });
                        });
                    } else if (payload.event === "profile_updated") {
                        setUsers(prev => prev.map(u => u.id === payload.data.id ? { ...u, ...payload.data } : u));
                    } else if (payload.event === "user_deleted") {
                        setUsers(prev => prev.filter(u => u.id !== payload.data.user_id));
                    }
                } catch (e) {
                    console.error("Error parsing user WS message:", e);
                }
            };

            ws.onerror = (e) => console.error("🔴 Users WS Error", e);

        } catch (e) {
            console.error("Failed to connect Users WebSocket", e);
        }

        return () => {
            if (ws) ws.close();
        };
    }, []);

    const fetchData = async () => {
        setLoading(true);
        await Promise.all([fetchUsers(), fetchClients()]);
        setLoading(false);
    };

    const fetchUsers = async () => {
        try {
            const res = await fetchWithAuth(`${API_URL}/auth/users`);
            if (res.ok) {
                const data = await res.json();

                // Ordenar: Super Admin sempre no topo, depois alfabético
                const sortedUsers = data.sort((a, b) => {
                    if (a.role === 'super_admin' && b.role !== 'super_admin') return -1;
                    if (a.role !== 'super_admin' && b.role === 'super_admin') return 1;
                    return (a.full_name || '').localeCompare(b.full_name || '');
                });

                setUsers(sortedUsers);
            }
        } catch (err) {
            console.error("Error fetching users:", err);
            toast.error("Erro ao carregar usuários.");
        }
    };

    const fetchClients = async () => {
        try {
            const res = await fetchWithAuth(`${API_URL}/clients/`);
            if (res.ok) {
                const data = await res.json();
                setClients(data);
            }
        } catch (err) {
            console.error("Error fetching clients:", err);
        }
    };

    // Filtros calculados
    const filteredUsers = useMemo(() => {
        return users.filter(user => {
            const matchesSearch =
                (user.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                user.email.toLowerCase().includes(searchTerm.toLowerCase());

            const matchesRole = roleFilter === 'all' || user.role === roleFilter;

            return matchesSearch && matchesRole;
        });
    }, [users, searchTerm, roleFilter]);

    const handleOpenCreateModal = () => {
        setEditingUser(null);
        setUserData({ email: '', password: '', full_name: '', role: 'admin', is_active: true, client_ids: [] });
        setShowPassword(false);
        setIsModalOpen(true);
    };

    const handleOpenEditModal = (user) => {
        setEditingUser(user);
        setUserData({
            email: user.email,
            password: '', // Senha fica vazia no edit por segurança
            full_name: user.full_name || '',
            role: user.role,
            is_active: user.is_active,
            client_ids: user.client_ids || []
        });
        setShowPassword(false);
        setIsModalOpen(true);
    };

    const toggleClientAccess = (clientId) => {
        setUserData(prev => {
            const exists = prev.client_ids.includes(clientId);
            if (exists) {
                return { ...prev, client_ids: prev.client_ids.filter(id => id !== clientId) };
            } else {
                return { ...prev, client_ids: [...prev.client_ids, clientId] };
            }
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const loadingToast = toast.loading(editingUser ? "Atualizando usuário..." : "Criando usuário...");
        try {
            const url = editingUser
                ? `${API_URL}/auth/users/${editingUser.id}`
                : `${API_URL}/auth/register`;

            const method = editingUser ? 'PUT' : 'POST';

            // Se for edit e a senha estiver vazia, não envia o campo password
            const payload = { ...userData };
            if (editingUser && !payload.password) {
                delete payload.password;
            }

            const res = await fetchWithAuth(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                toast.success(editingUser ? "Usuário atualizado!" : "Usuário criado com sucesso!");
                setIsModalOpen(false);
                fetchUsers();
            } else {
                const error = await res.json();
                throw new Error(error.detail || "Erro na operação");
            }
        } catch (err) {
            toast.error(err.message);
        } finally {
            toast.dismiss(loadingToast);
        }
    };

    const confirmDeleteUser = (user) => {
        setUserToDelete(user);
        setIsDeleteModalOpen(true);
    };

    const handleDeleteUser = async () => {
        if (!userToDelete) return;

        const loadingToast = toast.loading("Excluindo usuário...");
        try {
            const res = await fetchWithAuth(`${API_URL}/auth/users/${userToDelete.id}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                toast.success("Usuário excluído.");
                setIsDeleteModalOpen(false);
                setUserToDelete(null);
                fetchUsers();
            } else {
                const error = await res.json();
                throw new Error(error.detail || "Erro ao excluir");
            }
        } catch (err) {
            toast.error(err.message);
        } finally {
            toast.dismiss(loadingToast);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h2 className="text-xl font-bold text-gray-800 dark:text-white">Gestão de Usuários</h2>
                <button
                    onClick={handleOpenCreateModal}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm font-medium w-full sm:w-auto justify-center"
                >
                    <FiUserPlus /> Novo Usuário
                </button>
            </div>

            {/* Barra de Filtros */}
            <div className="flex flex-col md:flex-row gap-4 bg-white/50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
                <div className="relative flex-1">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Buscar por nome ou email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-white transition-all"
                    />
                </div>
                <div className="flex items-center gap-2 min-w-[200px]">
                    <FiFilter className="text-gray-400" />
                    <select
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)}
                        className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-2 outline-none focus:ring-2 focus:ring-blue-500/50 dark:text-white transition-all text-sm font-medium"
                    >
                        <option value="all">Todos os Cargos</option>
                        <option value="super_admin">Super Admin</option>
                        <option value="admin">Administrador</option>
                        <option value="premium">Usuário Premium</option>
                        <option value="user">Usuário Comum</option>
                    </select>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
            ) : (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                                <tr>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Nome / Email</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Cargo</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {filteredUsers.length > 0 ? filteredUsers.map((user) => (
                                    <tr key={user.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="font-semibold text-gray-800 dark:text-gray-200">{user.full_name || 'Sem nome'}</div>
                                            <div className="text-sm text-gray-500 dark:text-gray-400">{user.email}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${user.role === 'super_admin' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border border-purple-200 dark:border-purple-800' :
                                                user.role === 'admin' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-800' :
                                                    user.role === 'premium' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800' :
                                                        'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400 border border-gray-200 dark:border-gray-800'
                                                }`}>
                                                {user.role === 'super_admin' ? <FiShield size={12} /> : user.role === 'premium' ? <FiUserPlus size={12} /> : <FiUser size={12} />}
                                                {user.role}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            {user.is_active ?
                                                <span className="flex items-center gap-1 text-green-600 dark:text-green-400 text-xs font-bold"><FiCheck /> ATIVO</span> :
                                                <span className="flex items-center gap-1 text-red-600 dark:text-red-400 text-xs font-bold"><FiX /> INATIVO</span>
                                            }
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                {user.role !== 'super_admin' && (
                                                    <button
                                                        onClick={() => handleOpenEditModal(user)}
                                                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                                        title="Editar Usuário"
                                                    >
                                                        <FiEdit2 size={18} />
                                                    </button>
                                                )}
                                                {user.role !== 'super_admin' && (
                                                    <button
                                                        onClick={() => confirmDeleteUser(user)}
                                                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                                        title="Excluir Usuário"
                                                    >
                                                        <FiTrash2 size={18} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan="4" className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                                            Nenhum usuário encontrado com os filtros aplicados.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Modal de Criação / Edição */}
            {isModalOpen && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-200 dark:border-gray-700 max-h-[90vh] flex flex-col">
                        <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-900/30 flex-shrink-0">
                            <h3 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                {editingUser ? <FiEdit2 className="text-blue-600" /> : <FiUserPlus className="text-blue-600" />}
                                {editingUser ? "Editar Usuário" : "Criar Novo Usuário"}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
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
                                    onClick={() => setIsModalOpen(false)}
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
            )}

            <ConfirmModal
                isOpen={isDeleteModalOpen}
                onClose={() => {
                    setIsDeleteModalOpen(false);
                    setUserToDelete(null);
                }}
                onConfirm={handleDeleteUser}
                title="Confirma a exclusão?"
                message={`Você está prestes a remover "${userToDelete?.full_name || userToDelete?.email}" do sistema. Esta ação é irreversível.`}
                confirmText="Sim, Excluir"
                isDangerous={true}
            />
        </div>
    );
};

export default Users;
