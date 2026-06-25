import React, { useState, useEffect } from 'react';
import { fetchWithAuth } from '../../../AuthContext';
import { API_URL } from '../../../config';
import { toast } from 'react-hot-toast';
import { FiFolder, FiPlus, FiTrash2, FiEdit2, FiCheck, FiX, FiUsers, FiInfo } from 'react-icons/fi';
import ConfirmModal from '../../../components/ConfirmModal';

const ProjectManager = ({ currentUser, clients, fetchClients }) => {
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
                fetchClients();
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
            setSelectedClientIds(project.clients.map(c => c.id));
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
                await Promise.all([fetchProjects(), fetchClients()]);
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
        const foundProj = projects.find(p => p.id !== currentProjectId && p.clients.some(c => c.id === client.id));
        return foundProj ? foundProj.name : null;
    };

    return (
        <div className="space-y-6">
            {/* Header / Ações de Criação */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gray-50 dark:bg-gray-900/30 p-4 rounded-xl border border-gray-200 dark:border-white/5">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-blue-500/10 text-blue-500 rounded-lg">
                        <FiFolder size={24} />
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-800 dark:text-white">Projetos Compartilhados</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            Agrupe diferentes números de WhatsApp para compartilhar o mesmo banco de contatos (leads).
                        </p>
                    </div>
                </div>

                {isSuperAdmin && (
                    <button
                        onClick={() => setIsCreating(!isCreating)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm font-medium w-full sm:w-auto justify-center"
                    >
                        {isCreating ? <FiX /> : <FiPlus />}
                        {isCreating ? "Cancelar" : "Novo Projeto"}
                    </button>
                )}
            </div>

            {/* Form de Criação */}
            {isCreating && isSuperAdmin && (
                <form onSubmit={handleCreateProject} className="flex gap-2 max-w-md bg-white dark:bg-[#1e293b] p-4 rounded-xl border border-gray-200 dark:border-white/5 shadow-sm">
                    <input
                        type="text"
                        placeholder="Nome do Projeto (Ex: Operação Principal)"
                        value={newProjectName}
                        onChange={(e) => setNewProjectName(e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 dark:text-white"
                        required
                    />
                    <button
                        type="submit"
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium text-sm rounded-lg transition-colors flex items-center gap-1"
                    >
                        <FiCheck /> Criar
                    </button>
                </form>
            )}

            {/* Listagem de Projetos */}
            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
            ) : projects.length === 0 ? (
                <div className="text-center py-12 bg-white dark:bg-[#1e293b] rounded-xl border border-gray-200 dark:border-white/5">
                    <FiFolder className="mx-auto text-gray-400 mb-3" size={40} />
                    <p className="text-gray-500 dark:text-gray-400">Nenhum projeto cadastrado.</p>
                    <p className="text-xs text-gray-400 mt-1">Crie um projeto acima para começar a agrupar seus números.</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {projects.map((project) => {
                        const isExpanded = expandedProjectId === project.id;
                        const isEditing = editingProjectId === project.id;

                        return (
                            <div
                                key={project.id}
                                className="bg-white dark:bg-[#1e293b] rounded-xl border border-gray-200 dark:border-white/5 overflow-hidden transition-all shadow-sm"
                            >
                                {/* Cabeçalho do Projeto */}
                                <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/10">
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                        <FiFolder className="text-blue-500 shrink-0" size={20} />
                                        {isEditing ? (
                                            <div className="flex items-center gap-2 flex-1 max-w-md">
                                                <input
                                                    type="text"
                                                    value={editingName}
                                                    onChange={(e) => setEditingName(e.target.value)}
                                                    className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-700 rounded bg-transparent text-gray-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                    required
                                                />
                                                <button
                                                    onClick={() => handleSaveEdit(project.id)}
                                                    className="p-1 bg-green-500/10 hover:bg-green-500/20 text-green-600 dark:text-green-400 rounded transition-colors"
                                                >
                                                    <FiCheck size={16} />
                                                </button>
                                                <button
                                                    onClick={handleCancelEdit}
                                                    className="p-1 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 rounded transition-colors"
                                                >
                                                    <FiX size={16} />
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="min-w-0">
                                                <h4 className="font-bold text-gray-800 dark:text-white truncate">{project.name}</h4>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5 mt-0.5">
                                                    <FiUsers size={12} /> {project.clients?.length || 0} número(s) associado(s)
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Ações do Cabeçalho */}
                                    <div className="flex items-center gap-2 self-end sm:self-center">
                                        <button
                                            onClick={() => handleToggleExpand(project)}
                                            className="px-3 py-1.5 text-xs font-semibold bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-lg transition-colors"
                                        >
                                            {isExpanded ? "Fechar Configuração" : "Gerenciar Vínculos"}
                                        </button>

                                        {isSuperAdmin && !isEditing && (
                                            <>
                                                <button
                                                    onClick={() => handleStartEdit(project)}
                                                    title="Editar Nome"
                                                    className="p-2 text-gray-500 hover:text-blue-500 dark:text-gray-400 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all"
                                                >
                                                    <FiEdit2 size={15} />
                                                </button>
                                                <button
                                                    onClick={() => confirmDeleteProject(project)}
                                                    title="Excluir Projeto"
                                                    className="p-2 text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all"
                                                >
                                                    <FiTrash2 size={15} />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* Configuração de Vínculos (Expandido) */}
                                {isExpanded && (
                                    <div className="p-5 bg-white dark:bg-[#1e293b] border-t border-gray-100 dark:border-gray-800 space-y-4">
                                        <div className="flex items-start gap-2 p-3 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/50 rounded-lg text-xs text-blue-700 dark:text-blue-300">
                                            <FiInfo className="shrink-0 mt-0.5" size={14} />
                                            <span>
                                                Marque os números (clientes) que você deseja agrupar no projeto <strong>{project.name}</strong>. 
                                                Eles compartilharão o mesmo banco de leads automaticamente. Números marcados aqui que estavam em outros projetos serão movidos.
                                            </span>
                                        </div>

                                        {clients.length === 0 ? (
                                            <p className="text-sm text-gray-500 dark:text-gray-400">Nenhum cliente disponível para vincular.</p>
                                        ) : (
                                            <div className="grid sm:grid-cols-2 gap-3">
                                                {clients.map((client) => {
                                                    const otherProjName = getClientProjectName(client, project.id);
                                                    const isChecked = selectedClientIds.includes(client.id);

                                                    return (
                                                        <label
                                                            key={client.id}
                                                            className={`flex items-center justify-between p-3 rounded-lg border text-sm cursor-pointer transition-all ${
                                                                isChecked
                                                                    ? 'bg-blue-500/5 border-blue-500/30 text-gray-800 dark:text-white'
                                                                    : 'bg-transparent border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/40 text-gray-600 dark:text-gray-300'
                                                            }`}
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={isChecked}
                                                                    disabled={!isSuperAdmin}
                                                                    onChange={() => handleClientCheckboxChange(client.id)}
                                                                    className="rounded text-blue-600 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 h-4 w-4"
                                                                />
                                                                <div className="flex flex-col">
                                                                    <span className="font-medium">{client.name}</span>
                                                                    {client.whatsapp_number && (
                                                                        <span className="text-xs text-gray-400">{client.whatsapp_number}</span>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            {otherProjName && (
                                                                <span className="text-[10px] px-2 py-0.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 rounded font-semibold">
                                                                    Em: {otherProjName}
                                                                </span>
                                                            )}
                                                        </label>
                                                    );
                                                })}
                                            </div>
                                        )}

                                        {isSuperAdmin && (
                                            <div className="flex justify-end pt-2">
                                                <button
                                                    onClick={() => handleSaveAssociations(project.id)}
                                                    disabled={savingAssociations}
                                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white font-medium text-sm rounded-lg transition-all flex items-center gap-2 shadow-sm"
                                                >
                                                    {savingAssociations ? (
                                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                                    ) : (
                                                        <FiCheck />
                                                    )}
                                                    Salvar Vínculos
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ConfirmModal para Exclusão */}
            <ConfirmModal
                isOpen={isDeleteModalOpen}
                onClose={() => {
                    setIsDeleteModalOpen(false);
                    setProjectToDelete(null);
                }}
                onConfirm={handleDeleteProject}
                title="Confirmar Exclusão do Projeto?"
                message={`Você está prestes a remover o projeto "${projectToDelete?.name}". Todos os clientes associados perderão o vínculo com este projeto (porém NENHUM dado ou cliente será apagado). Esta ação é irreversível.`}
                confirmText="Sim, Excluir Projeto"
                isDangerous={true}
            />
        </div>
    );
};

export default ProjectManager;
