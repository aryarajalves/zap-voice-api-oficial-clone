import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { FiPlay, FiFlag, FiTrash2, FiCopy, FiHelpCircle, FiX, FiCheck } from 'react-icons/fi';

const HELP_CONTENT = {
    "Mensagem": {
        description: "Envia uma mensagem de texto simples ou com variações. Suporta múltiplos botões interativos e restrição de envio em horário comercial.",
        details: [
            "Suporta Spintax (ex: {Oi|Olá|Eae} tudo bem?) para enviar variações aleatórias de texto e evitar bloqueios.",
            "Permite adicionar versões A/B para testar múltiplos textos.",
            "Você pode configurar até 3 botões interativos para ramificar o fluxo a partir das respostas do usuário."
        ],
        outputs: "Conector inferior (resposta geral) e conectores laterais específicos para cada botão interativo criado."
    },
    "Mídia": {
        description: "Envia arquivos de mídia como imagens, vídeos ou documentos (PDF, etc.) no fluxo.",
        details: [
            "Permite fazer upload do arquivo ou inserir uma URL direta.",
            "Ideal para entrega de iscas digitais, imagens promocionais ou PDFs informativos."
        ],
        outputs: "Fluxo sequencial direto."
    },
    "Áudio": {
        description: "Envia um áudio gravado. O WhatsApp exibirá o áudio como se tivesse sido gravado na hora ('Gravando áudio...').",
        details: [
            "Envie arquivos no formato .mp3 ou .ogg.",
            "Ideal para humanizar os disparos, aumentando drasticamente a taxa de conversão e resposta."
        ],
        outputs: "Fluxo sequencial direto."
    },
    "Template WhatsApp": {
        description: "Envia um template pré-aprovado pela Meta (WhatsApp API Oficial) que pode iniciar uma janela de conversa de 24h.",
        details: [
            "Use templates de utilidade ou marketing cadastrados na Meta.",
            "Único tipo de mensagem permitido para iniciar conversas com contatos fora da janela ativa de 24h.",
            "Suporta passagem de variáveis personalizadas (ex: {{1}} = Nome)."
        ],
        outputs: "Fluxo sequencial direto."
    },
    "Disparo de Template (Meta)": {
        description: "Envia um template oficial aprovado na Meta.",
        details: [
            "Usado para iniciar contato ativo com clientes fora da janela de 24 horas.",
            "Pode conter cabeçalhos de mídia ou texto e botões interativos oficiais da Meta."
        ],
        outputs: "Fluxo sequencial direto."
    },
    "Smart Delay": {
        description: "Aplica uma pausa inteligente no fluxo antes de enviar a próxima etapa do funil.",
        details: [
            "Evita que o bot responda de forma instantânea e pareça automatizado.",
            "Permite configurar o tempo exato de espera em segundos, minutos, horas ou dias."
        ],
        outputs: "Fluxo sequencial direto."
    },
    "Condição Inteligente": {
        description: "Verifica condições lógicas antes de seguir o fluxo (ex: verificar se a tag 'lead' está presente ou se o e-mail está preenchido).",
        details: [
            "Permite criar caminhos personalizados e tomadas de decisão inteligentes.",
            "Compara valores de variáveis de contato obtidas no fluxo."
        ],
        outputs: "Verdadeiro (se as condições forem atendidas) e Falso (caso contrário)."
    },
    "Roteamento Dinâmico": {
        description: "Distribui os contatos de forma alternada ou aleatória entre diferentes caminhos.",
        details: [
            "Perfeito para dividir leads de forma justa entre membros da sua equipe de vendas (Round Robin).",
            "Permite adicionar múltiplos caminhos de saída configurando pesos personalizados para cada um."
        ],
        outputs: "Caminhos dinâmicos configurados."
    },
    "Conectar Funil": {
        description: "Direciona o contato para outro funil existente, permitindo a modularização e reutilização de fluxos.",
        details: [
            "Evita criar funis gigantescos e difíceis de dar manutenção.",
            "Permite ramificar ou finalizar um funil iniciando uma nova trilha lógica."
        ],
        outputs: "Transição direta para o funil conectado."
    },
    "Etiquetar Chatwoot": {
        description: "Adiciona ou remove etiquetas (labels) do contato diretamente no painel do Chatwoot.",
        details: [
            "Essencial para categorizar os leads no CRM de forma automática.",
            "Permite filtrar e criar automações baseadas nas tags do Chatwoot."
        ],
        outputs: "Fluxo sequencial direto."
    },
    "Atualizar Contato no Chatwoot": {
        description: "Atualiza informações cadastrais do lead (ex: Nome, E-mail, Telefone) no Chatwoot.",
        details: [
            "Permite manter os dados do cliente sempre atualizados no CRM.",
            "Ideal para preencher dados coletados dinamicamente ao longo da conversa."
        ],
        outputs: "Fluxo sequencial direto."
    },
    "Agendamento Data": {
        description: "Pausa o fluxo e agenda a continuação para uma data e/ou horário específicos. Também gerencia leads que chegam atrasados.",
        details: [
            "Suporta agendamento por data fixa, horário diário recorrente ou ambos.",
            "A opção 'Desvio por Atraso' permite definir uma tolerância (ex: 3 horas). Se o lead entrar no fluxo após esse limite tolerável do horário agendado, ele será desviado para o caminho 'Atrasado'.",
            "Excelente para evitar mensagens fora de tempo (ex: enviar 'Estamos ao vivo' para quem chegou horas depois) e guiar o lead para uma rota alternativa."
        ],
        outputs: "No Horário (dentro do limite agendado) e Atrasado (caso ultrapasse o tempo limite configurado no desvio)."
    },
    "Requisição HTTP (Webhook)": {
        description: "Envia dados do lead e integra o funil com serviços externos (como webhooks em n8n, Make, ActiveCampaign ou seu próprio servidor).",
        details: [
            "Suporta métodos HTTP (como POST, GET, PUT e DELETE) para disparar ações externas.",
            "Ideal para enviar dados cadastrais e eventos do lead para ferramentas externas em tempo real."
        ],
        outputs: "Sucesso (Status 2xx) e Falha (Status 4xx/5xx)."
    },
    "Roleta / Sorteio": {
        description: "Sorteia prêmios ou distribui cupons dinâmicos baseando-se em probabilidade configurada.",
        details: [
            "Perfeito para gamificação de vendas e engajamento do lead.",
            "Garante limites diários de prêmios distribuídos para evitar abusos."
        ],
        outputs: "Ganhador (caso vença o sorteio) e Perdedor (caso não vença)."
    },
    "Segmentação Local (Tag / Blacklist)": {
        description: "Filtra contatos com base em tags internas locais ou listas de bloqueio no sistema.",
        details: [
            "Ideal para aplicar regras rígidas de restrição antes de enviar mensagens.",
            "Evita enviar mensagens repetidas para clientes em blacklist."
        ],
        outputs: "Permitido (não está bloqueado) e Bloqueado (está na blacklist)."
    },
    "Horário Comercial": {
        description: "Verifica se o horário atual está dentro do expediente comercial definido por você.",
        details: [
            "Útil para evitar importuntar clientes fora de hora.",
            "Roteia o fluxo automaticamente baseado se o escritório está aberto ou fechado."
        ],
        outputs: "Dentro do Horário e Fora do Horário."
    },
    "Pixel de Conversão (Meta CAPI)": {
        description: "Dispara eventos de conversão (ex: Lead, Compra, Checkout) direto para a API de Conversões da Meta.",
        details: [
            "Aumenta a precisão das campanhas de tráfego pago rastreando eventos ocorridos no WhatsApp.",
            "Dispensa o uso de cookies de navegador, enviando dados do servidor direto para a Meta."
        ],
        outputs: "Fluxo sequencial direto."
    },
    "Ações de CRM": {
        description: "Executa tarefas automáticas de CRM (ex: alterar status do lead, atribuir agente responsável).",
        details: [
            "Automatiza a triagem e direcionamento de leads no Chatwoot.",
            "Mantém o pipeline do CRM organizado sem esforço manual."
        ],
        outputs: "Fluxo sequencial direto."
    },
    "Leads Quentes": {
        description: "Identifica leads com alto interesse (Hot Leads) e alerta a equipe de vendas.",
        details: [
            "Atribui prioridade ao contato e notifica o vendedor responsável de forma instantânea.",
            "Acelera o tempo de resposta do time comercial para fechar mais vendas."
        ],
        outputs: "Fluxo sequencial direto."
    },
    "Verificar Janela 24h": {
        description: "Verifica se a janela oficial de 24h do WhatsApp está aberta para o contato.",
        details: [
            "Se a janela estiver aberta, você pode enviar mensagens livres e grátis.",
            "Se a janela estiver fechada, você é forçado a usar um template pago para reengajar o contato."
        ],
        outputs: "Aberta (envio grátis permitido) e Fechada (necessário usar template oficial)."
    },
    "Aguardar Ação": {
        description: "Pausa o funil e aguarda que um evento externo ou gatilho específico aconteça para continuar.",
        details: [
            "Útil para criar fluxos condicionais baseados no comportamento do usuário no Chatwoot.",
            "Pode ser configurado para expirar após um tempo limite (timeout) se a ação não for realizada."
        ],
        outputs: "Sucesso (ação realizada) e Tempo Excedido (timeout atingido)."
    },
    "Entrada de Dados": {
        description: "Coleta informações digitadas pelo usuário (ex: E-mail, CPF, CEP) e salva em uma variável de contato.",
        details: [
            "Permite criar fluxos de cadastro e captação de dados.",
            "Suporta uma pergunta inicial opcional que é enviada automaticamente quando o lead atinge o nó, com suporte a otimização por Inteligência Artificial (IA).",
            "Suporta regras de validação (ex: validar se o texto digitado é de fato um e-mail válido).",
            "Permite configurar re-perguntas automáticas se a resposta for inválida."
        ],
        outputs: "Sucesso (dado válido coletado), Falha (tentativas esgotadas) e Tempo Limite (timeout)."
    }
};

