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
        titulo: "Número em Experimento da Meta (Temporário)",
        descricao: "O número do destinatário foi selecionado aleatoriamente pela Meta para um teste/experimento interno temporário do próprio WhatsApp que restringe o envio ativo de mensagens promocionais/marketing.",
        acao: "Isso NÃO é um bloqueio definitivo do contato nem denúncia! É um teste temporário da Meta. Se o cliente mandar uma mensagem para você (abrindo a janela de 24h) ou quando a Meta concluir o teste no número dele, você poderá enviar mensagens normalmente."
    },
    "INVALID_PARAMETER": {
        titulo: "Parâmetro ou Número Inválido (Erro Meta 131009)",
        descricao: "A Meta/WhatsApp rejeitou o envio porque um dos dados fornecidos é inválido. Na maioria dos casos, isso ocorre quando o número de telefone possui formato incorreto (números duplicados ou concatenados, ex: 24 dígitos) ou quando uma variável do template foi preenchida incorretamente.",
        acao: "Verifique o número de telefone deste contato na sua lista e remova os dígitos duplicados/concatenados. Se o número estiver correto, verifique se todas as variáveis do template selecionado estão preenchidas devidamente."
    },
    "TEMPLATE_24H_LIMIT": {
        titulo: "Template Já Enviado nas Últimas 24 Horas",
        descricao: "O envio para este contato foi pulado automaticamente para evitar mensagens repetidas e salvar saldo, pois este mesmo modelo de template já foi disparado para este número nas últimas 24 horas.",
        acao: "Para permitir o reenvio deste mesmo template antes das 24 horas, vá até a aba 'Contatos', localize o lead e clique no ícone 🗑️ (Remover Trava) ao lado do nome do último template."
    },
    "PAYMENT_ISSUE": {
        titulo: "Problema de Pagamento na Conta Meta (Erro 131042)",
        descricao: "A Meta/WhatsApp bloqueou o envio de mensagens ativas porque existe uma cobrança pendente ou problema na forma de pagamento cadastrada no Gerenciador de Negócios (Meta Business Manager).",
        acao: "Para resolver o erro:\n1. Acesse o Gerenciador de Negócios da Meta (business.facebook.com);\n2. Vá em Configurações do Negócio ➔ Formas de Pagamento (ou Contas do WhatsApp ➔ Configurações de Pagamento);\n3. Regularize faturas pendentes ou cadastre um cartão de crédito válido com limite.\nAssim que a Meta aprovar a cobrança, os disparos serão liberados automaticamente."
    },
    "ACCOUNT_RESTRICTED": {
        titulo: "Conta WhatsApp Restrita na Meta (Erro 133010)",
        descricao: "A Conta de WhatsApp Business (WABA) está temporariamente restrita ou desativada no painel da Meta por violar políticas de mensagens de negócios ou por pendência de verificação da empresa.",
        acao: "Acesse o Gerenciador do WhatsApp no Meta Business Suite, verifique os alertas na aba 'Visão Geral da Conta' e solicite a análise da conta ou complete a verificação da empresa."
    }
};

export const getExplanationKey = (reason) => {
    if (!reason) return null;
    if (reason === 'BLOCKED_VIA_BUTTON') return "BOT_BLOCK";
    if (reason.includes("131042") || reason.toLowerCase().includes("payment issue") || reason.toLowerCase().includes("eligibility payment")) return "PAYMENT_ISSUE";
    if (reason.includes("133010") || reason.toLowerCase().includes("account in restriction") || reason.toLowerCase().includes("account disabled")) return "ACCOUNT_RESTRICTED";
    if (reason.includes("24h") || reason.includes("últimas 24") || reason.toLowerCase().includes("pulado: template")) return "TEMPLATE_24H_LIMIT";
    if (reason.includes("132015") || reason.includes("paused due to low quality")) return "TEMPLATE_PAUSED";
    if (reason.includes("131049") || reason.includes("healthy ecosystem engagement")) return "INTEGRITY_BLOCK";
    if (reason.includes("131026") || reason.includes("undeliverable") || reason.includes("não entregável")) return "UNDELIVERABLE";
    if (reason.includes("131050") || reason.toLowerCase().includes("stop receiving marketing messages") || reason.toLowerCase().includes("marketing messages from your business")) return "MARKETING_OPT_OUT";
    if (reason.includes("130472") || reason.toLowerCase().includes("part of an experiment")) return "META_EXPERIMENT";
    if (reason.includes("131009") || reason.toLowerCase().includes("parameter value is not valid") || reason.toLowerCase().includes("invalid parameter")) return "INVALID_PARAMETER";
    if (reason.includes("(#2)") || reason.includes("service temporarily") || reason.includes("Serviço temporariamente")) return "SERVICE_UNAVAILABLE";
    if (reason.includes("131000") || reason.includes("something went wrong") || reason.includes("Algo deu errado")) return "SOMETHING_WENT_WRONG";
    if (reason.includes("Exclusão") || reason.includes("Bloqueado") || reason.includes("BLOCKED")) return "EXCLUSION_LIST";
    if (reason.toLowerCase().includes("too many requests") || reason.toLowerCase().includes("rate limit") || reason.toLowerCase().includes("limit reached") || reason.includes("80007")) return "RATE_LIMIT";
    return "SOMETHING_WENT_WRONG";
};
