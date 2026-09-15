import React from 'react';
import { Handle, Position } from 'reactflow';
import { FiMessageCircle, FiPlus, FiTrash2, FiGitBranch } from 'react-icons/fi';
import NodeHeader from '../components/NodeHeader';

const DEFAULT_ROUTES = [
    { id: 'route_1', label: 'Suporte / Dúvidas', phrases: 'ajuda, suporte, duvida, problema', matchType: 'contains' },
    { id: 'route_2', label: 'Vendas / Preço', phrases: 'comprar, preco, valor, plano, assinar', matchType: 'contains' }
];

const NewConversationNode = ({ id, data }) => {
    const routes = Array.isArray(data?.routes) && data.routes.length > 0 ? data.routes : DEFAULT_ROUTES;

    const updateRoutes = (newRoutes) => {
        data?.onChange?.(id, { routes: newRoutes });
    };

    const handleAddRoute = () => {
        const newId = `route_${Date.now()}`;
        const newRoute = {
            id: newId,
            label: `Rota ${routes.length + 1}`,
            phrases: '',
            matchType: 'contains'
        };
        updateRoutes([...routes, newRoute]);
    };

    const handleRemoveRoute = (routeId) => {
        if (routes.length <= 1) return;
        const newRoutes = routes.filter((r) => r.id !== routeId);
        updateRoutes(newRoutes);
    };

    const handleRouteChange = (routeId, field, value) => {
        const newRoutes = routes.map((r) => {
            if (r.id === routeId) {
                return { ...r, [field]: value };
            }
            return r;
        });
        updateRoutes(newRoutes);
    };

    return (
        <div className="px-4 py-3 shadow-xl rounded-2xl bg-white dark:bg-gray-800 border-2 border-indigo-500 min-w-[340px] max-w-[380px] transition-all">
            {!data?.isStart && (
                <Handle
                    type="target"
                    position={Position.Left}
                    className="w-3.5 h-3.5 bg-indigo-500 border-2 border-white dark:border-gray-800 shadow-sm"
                />
            )}

            <NodeHeader
                label="Gatilho: Nova Conversa"
                icon={FiGitBranch}
                colorClass="bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400"
                onDelete={() => data?.onDelete?.(id)}
                onDuplicate={() => data?.onDuplicate?.(id)}
                isStart={data?.isStart}
                onSetStart={() => data?.onSetStart?.(id, 'newConversationNode')}
            />

            <div className="mt-2 mb-3 text-[11px] text-gray-500 dark:text-gray-400 flex items-start gap-1.5 bg-indigo-50/60 dark:bg-indigo-950/30 p-2 rounded-lg border border-indigo-100 dark:border-indigo-900/50">
                <FiMessageCircle className="w-3.5 h-3.5 text-indigo-500 mt-0.5 shrink-0" />
                <span>
                    Analisa a <strong>1ª mensagem</strong> do lead no Chat e roteia como um <em>Switch</em> pelas frases configuradas abaixo:
                </span>
            </div>

            <div className="space-y-3">
                {/* LISTA DE ROTAS (SWITCH CASES) */}
                <div className="space-y-2.5">
                    {routes.map((route, idx) => (
                        <div
                            key={route.id}
                            className="p-2.5 rounded-xl bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700/80 shadow-sm relative group"
                        >
                            <div className="flex items-center justify-between gap-2 mb-1.5">
                                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                    <span className="w-4 h-4 rounded-full bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-[10px] font-black flex items-center justify-center shrink-0">
                                        {idx + 1}
                                    </span>
                                    <input
                                        type="text"
                                        placeholder="Nome da Rota / Intenção"
                                        className="nodrag nopan w-full text-xs font-bold bg-transparent text-gray-800 dark:text-gray-200 outline-none placeholder-gray-400"
                                        value={route.label || ''}
                                        onChange={(e) => handleRouteChange(route.id, 'label', e.target.value)}
                                    />
                                </div>
                                {routes.length > 1 && (
                                    <button
                                        type="button"
                                        title="Remover rota"
                                        onClick={() => handleRemoveRoute(route.id)}
                                        className="nodrag nopan text-gray-400 hover:text-red-500 p-1 rounded transition"
                                    >
                                        <FiTrash2 className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>

                            <div className="space-y-1.5">
                                <div>
                                    <div className="flex items-center justify-between text-[10px] text-gray-400 mb-0.5">
                                        <span>Frases ou Palavras-chave:</span>
                                        <select
                                            className="nodrag nopan text-[9px] font-semibold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded px-1.5 py-0.5 border border-gray-200 dark:border-gray-700 outline-none cursor-pointer"
                                            value={route.matchType || 'contains'}
                                            onChange={(e) => handleRouteChange(route.id, 'matchType', e.target.value)}
                                        >
                                            <option value="contains">Contém</option>
                                            <option value="exact">Exato</option>
                                        </select>
                                    </div>
                                    <textarea
                                        rows={2}
                                        placeholder="Separadas por vírgula (ex: preco, valor, quanto custa)"
                                        className="nodrag nopan w-full text-xs p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 outline-none focus:ring-1 focus:ring-indigo-500 shadow-inner resize-none"
                                        value={route.phrases || ''}
                                        onChange={(e) => handleRouteChange(route.id, 'phrases', e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* Handle de saída para esta rota */}
                            <div className="flex items-center justify-end mt-1 pt-1 border-t border-gray-100 dark:border-gray-800/80">
                                <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 mr-2 flex items-center gap-1">
                                    Seguir por {route.label || `Rota ${idx + 1}`} →
                                </span>
                                <Handle
                                    id={route.id}
                                    type="source"
                                    position={Position.Right}
                                    className="w-3.5 h-3.5 bg-indigo-500 border-2 border-white dark:border-gray-800 shadow-sm !-right-2.5"
                                />
                            </div>
                        </div>
                    ))}
                </div>

                {/* BOTÃO ADICIONAR ROTA */}
                <button
                    type="button"
                    onClick={handleAddRoute}
                    className="nodrag nopan w-full py-1.5 px-3 rounded-xl border border-dashed border-indigo-300 dark:border-indigo-700/60 hover:border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/20 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-sm"
                >
                    <FiPlus className="w-3.5 h-3.5" />
                    Adicionar Rota (Case)
                </button>

                {/* ROTA PADRÃO (DEFAULT / FALLBACK) */}
                <div className="p-2.5 rounded-xl bg-gray-100/80 dark:bg-gray-900/80 border border-dashed border-gray-300 dark:border-gray-700 shadow-sm relative flex items-center justify-between">
                    <div>
                        <span className="text-xs font-black text-gray-700 dark:text-gray-300 flex items-center gap-1">
                            Outras Mensagens (Padrão)
                        </span>
                        <p className="text-[9px] text-gray-400">Quando nenhuma frase acima coincidir</p>
                    </div>
                    <Handle
                        id="default"
                        type="source"
                        position={Position.Right}
                        className="w-3.5 h-3.5 bg-gray-500 border-2 border-white dark:border-gray-800 shadow-sm !-right-2.5"
                    />
                </div>
            </div>
        </div>
    );
};

export default NewConversationNode;
