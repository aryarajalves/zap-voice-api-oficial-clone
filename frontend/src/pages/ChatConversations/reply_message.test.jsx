import { describe, it, expect } from 'vitest';

/**
 * Testes unitários para Quote Reply (Responder a mensagem específica)
 */

describe('Quote Reply Frontend Logic', () => {

    it('deve formatar corretamente o payload de envio com quoted_wa_message_id', () => {
        const textToSend = "Resposta ao cliente";
        const replyingTo = {
            id: 10,
            content: "Dúvida do cliente",
            sender_type: "contact",
            wa_message_id: "wamid.HBgMMTIzNDU2"
        };

        const opts = replyingTo?.wa_message_id ? { quotedWaMessageId: replyingTo.wa_message_id } : {};
        const bodyPayload = { content: textToSend };
        if (opts?.quotedWaMessageId) {
            bodyPayload.quoted_wa_message_id = opts.quotedWaMessageId;
        }

        expect(bodyPayload).toEqual({
            content: "Resposta ao cliente",
            quoted_wa_message_id: "wamid.HBgMMTIzNDU2"
        });
    });

    it('deve localizar a mensagem citada na lista de mensagens', () => {
        const messages = [
            { id: 1, content: "Mensagem 1", wa_message_id: "wamid.1" },
            { id: 2, content: "Mensagem 2", wa_message_id: "wamid.2" }
        ];

        const quotedId = "wamid.1";
        const quotedMsg = messages.find(m => String(m.wa_message_id) === String(quotedId) || String(m.id) === String(quotedId));

        expect(quotedMsg).toBeDefined();
        expect(quotedMsg.content).toBe("Mensagem 1");
    });
});
