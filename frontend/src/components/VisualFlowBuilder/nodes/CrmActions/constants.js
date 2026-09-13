// Explica para que serve cada plataforma disponível na Ação de CRM,
// para o usuário entender a diferença antes de escolher.
export const PLATFORM_INFO = {
    chatwoot: {
        title: 'Atendimento (Chat Local)',
        description: 'Executa a ação direto na conversa da sua ferramenta de chat/atendimento do próprio ZapVoice: etiquetar a conversa, atualizar dados do contato, adicionar nota privada ou trocar o agente responsável.'
    },
    local: {
        title: 'Segmentação Local (ZapVoice)',
        description: 'Atua direto no banco de contatos (leads) do próprio ZapVoice, sem depender de nenhum serviço externo: adiciona/remove tags ou bloqueia/desbloqueia o contato na blacklist local, controlando quem recebe disparos futuros.'
    },
    manychat: {
        title: 'ManyChat',
        description: 'Integra com sua conta ManyChat (CRM externo): adiciona/remove tags ou define custom fields diretamente lá. Use quando o fluxo de automação principal do contato roda no ManyChat.'
    }
};
