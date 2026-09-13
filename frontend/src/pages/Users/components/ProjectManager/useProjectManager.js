import { useState, useEffect } from 'react';
import { fetchWithAuth } from '../../../../AuthContext';
import { API_URL } from '../../../../config';
import { toast } from 'react-hot-toast';

export function useProjectManager({ currentUser, fetchClients }) {
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newProjectName, setNewProjectName] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    
    // Estados de Edição
    const [editingProjectId, setEditingProjectId] = useState(null);
    const [editingName, setEditingName] = useState('');
    
    // Estado de Associação / Expansão
    const [expandedProjectId, setExpandedProjectId] = useState(null);
    const [selectedClientIds, setSelectedClientIds] = useState([]);
    const [savingAssociations, setSavingAssociations] = useState(false);

    // Modal de Exclusão
    const [projectToDelete, setProjectToDelete] = useState(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    const isSuperAdmin = currentUser?.role === 'super_admin';

    useEffect(() => {
        fetchProjects();
    }, []);

    const fetchProjects = async () => {
        setLoading(true);
        try {
            const res = await fetchWithAuth(`${API_URL}/projects/`);
            if (res.ok) {
                const data = await res.json();
                setProjects(data);
            } else {
                toast.error("Erro ao carregar projetos.");
            }
        } catch (err) {
            console.error("Error fetching projects:", err);
            toast.error("Erro de conexão ao carregar projetos.");
        } finally {
            setLoading(false);
        }
    };

    const handleCreateProject = async (e) => {
        e.preventDefault();
        if (!newProjectName.trim()) return;

        const loadingToast = toast.loading("Criando projeto...");
        try {
            const res = await fetchWithAuth(`${API_URL}/projects/`, {
                method: 'POST',
                body: JSON.stringify({ name: newProjectName.trim() })
            });

            if (res.ok) {
                toast.success("Projeto criado com sucesso!");
                setNewProjectName('');
                setIsCreating(false);
                fetchProjects();
            } else {
                const errData = await res.json();
                toast.error(errData.detail || "Erro ao criar projeto.");
            }
        } catch (err) {
            console.error(err);
            toast.error("Erro ao criar projeto.");
        } finally {
            toast.dismiss(loadingToast);
        }
    };

    const handleStartEdit = (project) => {
        setEditingProjectId(project.id);
        setEditingName(project.name);
    };

    const handleCancelEdit = () => {
        setEditingProjectId(null);
        setEditingName('');
    };

    const handleSaveEdit = async (projectId) => {
        if (!editingName.trim()) return;

        const loadingToast = toast.loading("Atualizando nome do projeto...");
        try {
            const res = await fetchWithAuth(`${API_URL}/projects/${projectId}`, {
                method: 'PUT',
                body: JSON.stringify({ name: editingName.trim() })
            });

            if (res.ok) {
                toast.success("Projeto atualizado!");
                setEditingProjectId(null);
                fetchProjects();
            } else {
                const errData = await res.json();
                toast.error(errData.detail || "Erro ao atualizar projeto.");
            }
        } catch (err) {
            console.error(err);
            toast.error("Erro ao atualizar projeto.");
        } finally {
            toast.dismiss(loadingToast);
        }
    };

    const confirmDeleteProject = (project) => {
        setProjectToDelete(project);
        setIsDeleteModalOpen(true);
    };

    const handleDeleteProject = async () => {
        if (!projectToDelete) return;
        
        const loadingToast = toast.loading("Excluindo projeto...");
        try {
            const res = await fetchWithAuth(`${API_URL}/projects/${projectToDelete.id}`, {
                method: 'DELETE'
            });

            if (res.status === 204 || res.ok) {
                toast.success("Projeto excluído com sucesso!");
                setIsDeleteModalOpen(false);
                setProjectToDelete(null);
                // Atualiza também os clientes pois seus project_id foram limpos
                if (typeof fetchClients === 'function') {
                    fetchClients();
                }
                fetchProjects();
            } else {
                const errData = await res.json();
                toast.error(errData.detail || "Erro ao excluir projeto.");
            }
        } catch (err) {
            console.error(err);
            toast.error("Erro ao excluir projeto.");
        } finally {
            toast.dismiss(loadingToast);
        }
    };

    const handleToggleExpand = (project) => {
        if (expandedProjectId === project.id) {
            setExpandedProjectId(null);
            setSelectedClientIds([]);
        } else {
            setExpandedProjectId(project.id);
            // Preenche com os IDs dos clientes atualmente associados
            setSelectedClientIds(project.clients?.map(c => c.id) || []);
        }
    };

    const handleClientCheckboxChange = (clientId) => {
        setSelectedClientIds(prev => {
            if (prev.includes(clientId)) {
                return prev.filter(id => id !== clientId);
            } else {
                return [...prev, clientId];
            }
        });
    };

    const handleSaveAssociations = async (projectId) => {
        setSavingAssociations(true);
        const loadingToast = toast.loading("Salvando vínculos de clientes...");
        try {
            const res = await fetchWithAuth(`${API_URL}/projects/${projectId}/clients`, {
                method: 'POST',
                body: JSON.stringify({ client_ids: selectedClientIds })
            });

            if (res.ok) {
                toast.success("Vínculos salvos com sucesso!");
                // Atualiza projetos e clientes no contexto global
                await Promise.all([
                    fetchProjects(),
                    typeof fetchClients === 'function' ? fetchClients() : Promise.resolve()
                ]);
            } else {
                const errData = await res.json();
                toast.error(errData.detail || "Erro ao vincular clientes.");
            }
        } catch (err) {
            console.error(err);
            toast.error("Erro ao vincular clientes.");
        } finally {
            setSavingAssociations(false);
            toast.dismiss(loadingToast);
        }
    };

    // Helper para descobrir em qual projeto o cliente já está vinculado
    const getClientProjectName = (client, currentProjectId) => {
        const foundProj = projects.find(p => p.id !== currentProjectId && p.clients?.some(c => c.id === client.id));
        return foundProj ? foundProj.name : null;
    };

    return {
        projects,
        loading,
        newProjectName,
        setNewProjectName,
        isCreating,
        setIsCreating,
        editingProjectId,
        editingName,
        setEditingName,
        expandedProjectId,
        selectedClientIds,
        savingAssociations,
        projectToDelete,
        setProjectToDelete,
        isDeleteModalOpen,
        setIsDeleteModalOpen,
        isSuperAdmin,
        fetchProjects,
        handleCreateProject,
        handleStartEdit,
        handleCancelEdit,
        handleSaveEdit,
        confirmDeleteProject,
        handleDeleteProject,
        handleToggleExpand,
        handleClientCheckboxChange,
        handleSaveAssociations,
        getClientProjectName
    };
}
