export const ERROR_EXPLANATIONS = {
    "(#132015) O template está temporariamente indisponível para uso porque foi pausado devido à baixa qualidade.": {
        titulo: "Template Pausado por Baixa Qualidade",
        descricao: "O modelo de mensagem (template) foi pausado temporariamente pelo WhatsApp/Meta após receber feedback negativo (denúncias de spam ou baixa qualidade) dos clientes.",
        acao: "Pare imediatamente o disparo! Revise o conteúdo da mensagem e aguarde a liberação ou crie um novo template mais amigável para evitar bloqueios na API."
    },
    "Erro Meta 131049: Esta mensagem não foi entregue para manter o engajamento saudável do ecossistema.": {
        titulo: "Bloqueio de Integridade Meta",
        descricao: "O WhatsApp bloqueou o envio para proteger os destinatários contra possíveis abusos ou excesso de mensagens não solicitadas (spam).",
        acao: "Evite continuar disparando a mesma mensagem em lote imediatamente. Aumente o delay de disparo e utilize um funil com interação prévia para aquecer os leads."
    },
    "Erro Meta 131026: Mensagem não entregável": {
        titulo: "Número Inválido ou Inexistente",
        descricao: "O número de telefone de destino não está registrado no WhatsApp ou está inválido.",
        acao: "Remova este contato da sua lista de disparos. Tentar enviar repetidamente para números inexistentes prejudica a reputação do seu número na Meta."
    },
    "(#2) Serviço temporariamente indisponível (Erro do Servidor da Meta)": {
        titulo: "Instabilidade Temporária da Meta",
        descricao: "Falha momentânea ou instabilidade nos servidores da própria Meta/WhatsApp Cloud API.",
        acao: "Não se preocupe com o contato. Este erro é de infraestrutura da Meta. Você pode tentar reenviar a mensagem para eles daqui a alguns minutos."
    },
    "(#131000) Algo deu errado (Erro do Servidor da Meta)": {
        titulo: "Erro Interno da Meta",
        descricao: "Um erro interno genérico desconhecido ocorreu nos servidores do WhatsApp Cloud API.",
        acao: "Falha técnica temporária do sistema deles. Não indica problema no contato ou template. Pode tentar realizar o reenvio mais tarde."
    },
    "Lista de Exclusão (Bloqueado)": {
        titulo: "Contato Bloqueado Internamente",
        descricao: "O destinatário foi inserido na lista interna de exclusão (Blacklist/Opt-out) para não receber novos disparos.",
        acao: "Respeite a privacidade do contato. O ZapVoice bloqueou o envio automaticamente. Não envie mensagens manualmente por outros meios para evitar denúncias."
    }
};
