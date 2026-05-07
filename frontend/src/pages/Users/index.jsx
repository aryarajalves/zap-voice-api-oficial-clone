import React, { useState, useEffect, useMemo } from 'react';
import { API_URL, WS_URL } from '../../config';
import { fetchWithAuth } from '../../AuthContext';
import { toast } from 'react-hot-toast';
import { FiUserPlus } from 'react-icons/fi';
import ConfirmModal from '../../components/ConfirmModal';
import UserFilters from './components/UserFilters';
import UserTable from './components/UserTable';
import UserModal from './components/UserModal';

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
            const wsBase = WS_URL.endsWith('/ws') ? WS_URL : `${WS_URL}/ws`;
            const wsToken = localStorage.getItem('token');
            const wsFinalUrl = wsToken ? `${wsBase}?token=${wsToken}` : wsBase;
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

            <UserFilters 
                searchTerm={searchTerm} 
                setSearchTerm={setSearchTerm} 
                roleFilter={roleFilter} 
                setRoleFilter={setRoleFilter} 
            />

            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
            ) : (
                <UserTable 
                    users={filteredUsers} 
                    handleOpenEditModal={handleOpenEditModal} 
                    confirmDeleteUser={confirmDeleteUser} 
                />
            )}

            <UserModal 
                isOpen={isModalOpen}
                setIsOpen={setIsModalOpen}
                editingUser={editingUser}
                userData={userData}
                setUserData={setUserData}
                handleSubmit={handleSubmit}
                showPassword={showPassword}
                setShowPassword={setShowPassword}
                clients={clients}
                toggleClientAccess={toggleClientAccess}
            />

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
