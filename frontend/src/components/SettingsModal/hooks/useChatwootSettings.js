import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { API_URL } from '../../../config';
import { fetchWithAuth } from '../../../AuthContext';

export function useChatwootSettings(activeClient, formData) {
    // Agents
    const [agents, setAgents] = useState([]);
    const [loadingAgents, setLoadingAgents] = useState(false);
    const [newAgent, setNewAgent] = useState({ name: '', email: '', role: 'agent' });
    const [isAddingAgent, setIsAddingAgent] = useState(false);
    const [agentToDelete, setAgentToDelete] = useState(null);

    // Labels
    const [labels, setLabels] = useState([]);
    const [loadingLabels, setLoadingLabels] = useState(false);
    const [isAddingLabel, setIsAddingLabel] = useState(false);
    const [editingLabel, setEditingLabel] = useState(null);
    const [labelForm, setLabelForm] = useState({ title: '', color: '#3352f9' });

    const fetchAgents = async () => {
        if (!activeClient) return;
        setLoadingAgents(true);
        try {
            const res = await fetchWithAuth(`${API_URL}/chatwoot/agents`, {}, activeClient.id);
            if (res.ok) {
                const data = await res.json();
                setAgents(Array.isArray(data) ? data : []);
            } else {
                setAgents([]);
            }
        } catch (error) {
            console.error("Erro ao buscar agentes:", error);
            setAgents([]);
        } finally {
            setLoadingAgents(false);
        }
    };

    const handleAddAgent = async () => {
        if (!newAgent.name || !newAgent.email) {
            toast.error("Preencha nome e email do agente");
            return;
        }
        setIsAddingAgent(true);
        const loadingToast = toast.loading("Adicionando agente no Chatwoot...");
        try {
            const res = await fetchWithAuth(`${API_URL}/chatwoot/agents`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newAgent)
            }, activeClient?.id);
            if (res.ok) {
                toast.success("Agente adicionado com sucesso!");
                setNewAgent({ name: '', email: '', role: 'agent' });
                fetchAgents();
            } else {
                const err = await res.json();
                throw new Error(err.detail || "Erro ao adicionar agente");
            }
        } catch (error) {
            toast.error(error.message);
        } finally {
            setIsAddingAgent(false);
            toast.dismiss(loadingToast);
        }
    };

    const confirmDeleteAgent = async () => {
        if (!agentToDelete) return;
        const agentId = agentToDelete.id;
        setAgentToDelete(null);
        const loadingToast = toast.loading("Removendo agente...");
        try {
            const res = await fetchWithAuth(`${API_URL}/chatwoot/agents/${agentId}`, {
                method: 'DELETE'
            }, activeClient?.id);
            if (res.ok) {
                toast.success("Agente removido com sucesso!");
                setAgents(prev => prev.filter(a => a.id !== agentId));
            } else {
                const err = await res.json();
                throw new Error(err.detail || "Erro ao remover agente");
            }
        } catch (error) {
            toast.error(error.message);
        } finally {
            toast.dismiss(loadingToast);
        }
    };

    const fetchLabels = async () => {
        if (!activeClient || !formData.CHATWOOT_API_TOKEN) return;
        setLoadingLabels(true);
        try {
            const res = await fetchWithAuth(`${API_URL}/chatwoot/labels`, {}, activeClient.id);
            if (res.ok) {
                const data = await res.json();
                setLabels(data || []);
            }
        } catch (error) {
            console.error("Erro ao buscar etiquetas:", error);
        } finally {
            setLoadingLabels(false);
        }
    };

    const handleAddLabel = async () => {
        if (!activeClient || !labelForm.title) return;
        setIsAddingLabel(true);
        try {
            const res = await fetchWithAuth(`${API_URL}/chatwoot/labels`, {
                method: 'POST',
                body: JSON.stringify(labelForm)
            }, activeClient.id);
            if (res.ok) {
                toast.success("Etiqueta criada com sucesso!");
                setLabelForm({ title: '', color: '#3352f9' });
                fetchLabels();
            } else {
                const err = await res.json();
                toast.error(err.detail || "Erro ao criar etiqueta");
            }
        } catch (error) {
            toast.error("Erro de conexão");
        } finally {
            setIsAddingLabel(false);
        }
    };

    const handleUpdateLabel = async () => {
        if (!activeClient || !editingLabel || !labelForm.title) return;
        setIsAddingLabel(true);
        try {
            const res = await fetchWithAuth(`${API_URL}/chatwoot/labels/${editingLabel.id}`, {
                method: 'PATCH',
                body: JSON.stringify(labelForm)
            }, activeClient.id);
            if (res.ok) {
                toast.success("Etiqueta atualizada!");
                setEditingLabel(null);
                setLabelForm({ title: '', color: '#3352f9' });
                fetchLabels();
            } else {
                toast.error("Erro ao atualizar etiqueta");
            }
        } catch (error) {
            toast.error("Erro de conexão");
        } finally {
            setIsAddingLabel(false);
        }
    };

    const handleDeleteLabel = async (labelId) => {
        if (!activeClient || !window.confirm("Deseja realmente excluir esta etiqueta?")) return;
        try {
            const res = await fetchWithAuth(`${API_URL}/chatwoot/labels/${labelId}`, {
                method: 'DELETE'
            }, activeClient.id);
            if (res.ok) {
                toast.success("Etiqueta removida!");
                fetchLabels();
            } else {
                toast.error("Erro ao remover etiqueta");
            }
        } catch (error) {
            toast.error("Erro de conexão");
        }
    };

    return {
        agents, loadingAgents, newAgent, setNewAgent, isAddingAgent, agentToDelete, setAgentToDelete,
        labels, loadingLabels, isAddingLabel, editingLabel, setEditingLabel, labelForm, setLabelForm,
        fetchAgents, handleAddAgent, confirmDeleteAgent, fetchLabels, handleAddLabel, handleUpdateLabel, handleDeleteLabel
    };
}
