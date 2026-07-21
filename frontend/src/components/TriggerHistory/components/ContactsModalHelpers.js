// Helper: formata data individual no horário de Brasília com guard contra epoch/nulo
export const formatBRDate = (raw) => {
    if (!raw) return '–';
    try {
        const d = new Date(raw);
        if (isNaN(d.getTime()) || d.getFullYear() < 2000) return '–';
        return d.toLocaleString('pt-BR', {
            timeZone: 'America/Sao_Paulo',
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit', second: '2-digit',
        });
    } catch { return '–'; }
};

export const ERROR_EXPLANATIONS = {
    "TEMPLATE_PAUSED": {
        titulo: "Template Pausado por Baixa Qualidade",
        descricao: "O modelo de mensagem (template) foi pausado temporariamente pelo WhatsApp/Meta após receber feedback negativo (denúncias de spam ou baixa qualidade) dos clientes.",
        acao: "Pare imediatamente o disparo! Revise o conteúdo da mensagem e aguarde a liberação ou crie um novo template mais amigável para evitar bloqueios na API."
    },
    "INTEGRITY_BLOCK": {
        titulo: "Bloqueio de Integridade Meta",
        descricao: "O WhatsApp bloqueou o envio para proteger os destinatários contra possíveis abusos ou excesso de mensagens não solicitadas (spam).",
        acao: "Evite continuar disparando a mesma mensagem em lote imediatamente. Aumente o delay de disparo e utilize um funil com interação prévia para aquecer os leads."
    },
    "UNDELIVERABLE": {
        titulo: "Número Inválido ou Inexistente",
        descricao: "O número de telefone de destino não está registrado no WhatsApp ou está inválido.",
        acao: "Remova este contato da sua lista de disparos. Tentar enviar repetidamente para números inexistentes prejudica a reputação do seu número na Meta."
    },
    "SERVICE_UNAVAILABLE": {
        titulo: "Instabilidade Temporária da Meta",
        descricao: "Falha momentânea ou instabilidade nos servidores da própria Meta/WhatsApp Cloud API.",
        acao: "Não se preocupe com o contato. Este erro é de infraestrutura da Meta. Você pode tentar reenviar a mensagem para eles daqui a alguns minutos."
    },
    "SOMETHING_WENT_WRONG": {
        titulo: "Erro Interno da Meta",
        descricao: "Um erro interno genérico desconhecido ocorreu nos servidores do WhatsApp Cloud API.",
        acao: "Falha técnica temporária do sistema deles. Não indica problema no contato ou template. Pode tentar realizar o reenvio mais tarde."
    },
    "BOT_BLOCK": {
        titulo: "Bloqueou o Bot (Ação do Contato)",
        descricao: "O contato recebeu a mensagem e voluntariamente clicou em um botão de opt-out/sair (ex: 'Sair da Lista' ou 'Bloquear') configurado por você no fluxo do disparo.",
        acao: "O contato expressou o desejo de não receber mais mensagens automatizadas e foi bloqueado de futuros disparos para respeitar sua privacidade."
    },
    "EXCLUSION_LIST": {
        titulo: "Lista de Exclusão (Bloqueado Prévio)",
        descricao: "O contato não recebeu o envio porque o número dele já estava previamente cadastrado na sua Lista de Exclusão (Blacklist/Opt-out) interna do sistema antes do início do lote.",
        acao: "Nenhuma ação é necessária. O sistema barrou o envio automaticamente antes de enviar para a API do WhatsApp para economizar custos e evitar denúncias."
    },
    "RATE_LIMIT": {
        titulo: "Limite de Requisições Excedido (Rate Limit)",
        descricao: "O WhatsApp/Meta ou o próprio servidor bloqueou temporariamente o envio porque a quantidade de mensagens disparadas em um curto intervalo de tempo excedeu os limites de segurança da API.",
        acao: "Evite disparar com concorrência muito alta sem delay. Aumente o tempo de delay (segundos) entre as mensagens nas configurações de disparo ou aguarde alguns minutos antes de tentar reenviar para estes contatos."
    },
    "MARKETING_OPT_OUT": {
        titulo: "Mensagens de Marketing Recusadas",
        descricao: "O destinatário optou por não receber mensagens de marketing/divulgação da sua empresa no WhatsApp.",
        acao: "O WhatsApp/Meta não permite enviar mensagens de marketing para este contato. Evite novos envios promocionais para este número para preservar a saúde da sua linha."
    },
    "META_EXPERIMENT": {
        titulo: "Número em Experimento da Meta",
        descricao: "O número de telefone do destinatário faz parte de um grupo de testes ou experimento interno do próprio WhatsApp/Meta.",
        acao: "Este bloqueio é imposto diretamente pela Meta. Evite reenviar mensagens repetidamente para este contato para não comprometer a qualidade do seu número."
    }
};

export const getExplanationKey = (reason) => {
    if (!reason) return null;
    if (reason === 'BLOCKED_VIA_BUTTON') return "BOT_BLOCK";
    if (reason.includes("132015") || reason.includes("paused due to low quality")) return "TEMPLATE_PAUSED";
    if (reason.includes("131049") || reason.includes("healthy ecosystem engagement")) return "INTEGRITY_BLOCK";
    if (reason.includes("131026") || reason.includes("undeliverable") || reason.includes("não entregável")) return "UNDELIVERABLE";
    if (reason.includes("131050") || reason.toLowerCase().includes("stop receiving marketing messages") || reason.toLowerCase().includes("marketing messages from your business")) return "MARKETING_OPT_OUT";
    if (reason.includes("130472") || reason.toLowerCase().includes("part of an experiment")) return "META_EXPERIMENT";
    if (reason.includes("(#2)") || reason.includes("service temporarily") || reason.includes("Serviço temporariamente")) return "SERVICE_UNAVAILABLE";
    if (reason.includes("131000") || reason.includes("something went wrong") || reason.includes("Algo deu errado")) return "SOMETHING_WENT_WRONG";
    if (reason.includes("Exclusão") || reason.includes("Bloqueado") || reason.includes("BLOCKED")) return "EXCLUSION_LIST";
    if (reason.toLowerCase().includes("too many requests") || reason.toLowerCase().includes("rate limit") || reason.toLowerCase().includes("limit reached") || reason.includes("80007")) return "RATE_LIMIT";
    return null;
};
