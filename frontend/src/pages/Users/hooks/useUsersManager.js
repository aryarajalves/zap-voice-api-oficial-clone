import { useState, useEffect, useMemo } from 'react';
import { API_URL, WS_URL } from '../../../config';
import { fetchWithAuth, useAuth } from '../../../AuthContext';
import { toast } from 'react-hot-toast';

export function useUsersManager() {
    const { user: currentUser } = useAuth();
    const [users, setUsers] = useState([]);
    const [clients, setClients] = useState([]);
    const [invitations, setInvitations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('users'); // 'users', 'invitations', 'projects'
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isDeleteInviteModalOpen, setIsDeleteInviteModalOpen] = useState(false);
    const [userToDelete, setUserToDelete] = useState(null);
    const [inviteToDelete, setInviteToDelete] = useState(null);
    const [editingUser, setEditingUser] = useState(null);
    const [showPassword, setShowPassword] = useState(false);

    // Filtros
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');

    // Paginação - Usuários
    const [userCurrentPage, setUserCurrentPage] = useState(1);
    const [userItemsPerPage, setUserItemsPerPage] = useState(5);

    // Paginação - Convites
    const [inviteCurrentPage, setInviteCurrentPage] = useState(1);
    const [inviteItemsPerPage, setInviteItemsPerPage] = useState(5);

    useEffect(() => {
        setUserCurrentPage(1);
    }, [searchTerm, roleFilter]);

    const [userData, setUserData] = useState({
        email: '',
        password: '',
        full_name: '',
        role: 'admin',
        is_active: true,
        client_ids: [],
        blocked_features: [],
        blocked_nodes: []
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
        await Promise.all([fetchUsers(), fetchClients(), fetchInvitations()]);
        setLoading(false);
    };

    const fetchInvitations = async () => {
        try {
            const res = await fetchWithAuth(`${API_URL}/auth/invitations`);
            if (res.ok) {
                const data = await res.json();
                setInvitations(data);
            }
        } catch (err) {
            console.error("Error fetching invitations:", err);
            toast.error("Erro ao carregar convites.");
        }
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
        setUserData({
            email: '',
            password: '',
            full_name: '',
            role: 'admin',
            seller_weight: 1,
            is_active: true,
            client_ids: [],
            blocked_features: [],
            blocked_nodes: []
        });
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
            seller_weight: user.seller_weight || 1,
            is_active: user.is_active,
            client_ids: user.client_ids || [],
            blocked_features: user.blocked_features || [],
            blocked_nodes: user.blocked_nodes || [],
            setup_completed: user.setup_completed ?? true,
            setup_percentage: user.setup_percentage ?? 100,
            pages_status: user.pages_status || {},
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

    const confirmDeleteInvitation = (invite) => {
        setInviteToDelete(invite);
        setIsDeleteInviteModalOpen(true);
    };

    const handleDeleteInvitation = async () => {
        if (!inviteToDelete) return;

        const loadingToast = toast.loading("Revogando convite...");
        try {
            const res = await fetchWithAuth(`${API_URL}/auth/invitations/${inviteToDelete.id}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                toast.success("Convite revogado com sucesso.");
                setIsDeleteInviteModalOpen(false);
                setInviteToDelete(null);
                fetchInvitations();
            } else {
                const error = await res.json();
                throw new Error(error.detail || "Erro ao revogar convite");
            }
        } catch (err) {
            toast.error(err.message);
        } finally {
            toast.dismiss(loadingToast);
        }
    };

    return {
        currentUser,
        users,
        clients,
        invitations,
        loading,
        activeTab,
        setActiveTab,
        isModalOpen,
        setIsModalOpen,
        isDeleteModalOpen,
        setIsDeleteModalOpen,
        isDeleteInviteModalOpen,
        setIsDeleteInviteModalOpen,
        userToDelete,
        setUserToDelete,
        inviteToDelete,
        setInviteToDelete,
        editingUser,
        showPassword,
        setShowPassword,
        searchTerm,
        setSearchTerm,
        roleFilter,
        setRoleFilter,
        userCurrentPage,
        setUserCurrentPage,
        userItemsPerPage,
        setUserItemsPerPage,
        inviteCurrentPage,
        setInviteCurrentPage,
        inviteItemsPerPage,
        setInviteItemsPerPage,
        userData,
        setUserData,
        filteredUsers,
        fetchUsers,
        fetchClients,
        fetchInvitations,
        handleOpenCreateModal,
        handleOpenEditModal,
        toggleClientAccess,
        handleSubmit,
        confirmDeleteUser,
        handleDeleteUser,
        confirmDeleteInvitation,
        handleDeleteInvitation
    };
}