const NodeHeader = ({ label, icon: Icon, colorClass, onDelete, isStart, onSetStart, onDuplicate }) => {
    const [isHelpOpen, setIsHelpOpen] = useState(false);
    const help = HELP_CONTENT[label];

    return (
        <div className="flex items-center justify-between gap-2 mb-2 border-b border-gray-100 dark:border-gray-700 pb-2">
            <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded-lg ${colorClass}`}>
                    <Icon size={16} />
                </div>
                <span className="text-xs font-black uppercase tracking-widest text-gray-500 dark:text-gray-400">{label}</span>
                
                {help && (
                    <button
                        type="button"
                        onClick={() => setIsHelpOpen(true)}
                        className="nodrag text-gray-400 hover:text-blue-500 transition p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700/50 flex items-center justify-center"
                        title="Como funciona?"
                    >
                        <FiHelpCircle size={13} />
                    </button>
                )}

                {isStart ? (
                    <span className="bg-green-500 text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase shadow-sm flex items-center gap-1 ml-1">
                        <FiPlay size={8} fill="currentColor" /> Início
                    </span>
                ) : (
                    onSetStart && (
                        <button
                            onClick={onSetStart}
                            className="nodrag text-gray-300 hover:text-green-500 transition p-1 group relative ml-1"
                            title="Definir como Início"
                        >
                            <FiFlag size={12} />
                            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-1 py-0.5 bg-gray-800 text-white text-[8px] rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none z-50">
                                Definir Início
                            </span>
                        </button>
                    )
                )}
            </div>
            <div className="flex items-center gap-1">
                {onDuplicate && (
                    <button
                        onClick={onDuplicate}
                        className="nodrag text-gray-400 hover:text-blue-500 transition p-1 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/20"
                        title="Duplicar nó"
                    >
                        <FiCopy size={13} />
                    </button>
                )}
                {!isStart && onDelete && (
                    <button
                        onClick={onDelete}
                        className="nodrag text-gray-400 hover:text-red-500 transition p-1 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20"
                        title="Excluir nó"
                    >
                        <FiTrash2 size={14} />
                    </button>
                )}
            </div>

            {/* Popup Explicativo Glassmorphism Premium */}
            {isHelpOpen && help && createPortal(
                <div 
                    className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in nodrag nopan"
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                    onPointerDown={(e) => e.stopPropagation()}
                    onDragStart={(e) => e.stopPropagation()}
                    onWheel={(e) => e.stopPropagation()}
                >
                    <div 
                        className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border border-gray-200/50 dark:border-white/10 rounded-2xl max-w-md w-full shadow-2xl p-6 relative overflow-hidden animate-in zoom-in duration-300"
                        onClick={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                        onPointerDown={(e) => e.stopPropagation()}
                    >
                        {/* Efeito luminoso de fundo */}
                        <div className="absolute -top-20 -left-20 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
                        <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

                        {/* Cabeçalho do Popup */}
                        <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/5 pb-3 mb-4">
                            <div className="flex items-center gap-2">
                                <div className={`p-2 rounded-xl ${colorClass}`}>
                                    <Icon size={18} />
                                </div>
                                <span className="font-extrabold text-gray-800 dark:text-white text-base">
                                    Nó: {label}
                                </span>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsHelpOpen(false)}
                                className="text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition p-1 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg"
                            >
                                <FiX size={18} />
                            </button>
                        </div>

                        {/* Conteúdo */}
                        <div className="space-y-4 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
                            <div>
                                <h4 className="text-xs font-black uppercase tracking-wider text-blue-500 mb-1">O que faz?</h4>
                                <p className="font-medium text-gray-700 dark:text-gray-200">{help.description}</p>
                            </div>

                            <div>
                                <h4 className="text-xs font-black uppercase tracking-wider text-blue-500 mb-1.5">Funcionamento e Dicas</h4>
                                <ul className="space-y-1.5">
                                    {help.details.map((detail, idx) => (
                                        <li key={idx} className="flex gap-2 items-start text-xs text-gray-600 dark:text-gray-300">
                                            <FiCheck size={14} className="text-green-500 shrink-0 mt-0.5" />
                                            <span>{detail}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {help.outputs && (
                                <div className="bg-gray-50 dark:bg-white/5 p-3 rounded-xl border border-gray-100 dark:border-white/5">
                                    <h4 className="text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-0.5">Caminhos de Saída</h4>
                                    <p className="text-xs text-gray-600 dark:text-gray-300 font-semibold">{help.outputs}</p>
                                </div>
                            )}
                        </div>

                        {/* Rodapé - Botão único para fechar */}
                        <div className="mt-6 border-t border-gray-100 dark:border-white/5 pt-4 flex justify-end">
                            <button
                                type="button"
                                onClick={() => setIsHelpOpen(false)}
                                className="px-5 py-2 rounded-xl text-xs font-bold text-white transition-all bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-95 shadow-md shadow-blue-500/20"
                            >
                                Entendi
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

        </div>
    );
};

export default NodeHeader;
