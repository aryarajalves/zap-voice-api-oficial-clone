import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
    FiMessageSquare, FiImage, FiMic, FiClock, FiCpu, 
    FiShuffle, FiLink, FiTag, FiUser, FiCalendar, 
    FiGlobe, FiGift, FiTarget, FiSearch, FiSliders, FiZap, FiFileText, FiDatabase
} from 'react-icons/fi';
import { useAuth } from '../../../AuthContext';


const ContextMenu = ({ top, left, onClose, onAddNode }) => {
    const [search, setSearch] = useState('');
    const inputRef = useRef(null);

    // Foca automaticamente no campo de pesquisa ao abrir o menu
    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.focus();
        }
    }, []);

    // Definição estática dos nós com categorias e palavras-chave de busca
    const nodeOptions = useMemo(() => [
        // --- CONTEÚDO ---
        {
            type: 'messageNode',
            label: 'Mensagem',
            category: 'Conteúdo',
            icon: FiMessageSquare,
            colorClass: 'bg-blue-100 dark:bg-blue-900/50 text-blue-500 group-hover:bg-blue-200',
            hoverBg: 'hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600',
            keywords: ['mensagem', 'texto', 'balao', 'enviar', 'escrever', 'digitar']
        },
        {
            type: 'mediaNode',
            label: 'Mídia',
            category: 'Conteúdo',
            icon: FiImage,
            colorClass: 'bg-pink-100 dark:bg-pink-900/50 text-pink-500 group-hover:bg-pink-200',
            hoverBg: 'hover:bg-pink-50 dark:hover:bg-pink-900/30 hover:text-pink-600',
            keywords: ['midia', 'imagem', 'video', 'foto', 'pdf', 'arquivo', 'upload']
        },
        {
            type: 'audioNode',
            label: 'Áudio',
            category: 'Conteúdo',
            icon: FiMic,
            colorClass: 'bg-cyan-100 dark:bg-cyan-900/50 text-cyan-500 group-hover:bg-cyan-200',
            hoverBg: 'hover:bg-cyan-50 dark:hover:bg-cyan-900/30 hover:text-cyan-600',
            keywords: ['audio', 'gravacao', 'voz', 'ouvir', 'gravado', 'mic']
        },
        {
            type: 'sendTemplateNode',
            label: 'Template Meta (Ativo)',
            category: 'Conteúdo',
            icon: FiFileText,
            colorClass: 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-500 group-hover:bg-emerald-200',
            hoverBg: 'hover:bg-emerald-50 dark:hover:bg-emerald-900/30 hover:text-emerald-600',
            keywords: ['template meta', 'modelo', 'meta', 'mensagem ativa', 'whatsapp oficial', 'template']
        },
        {
            type: 'checkWindowNode',
            label: 'Verificar Janela 24h',
            category: 'Fluxo e Tempo',
            icon: FiClock,
            colorClass: 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-500 group-hover:bg-indigo-200',
            hoverBg: 'hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-600',
            keywords: ['janela 24h', 'verificar janela', 'tempo', 'meta', 'gratis', 'verificar']
        },
        
        // --- FLUXO E TEMPO ---
        {
            type: 'delayNode',
            label: 'Delay',
            category: 'Fluxo e Tempo',
            icon: FiClock,
            colorClass: 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-500 group-hover:bg-yellow-200',
            hoverBg: 'hover:bg-yellow-50 dark:hover:bg-yellow-900/30 hover:text-yellow-600',
            keywords: ['delay', 'tempo', 'esperar', 'aguardar', 'pausa', 'timer']
        },
        {
            type: 'waitEventNode',
            label: 'Aguardar Ação',
            category: 'Fluxo e Tempo',
            icon: FiClock,
            colorClass: 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-500 group-hover:bg-indigo-200',
            hoverBg: 'hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-600',
            keywords: ['aguardar acao', 'monitor', 'conversao', 'compra', 'checkout', 'boleto', 'esperar']
        },
        {
            type: 'inputDataNode',
            label: 'Entrada de Dados (Aguardar)',
            category: 'Fluxo e Tempo',
            icon: FiDatabase,
            colorClass: 'bg-rose-100 dark:bg-rose-900/50 text-rose-500 group-hover:bg-rose-200',
            hoverBg: 'hover:bg-rose-50 dark:hover:bg-rose-900/30 hover:text-rose-600',
            keywords: ['entrada de dados', 'coleta inteligente', 'aguardar resposta', 'ia', 'email', 'telefone', 'cpf', 'dados']
        },
        {
            type: 'dateNode',
            label: 'Agendar Data',
            category: 'Fluxo e Tempo',
            icon: FiCalendar,
            colorClass: 'bg-violet-100 dark:bg-violet-900/50 text-violet-500 group-hover:bg-violet-200',
            hoverBg: 'hover:bg-violet-50 dark:hover:bg-violet-900/30 hover:text-violet-600',
            keywords: ['agendar data', 'calendario', 'data', 'hora', 'agendamento', 'programar']
        },
        {
            type: 'businessHoursNode',
            label: 'Horário Comercial',
            category: 'Fluxo e Tempo',
            icon: FiClock,
            colorClass: 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-500 group-hover:bg-indigo-200',
            hoverBg: 'hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-600',
            keywords: ['horario comercial', 'aberto', 'fechado', 'semana', 'fds', 'funcionamento']
        },

        // --- LÓGICA E DIRECIONAMENTO ---
        {
            type: 'conditionNode',
            label: 'Condição',
            category: 'Lógica',
            icon: FiCpu,
            colorClass: 'bg-purple-100 dark:bg-purple-900/50 text-purple-500 group-hover:bg-purple-200',
            hoverBg: 'hover:bg-purple-50 dark:hover:bg-purple-900/30 hover:text-purple-600',
            keywords: ['condicao', 'se', 'if', 'filtro', 'decidir', 'ramificar', 'verificar']
        },
        {
            type: 'randomizerNode',
            label: 'Teste A/B',
            category: 'Lógica',
            icon: FiShuffle,
            colorClass: 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-500 group-hover:bg-indigo-200',
            hoverBg: 'hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-600',
            keywords: ['teste a/b', 'aleatorio', 'dividir', 'porcentagem', 'split', 'randomizer']
        },
        {
            type: 'linkFunnelNode',
            label: 'Conectar Funil',
            category: 'Lógica',
            icon: FiLink,
            colorClass: 'bg-orange-100 dark:bg-orange-900/50 text-orange-500 group-hover:bg-orange-200',
            hoverBg: 'hover:bg-orange-50 dark:hover:bg-orange-900/30 hover:text-orange-600',
            keywords: ['conectar funil', 'link', 'chamar', 'outro funil', 'funil', 'redirecionar']
        },

        // --- INTEGRAÇÕES E MARKETING ---
        {
            type: 'httpRequestNode',
            label: 'Requisição HTTP (Webhook)',
            category: 'Integrações',
            icon: FiGlobe,
            colorClass: 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-500 group-hover:bg-emerald-200',
            hoverBg: 'hover:bg-emerald-50 dark:hover:bg-emerald-900/30 hover:text-emerald-600',
            keywords: ['requisicao http', 'webhook', 'api', 'url', 'post', 'get', 'integromat', 'make', 'n8n']
        },

        {
            type: 'pixelNode',
            label: 'Pixel de Conversão (Meta CAPI)',
            category: 'Integrações',
            icon: FiTarget,
            colorClass: 'bg-rose-100 dark:bg-rose-900/50 text-rose-500 group-hover:bg-rose-200',
            hoverBg: 'hover:bg-rose-50 dark:hover:bg-rose-900/30 hover:text-rose-600',
            keywords: ['pixel de conversao', 'facebook', 'facebook ads', 'ads', 'capi', 'pixel', 'meta', 'anuncio', 'compra', 'lead']
        },
        {
            type: 'crmActionsNode',
            label: 'Ações de CRM',
            category: 'Integrações',
            icon: FiSliders,
            colorClass: 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-500 group-hover:bg-indigo-200',
            hoverBg: 'hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-600',
            keywords: ['acoes de crm', 'crm', 'chatwoot', 'manychat', 'etiqueta', 'tag', 'nota privada', 'responsavel', 'atribuir']
        },
        {
            type: 'hotLeadsNode',
            label: 'Leads Quentes',
            category: 'Integrações',
            icon: FiZap,
            colorClass: 'bg-orange-100 dark:bg-orange-900/50 text-orange-500 group-hover:bg-orange-200',
            hoverBg: 'hover:bg-orange-50 dark:hover:bg-orange-900/30 hover:text-orange-600',
            keywords: ['leads quentes', 'vendedor', 'alerta', 'rodio', 'distribuir', 'vendas', 'round robin', 'flame', 'quente', 'atendimento']
        },

        // --- GAMIFICAÇÃO ---
        {
            type: 'rouletteNode',
            label: 'Roleta / Sorteio',
            category: 'Gamificação',
            icon: FiGift,
            colorClass: 'bg-amber-100 dark:bg-amber-900/50 text-amber-500 group-hover:bg-amber-200',
            hoverBg: 'hover:bg-amber-50 dark:hover:bg-amber-900/30 hover:text-amber-600',
            keywords: ['roleta', 'sorteio', 'ganhar', 'brinde', 'cupom', 'premio']
        }
    ], []);

    const { user } = useAuth();

    const filteredNodes = useMemo(() => {
        const normalize = str => {
            if (!str) return '';
            return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
        };

        const query = normalize(search);
        
        // Filtrar nós bloqueados para o usuário
        const blockedNodes = user?.blocked_nodes || [];
        const isSuperAdmin = user?.role === 'super_admin';
        const allowedOptions = isSuperAdmin 
            ? nodeOptions 
            : nodeOptions.filter(node => !blockedNodes.includes(node.type));

        if (!query) return allowedOptions;

        return allowedOptions.filter(node => 
            normalize(node.label).includes(query) || 
            normalize(node.category).includes(query) ||
            node.keywords.some(keyword => normalize(keyword).includes(query))
        );
    }, [search, nodeOptions, user]);


    // Agrupa os nós filtrados por suas respectivas categorias mantendo a ordem das seções
    const groupedNodes = useMemo(() => {
        const categoriesOrder = ['Conteúdo', 'Fluxo e Tempo', 'Lógica', 'Integrações', 'Gamificação'];
        const groups = {};
        
        filteredNodes.forEach(node => {
            if (!groups[node.category]) {
                groups[node.category] = [];
            }
            groups[node.category].push(node);
        });

        // Retorna apenas categorias que contêm nós após a filtragem na ordem correta
        return categoriesOrder.filter(cat => groups[cat] && groups[cat].length > 0).map(cat => ({
            name: cat,
            nodes: groups[cat]
        }));
    }, [filteredNodes]);

    return (
        <div
            style={{ top, left }}
            className="absolute z-50 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 w-64 max-h-[420px] flex flex-col overflow-hidden animate-fade-in"
            onMouseLeave={onClose}
        >
            <div className="px-3 py-2 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 flex flex-col gap-1.5 flex-shrink-0">
                <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase text-gray-500 tracking-wider">Adicionar Nó</span>
                    <kbd className="text-[10px] text-gray-400 font-mono">ESC</kbd>
                </div>
                {/* Campo de Busca Integrado */}
                <div className="relative flex items-center">
                    <FiSearch className="absolute left-2.5 text-gray-400 w-3.5 h-3.5" />
                    <input
                        ref={inputRef}
                        type="text"
                        placeholder="Buscar nó..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full text-xs pl-8 pr-2 py-1.5 border rounded-md bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-700 focus:outline-none focus:ring-1 focus:ring-rose-500"
                    />
                </div>
            </div>
            
            <div className="flex-grow flex flex-col p-1 gap-2 overflow-y-auto overflow-x-hidden premium-scrollbar">
                {groupedNodes.length > 0 ? (
                    groupedNodes.map((group) => (
                        <div key={group.name} className="flex flex-col gap-0.5">
                            {/* Header da Categoria estilo ManyChat */}
                            <div className="px-2.5 py-1 text-[9px] font-extrabold uppercase text-gray-400 dark:text-gray-500 tracking-wider select-none">
                                {group.name}
                            </div>
                            {group.nodes.map((node) => {
                                const IconComponent = node.icon;
                                return (
                                    <button
                                        key={node.type}
                                        onClick={() => onAddNode(node.type)}
                                        className={`flex items-center gap-3 px-3 py-1.5 text-xs text-gray-700 dark:text-gray-200 rounded-md transition text-left group ${node.hoverBg}`}
                                    >
                                        <div className={`p-1 rounded transition ${node.colorClass}`}>
                                            <IconComponent size={13} />
                                        </div> 
                                        {node.label}
                                    </button>
                                );
                            })}
                        </div>
                    ))
                ) : (
                    <div className="text-center text-xs text-gray-400 dark:text-gray-500 py-6">
                        Nenhum nó encontrado 🔍
                    </div>
                )}
            </div>
        </div>
    );
};

export default ContextMenu;
