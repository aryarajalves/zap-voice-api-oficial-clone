import { useState } from 'react';
import { API_URL } from '../../../config';
import { fetchWithAuth } from '../../../AuthContext';

export function useDataManagement(activeClient) {
    const [syncedContacts, setSyncedContacts] = useState([]);
    const [loadingContacts, setLoadingContacts] = useState(false);
    const [contactsPage, setContactsPage] = useState(0);
    const [contactsLimit, setContactsLimit] = useState(20);
    const [contactsTotal, setContactsTotal] = useState(0);

    const [memoryLogs, setMemoryLogs] = useState([]);
    const [loadingMemoryLogs, setLoadingMemoryLogs] = useState(false);
    const [memoryLogsPage, setMemoryLogsPage] = useState(0);
    const [memoryLogsLimit, setMemoryLogsLimit] = useState(20);
    const [memoryLogsTotal, setMemoryLogsTotal] = useState(0);

    const [chatLogs, setChatLogs] = useState([]);
    const [loadingChatLogs, setLoadingChatLogs] = useState(false);
    const [chatLogsPage, setChatLogsPage] = useState(0);
    const [chatLogsLimit, setChatLogsLimit] = useState(20);
    const [chatLogsTotal, setChatLogsTotal] = useState(0);

    const fetchSyncedContacts = async () => {
        if (!activeClient) return;
        setLoadingContacts(true);
        try {
            const skip = contactsPage * contactsLimit;
            const res = await fetchWithAuth(`${API_URL}/settings/contacts?skip=${skip}&limit=${contactsLimit}`, {}, activeClient.id);
            if (res.ok) {
                const data = await res.json();
                setSyncedContacts(data.items || []);
                setContactsTotal(data.total || 0);
            }
        } catch (error) {
            console.error("Erro ao buscar contatos sincronizados:", error);
        } finally {
            setLoadingContacts(false);
        }
    };

    const fetchMemoryLogs = async () => {
        if (!activeClient) return;
        setLoadingMemoryLogs(true);
        try {
            const skip = memoryLogsPage * memoryLogsLimit;
            const res = await fetchWithAuth(`${API_URL}/settings/memory-logs?skip=${skip}&limit=${memoryLogsLimit}`, {}, activeClient.id);
            if (res.ok) {
                const data = await res.json();
                setMemoryLogs(data.items || []);
                setMemoryLogsTotal(data.total || 0);
            }
        } catch (error) {
            console.error("Erro ao buscar logs de memória:", error);
        } finally {
            setLoadingMemoryLogs(false);
        }
    };

    const fetchChatLogs = async () => {
        if (!activeClient) return;
        setLoadingChatLogs(true);
        try {
            const skip = chatLogsPage * chatLogsLimit;
            const res = await fetchWithAuth(`${API_URL}/settings/chat-logs?skip=${skip}&limit=${chatLogsLimit}`, {}, activeClient.id);
            if (res.ok) {
                const data = await res.json();
                setChatLogs(data.items || []);
                setChatLogsTotal(data.total || 0);
            }
        } catch (error) {
            console.error("Erro ao buscar logs de chat (AgentFlow):", error);
        } finally {
            setLoadingChatLogs(false);
        }
    };

    return {
        syncedContacts, loadingContacts, contactsPage, setContactsPage, contactsLimit, setContactsLimit, contactsTotal,
        memoryLogs, loadingMemoryLogs, memoryLogsPage, setMemoryLogsPage, memoryLogsLimit, setMemoryLogsLimit, memoryLogsTotal,
        chatLogs, loadingChatLogs, chatLogsPage, setChatLogsPage, chatLogsLimit, setChatLogsLimit, chatLogsTotal,
        fetchSyncedContacts, fetchMemoryLogs, fetchChatLogs
    };
}
