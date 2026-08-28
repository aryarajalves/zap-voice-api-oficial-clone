import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    generateConversationDocHtml,
    exportConversationToDoc,
    exportConversationToHtml,
    fetchAllConversationMessages,
    parseAgentPipeline,
    enrichMessagesWithPipeline,
    groupMessagesByDate,
    parseMessageDate
} from './exportConversationToDoc';


describe('exportConversationToDoc', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('gera HTML formatado identificando mensagens do Usuário, Agente e Anotação Privada', () => {
        const convo = { id: 1083, contact_name: 'Aryaraj', phone: '5585996123586' };
        const messages = [
            { id: 1, sender_type: 'contact', content: 'Olá, gostaria de informações sobre o curso', timestamp: '2026-08-01T13:03:00Z' },
            { id: 2, sender_type: 'user', content: 'Olá Aryaraj! O curso contém 3 módulos exclusivos.', timestamp: '2026-08-01T13:04:00Z' },
            { id: 3, sender_type: 'system', content: '🔒 Anotação Privada: Lead interessado em fechar hoje', timestamp: '2026-08-01T13:05:00Z' }
        ];

        const html = generateConversationDocHtml(convo, messages);

        expect(html).toContain('Histórico de Atendimento - ZapVoice');
        expect(html).toContain('Aryaraj');
        expect(html).toContain('5585996123586');
        expect(html).toContain('👤 Usuário (Cliente)');
        expect(html).toContain('Olá, gostaria de informações sobre o curso');
        expect(html).toContain('🤖 Agente / Atendente');
        expect(html).toContain('O curso contém 3 módulos exclusivos.');
        expect(html).toContain('🔒 Sistema / Anotação');
        expect(html).toContain('Lead interessado em fechar hoje');
        expect(html).not.toContain('Invalid Date');
        // Filtro de anotações privadas presente
        expect(html).toContain('id="toggle-private-notes"');
        expect(html).toContain('🔒 Ocultar anotações privadas');
        expect(html).toContain('data-is-private="true"');
        expect(html).toContain('data-is-private="false"');
    });

    it('agrupa mensagens por múltiplas datas e gera a barra de navegação em abas', () => {
        const convo = { id: 12800, contact_name: 'Cliente VIP', phone: '5511999998888' };
        const messages = [
            { id: 1, sender_type: 'contact', content: 'Primeiro contato no dia 17', timestamp: '2026-08-17T10:00:00Z' },
            { id: 2, sender_type: 'user', content: 'Resposta do atendente no dia 17', timestamp: '2026-08-17T10:05:00Z' },
            { id: 3, sender_type: 'contact', content: 'Retorno no dia 18', timestamp: '2026-08-18T14:30:00Z' },
            { id: 4, sender_type: 'system', content: '🔒 Anotação no dia 19', timestamp: '2026-08-19T09:15:00Z' }
        ];

        const grouped = groupMessagesByDate(messages);
        expect(grouped.uniqueDates.length).toBe(3);
        expect(grouped.totalMessages).toBe(4);
        expect(grouped.totalPrivateNotes).toBe(1);

        const html = generateConversationDocHtml(convo, messages);

        // Deve conter a barra de abas com seletores para todas as datas e cada dia
        expect(html).toContain('class="tabs-container"');
        expect(html).toContain('📅 Filtrar por Data:');
        expect(html).toContain('data-date="all"');
        expect(html).toContain('data-date="17/08/2026"');
        expect(html).toContain('data-date="18/08/2026"');
        expect(html).toContain('data-date="19/08/2026"');

        // Deve conter os grupos de data separados
        expect(html).toContain('class="date-group" data-date="17/08/2026"');
        expect(html).toContain('class="date-group" data-date="18/08/2026"');
        expect(html).toContain('class="date-group" data-date="19/08/2026"');
    });

    it('parseMessageDate extrai corretamente dateKey, dateLabel e timeStr em múltiplos formatos', () => {
        const resIso = parseMessageDate('2026-08-17T08:30:00Z');
        expect(resIso.dateKey).toBe('17/08/2026');
        expect(resIso.dateLabel).toContain('17 de Agosto de 2026');

        const resUnix = parseMessageDate(1723883400); // timestamp unix
        expect(resUnix.dateKey).not.toBe('Sem Data');

        const resEmpty = parseMessageDate(null);
        expect(resEmpty.dateKey).toBe('Sem Data');
    });

    it('renderiza botão e detalhes do pipeline quando o agente possui processing_steps em JSON string', () => {
        const convo = { id: 1083, contact_name: 'Cliente Teste', phone: '5535984623775' };
        const stepsJson = JSON.stringify([
            { step: '📥 Webhook Recebido', detail: 'Mensagem agrupada do contato 5535984623775', timestamp: '2026-08-18T10:58:50-03:00' },
            { step: '🧭 Pre-Router AI', detail: 'Intenção: Dúvida sobre Pagamento', timestamp: '2026-08-18T10:58:52-03:00' },
            { step: '🔍 Busca RAG', detail: '1 item encontrado com relevância 0.92', timestamp: '2026-08-18T10:58:53-03:00' },
            { step: '💬 Resposta Enviada', detail: 'Disparado via ZapVoice', timestamp: '2026-08-18T10:59:49-03:00' }
        ]);

        const messages = [
            {
                id: 101,
                sender_type: 'user',
                content: 'Sim! Aqui está o link de pagamento do Método Laser Day...',
                processing_steps: stepsJson,
                thought: 'O cliente solicitou diretamente a forma de aquisição, rota de pagamento priorizada.',
                event_id: 1234,
                timestamp: '2026-08-18T10:59:49-03:00'
            }
        ];

        const html = generateConversationDocHtml(convo, messages);

        expect(html).toContain('btn-toggle-thought');
        expect(html).toContain('Ver Pensamento do Agente (4 etapas de pipeline)');
        expect(html).toContain('thought-msg-0');
        expect(html).toContain('💡 Raciocínio & Intenção da IA:');
        expect(html).toContain('O cliente solicitou diretamente a forma de aquisição');
        expect(html).toContain('📥 Webhook Recebido');
        expect(html).toContain('🧭 Pre-Router AI');
        expect(html).toContain('🔍 Busca RAG');
        expect(html).toContain('💬 Resposta Enviada');
        expect(html).toContain('⚡ Evento ID: #1234');
    });

    it('parseAgentPipeline normaliza múltiplos formatos de steps e pensamentos corretamente', () => {
        expect(parseAgentPipeline(null).hasPipeline).toBe(false);
        expect(parseAgentPipeline({}).hasPipeline).toBe(false);

        const resArray = parseAgentPipeline({
            processing_steps: [{ step: '🤖 Agente Principal', detail: 'GPT-5.2' }]
        });
        expect(resArray.hasPipeline).toBe(true);
        expect(resArray.steps.length).toBe(1);
        expect(resArray.steps[0].step).toBe('🤖 Agente Principal');

        const resMeta = parseAgentPipeline({
            meta_data: {
                thought: 'Análise de sentimento positiva',
                processing_steps: '[{"step":"🛡️ Bot Defense","detail":"Aprovado"}]',
                event_id: 888
            }
        });
        expect(resMeta.hasPipeline).toBe(true);
        expect(resMeta.thought).toBe('Análise de sentimento positiva');
        expect(resMeta.steps.length).toBe(1);
        expect(resMeta.eventId).toBe(888);
    });

    it('enrichMessagesWithPipeline correlaciona eventos externos com mensagens do agente', async () => {
        const fakeEvents = [
            {
                id: 555,
                agent_response: 'Sim! Aqui está o link de pagamento do Método Laser Day',
                processing_steps: '[{"step":"🔍 Busca RAG","detail":"Relevância 0.95"}]',
                thought: 'Raciocínio simulado'
            }
        ];

        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => fakeEvents
        });

        const messages = [
            { id: 1, sender_type: 'contact', content: 'Quero o link', timestamp: 1722517000 },
            { id: 2, sender_type: 'user', content: 'Sim! Aqui está o link de pagamento do Método Laser Day', timestamp: 1722517010 }
        ];

        const enriched = await enrichMessagesWithPipeline('5535984623775', messages);

        expect(enriched[1].event_id).toBe(555);
        expect(enriched[1].processing_steps).toBe(fakeEvents[0].processing_steps);
        expect(enriched[1].thought).toBe('Raciocínio simulado');
    });

    it('renderiza imagens inline em vez de apenas links de texto', () => {
        const convo = { id: 337, contact_name: 'Dra', phone: '5521996268632' };
        const messages = [
            {
                id: 12,
                sender_type: 'user',
                content: 'Teste envio com imagem',
                message_type: 'image',
                media_url: 'https://api.aryaraj.shop/api/media/proxy/foto_teste.png',
                timestamp: '2026-08-01T13:03:00Z'
            }
        ];

        const html = generateConversationDocHtml(convo, messages);

        expect(html).toContain('<img src="https://api.aryaraj.shop/api/media/proxy/foto_teste.png"');
        expect(html).toContain('alt="Imagem da conversa"');
        expect(html).toContain('🔗 Abrir imagem em alta resolução');
        expect(html).not.toContain('Invalid Date');
    });

    it('executa a função exportConversationToDoc criando link de download', async () => {
        const convo = { id: 337, contact_name: 'Dra', phone: '5521996268632' };
        const messages = [
            { id: 10, sender_type: 'contact', content: 'Estou tentando comprar o seu curso', timestamp: 1722517380 },
            { id: 11, sender_type: 'user', content: 'Segue o link de compra do Método Laser Day', timestamp: 1722517440 }
        ];

        global.fetch = vi.fn().mockResolvedValue({
            ok: false,
            json: async () => []
        });

        const createObjectURLMock = vi.fn().mockReturnValue('blob:http://localhost/fake-doc');
        const revokeObjectURLMock = vi.fn();
        global.URL.createObjectURL = createObjectURLMock;
        global.URL.revokeObjectURL = revokeObjectURLMock;

        const appendChildSpy = vi.spyOn(document.body, 'appendChild');
        const removeChildSpy = vi.spyOn(document.body, 'removeChild');

        await exportConversationToDoc(convo, messages, '11');

        expect(createObjectURLMock).toHaveBeenCalledTimes(1);
        expect(appendChildSpy).toHaveBeenCalled();
        expect(removeChildSpy).toHaveBeenCalled();
    });

    it('agrupa mensagens consecutivas do mesmo remetente em um único bloco de cartão', () => {
        const convo = { id: 999, contact_name: 'Aryaraj', phone: '5585996123586' };
        const messages = [
            { id: 1, sender_type: 'user', content: '😂', timestamp: '2026-08-17T07:33:32Z' },
            { id: 2, sender_type: 'user', content: '😊 😁 😍 💔 💟', timestamp: '2026-08-17T07:33:50Z' },
            { id: 3, sender_type: 'user', content: 'www.google.com.br', timestamp: '2026-08-17T08:35:34Z' },
            { id: 4, sender_type: 'contact', content: 'Imagem recebida', timestamp: '2026-08-17T08:35:59Z' }
        ];

        const grouped = groupMessagesByDate(messages);
        // No dia 17, 3 mensagens seguidas do user devem gerar 1 bloco para o user e 1 bloco para o contact
        expect(grouped.dateGroups[0].consecutiveBlocks.length).toBe(2);
        expect(grouped.dateGroups[0].consecutiveBlocks[0].messages.length).toBe(3);
        expect(grouped.dateGroups[0].consecutiveBlocks[1].messages.length).toBe(1);

        const html = generateConversationDocHtml(convo, messages);
        expect(html).toContain('class="message-items-list"');
        expect(html).toContain('😂');
        expect(html).toContain('😊 😁 😍 💔 💟');
        expect(html).toContain('www.google.com.br');
        expect(html).toContain('Imagem recebida');
    });

    it('busca todas as mensagens da conversa no backend sem limitar às 50 carregadas na tela', async () => {

        const convo = { id: 777, contact_name: 'Yasmin Vieira', phone: '5511980000042', messages_count: 150 };
        const initialScreenMessages = Array.from({ length: 50 }, (_, i) => ({
            id: i + 1,
            sender_type: i % 2 === 0 ? 'contact' : 'user',
            content: `Mensagem tela ${i + 1}`,
            timestamp: '2026-08-20T10:00:00Z'
        }));

        const fullBackendMessages = Array.from({ length: 150 }, (_, i) => ({
            id: i + 1,
            sender_type: i % 2 === 0 ? 'contact' : 'user',
            content: `Mensagem completa ${i + 1}`,
            timestamp: '2026-08-20T10:00:00Z'
        }));

        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => fullBackendMessages
        });

        const createObjectURLMock = vi.fn().mockReturnValue('blob:http://localhost/fake-full-doc');
        global.URL.createObjectURL = createObjectURLMock;
        global.URL.revokeObjectURL = vi.fn();
        vi.spyOn(document.body, 'appendChild').mockImplementation(() => {});
        vi.spyOn(document.body, 'removeChild').mockImplementation(() => {});

        const result = await exportConversationToDoc(convo, initialScreenMessages, '1');

        expect(result.success).toBe(true);
        expect(result.totalMessages).toBe(150);
        expect(result.fileName).toContain('yasmin_vieira_#777.html');
    });
});


