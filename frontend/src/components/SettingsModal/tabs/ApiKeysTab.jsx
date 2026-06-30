import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { FiKey, FiPlus, FiTrash2, FiCopy, FiAlertTriangle, FiCheck } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { API_URL } from '../../../config';

const ApiKeysTab = ({ user, activeClient }) => {
    const [keys, setKeys] = useState([]);
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);
    const [loadingList, setLoadingList] = useState(true);
    
    // Armazena a chave gerada recentemente para exibição única
    const [newlyCreatedKey, setNewlyCreatedKey] = useState(null);
    const [copied, setCopied] = useState(false);

    // Controle do Modal/Popup de Confirmação de Deleção
    const [keyToDelete, setKeyToDelete] = useState(null);
    const [deletingId, setDeletingId] = useState(null);

    const getHeaders = () => {
        const token = localStorage.getItem('token');
        const clientId = activeClient?.id || user?.client_id || '';
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'X-Client-ID': String(clientId)
        };
    };

    const fetchKeys = async () => {
        setLoadingList(true);
        try {
            const response = await fetch(`${API_URL}/api-keys`, {
                headers: getHeaders()
            });
            if (response.ok) {
                const data = await response.json();
                setKeys(data);
            } else {
                try {
                    const err = await response.json();
                    toast.error(err.detail || "Erro ao buscar tokens de API.");
                } catch (e) {
                    toast.error("Erro ao processar a resposta do servidor.");
                }
            }
        } catch (error) {
            console.error(error);
            toast.error("Falha na comunicação com o servidor.");
        } finally {
            setLoadingList(false);
        }
    };

    useEffect(() => {
        if (activeClient?.id || user?.client_id) {
            fetchKeys();
        } else {
            setLoadingList(false); // Destrava se não tiver cliente
        }
    }, [activeClient?.id, user?.client_id]);

    const handleCreateKey = async (e) => {
        e.preventDefault();
        if (!name.trim()) {
            toast.error("Por favor, dê um nome ao token de API.");
            return;
        }

        setLoading(true);
        setNewlyCreatedKey(null);
        setCopied(false);

        try {
            const response = await fetch(`${API_URL}/api-keys`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({ name: name.trim() })
            });

            if (response.ok) {
                const data = await response.json();
                setNewlyCreatedKey(data);
                setName('');
                toast.success("Token de API gerado com sucesso!");
                fetchKeys();
            } else {
                const err = await response.json();
                toast.error(err.detail || "Falha ao gerar o token de API.");
            }
        } catch (error) {
            console.error(error);
            toast.error("Erro ao conectar com o servidor.");
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteKey = async () => {
        if (!keyToDelete) return;
        setDeletingId(keyToDelete.id);

        try {
            const response = await fetch(`${API_URL}/api-keys/${keyToDelete.id}/revoke`, {
                method: 'POST',
                headers: getHeaders()
            });

            if (response.ok) {
                toast.success("Token de API revogado com sucesso!");
                setKeyToDelete(null);
                fetchKeys();
            } else {
                const err = await response.json();
                toast.error(err.detail || "Erro ao revogar o token de API.");
            }
        } catch (error) {
            console.error(error);
            toast.error("Falha na requisição.");
        } finally {
            setDeletingId(null);
        }
    };

    const copyTokenToClipboard = (tokenText) => {
        if (!tokenText) return;
        navigator.clipboard.writeText(tokenText);
        setCopied(true);
        toast.success("Token copiado para a área de transferência!");
        setTimeout(() => setCopied(false), 2000);
    };

    const formatDate = (dateString) => {
        if (!dateString) return '';
        const d = new Date(dateString);
        return d.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Header */}
            <div className="flex items-center gap-2 pb-2 border-b border-gray-100 dark:border-white/5">
                <FiKey className="text-blue-500 w-5 h-5" />
                <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200">Tokens de API</h3>
            </div>

            <p className="text-xs text-gray-500 dark:text-gray-400 max-w-2xl leading-relaxed">
                Utilize as API Keys para integrar ferramentas de automação externas (como n8n, Make, Zapier ou chatbots) com os funis e rotas do ZapVoice. Os tokens usam o prefixo <code className="bg-gray-100 dark:bg-white/10 px-1 py-0.5 rounded text-blue-600 dark:text-blue-400 font-mono">zv_live_</code> para fácil identificação.
            </p>

            {/* Gerador de Token */}
            <div className="bg-gray-50 dark:bg-white/5 p-5 rounded-[1.5rem] border border-gray-100 dark:border-white/5 space-y-4">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Gerar Novo Token</h4>
                
                <div className="flex flex-col sm:flex-row gap-3">
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                handleCreateKey(e);
                            }
                        }}
                        placeholder="Ex: Integração n8n Produção"
                        disabled={loading}
                        className="flex-1 p-2.5 border border-gray-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white dark:bg-[#1f2937]/50 text-gray-900 dark:text-white placeholder:text-gray-400 text-sm"
                        maxLength={100}
                    />
                    <button
                        type="button"
                        onClick={handleCreateKey}
                        disabled={loading || !name.trim()}
                        className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        <FiPlus size={16} />
                        {loading ? "Gerando..." : "Gerar Token"}
                    </button>
                </div>
            </div>

            {/* Caixa de Token Gerado */}
            {newlyCreatedKey && (
                <div className="bg-amber-500/10 border-2 border-amber-500/30 p-5 rounded-[1.5rem] space-y-4 animate-in zoom-in-95 duration-300">
                    <div className="flex gap-2 text-amber-600 dark:text-amber-400">
                        <FiAlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                        <div>
                            <h5 className="font-bold text-sm">Cuidado: Copie sua chave de API agora!</h5>
                            <p className="text-xs text-amber-700/80 dark:text-amber-400/80 mt-1 leading-relaxed">
                                Por motivos de segurança, nós criptografamos sua chave e você **nunca mais** poderá visualizá-la novamente nesta tela após fechar ou atualizar.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 bg-white dark:bg-[#1a2234] border border-amber-500/20 p-3 rounded-xl font-mono text-sm overflow-x-auto text-gray-800 dark:text-white">
                        <span className="flex-1 select-all break-all">{newlyCreatedKey.api_key}</span>
                        <button
                            type="button"
                            onClick={() => copyTokenToClipboard(newlyCreatedKey.api_key)}
                            className="p-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-lg transition-all flex-shrink-0"
                            title="Copiar token"
                        >
                            {copied ? <FiCheck size={18} className="text-green-500" /> : <FiCopy size={18} />}
                        </button>
                    </div>
                </div>
            )}

            {/* Tabela / Lista de Tokens */}
            <div className="space-y-3">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Tokens Ativos</h4>

                {loadingList ? (
                    <div className="py-8 text-center text-sm text-gray-400">
                        <div className="animate-spin inline-block w-6 h-6 border-2 border-t-blue-500 border-gray-200 rounded-full mb-2"></div>
                        <p>Carregando chaves de API...</p>
                    </div>
                ) : keys.length === 0 ? (
                    <div className="py-8 text-center border border-dashed border-gray-200 dark:border-white/5 rounded-xl text-gray-400 dark:text-gray-500 text-sm">
                        Nenhum token de API ativo configurado.
                    </div>
                ) : (
                    <div className="border border-gray-100 dark:border-white/5 rounded-[1.5rem] overflow-hidden bg-white dark:bg-transparent">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-50 dark:bg-white/5 border-b border-gray-100 dark:border-white/5 text-gray-500 dark:text-gray-400 text-xs font-bold uppercase">
                                        <th className="p-4">Nome</th>
                                        <th className="p-4">Prefixo / Máscara</th>
                                        <th className="p-4">Criado em</th>
                                        <th className="p-4 text-center">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-white/5 text-sm text-gray-700 dark:text-gray-300">
                                    {keys.map((key) => (
                                        <tr key={key.id} className="hover:bg-gray-50/50 dark:hover:bg-white/5 transition-all">
                                            <td className="p-4 font-medium">{key.name}</td>
                                            <td className="p-4 font-mono text-xs">
                                                <span className="text-blue-500">{key.token_prefix}</span>
                                                <span className="text-gray-400 dark:text-gray-600">••••••••••••••••••••••••••••</span>
                                            </td>
                                            <td className="p-4 text-xs text-gray-400 dark:text-gray-500">{formatDate(key.created_at)}</td>
                                            <td className="p-4 text-center">
                                                <button
                                                    type="button"
                                                    onClick={() => setKeyToDelete(key)}
                                                    className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                                                    title="Revogar chave"
                                                >
                                                    <FiTrash2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* Popup de Confirmação (RULE[experiencia-usuario.md]) */}
            {keyToDelete && ReactDOM.createPortal(
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-[#1e293b] w-full max-w-md rounded-[2rem] border border-gray-100 dark:border-white/5 shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-200">
                        <div className="flex items-center gap-3 text-red-500">
                            <div className="p-2 bg-red-500/10 rounded-full">
                                <FiTrash2 size={24} />
                            </div>
                            <h4 className="text-lg font-bold">Confirmar Revogação</h4>
                        </div>
                        
                        <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                            Tem certeza que deseja revogar permanentemente o token **"{keyToDelete.name}"**?
                            Qualquer integração externa usando este token deixará de funcionar imediatamente.
                        </p>

                        <div className="flex justify-end gap-3 pt-2">
                            {/* Apenas 1 botão de fechar/cancelar além do botão principal */}
                            <button
                                type="button"
                                onClick={() => setKeyToDelete(null)}
                                disabled={deletingId !== null}
                                className="px-4 py-2 border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 rounded-xl text-sm font-semibold transition-all"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={handleDeleteKey}
                                disabled={deletingId !== null}
                                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold transition-all flex items-center gap-2"
                            >
                                {deletingId ? "Revogando..." : "Revogar"}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default ApiKeysTab;
