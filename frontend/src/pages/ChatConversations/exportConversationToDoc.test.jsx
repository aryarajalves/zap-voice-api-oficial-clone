import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateConversationDocHtml, exportConversationToDoc } from './exportConversationToDoc';

describe('exportConversationToDoc', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('gera HTML formatado identificando mensagens do Usuário e do Agente com suporte a datas ISO e números', () => {
        const convo = { id: 1083, contact_name: 'Aryaraj', phone: '5585996123586' };
        const messages = [
            { id: 1, sender_type: 'contact', content: 'Olá, gostaria de informações sobre o curso', timestamp: '2026-08-01T13:03:00Z' },
            { id: 2, sender_type: 'user', content: 'Olá Aryaraj! O curso contém 3 módulos exclusivos.', timestamp: 1722517440 },
            { id: 3, sender_type: 'system', content: '🔒 Anotação Privada: Lead interessado em fechar hoje', timestamp: '2026-08-01 13:05:00' }
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

    it('executa a função exportConversationToDoc criando link de download', () => {
        const convo = { id: 337, contact_name: 'Dra', phone: '5521996268632' };
        const messages = [
            { id: 10, sender_type: 'contact', content: 'Estou tentando comprar o seu curso', timestamp: 1722517380 },
            { id: 11, sender_type: 'user', content: 'Segue o link de compra do Método Laser Day', timestamp: 1722517440 }
        ];

        const createObjectURLMock = vi.fn().mockReturnValue('blob:http://localhost/fake-doc');
        const revokeObjectURLMock = vi.fn();
        global.URL.createObjectURL = createObjectURLMock;
        global.URL.revokeObjectURL = revokeObjectURLMock;

        const appendChildSpy = vi.spyOn(document.body, 'appendChild');
        const removeChildSpy = vi.spyOn(document.body, 'removeChild');

        exportConversationToDoc(convo, messages, '11');

        expect(createObjectURLMock).toHaveBeenCalledTimes(1);
        expect(appendChildSpy).toHaveBeenCalled();
        expect(removeChildSpy).toHaveBeenCalled();
    });
});
