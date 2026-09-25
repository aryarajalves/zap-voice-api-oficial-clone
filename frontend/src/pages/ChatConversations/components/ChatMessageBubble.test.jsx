import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ChatMessageBubble from './ChatMessageBubble';

describe('ChatMessageBubble Unit Tests', () => {
    it('renderiza links clicáveis no texto da mensagem', () => {
        const msg = {
            id: 1,
            sender_type: 'user',
            message_type: 'text',
            content: 'Olá! Acesse www.google.com.br para consultar.',
            timestamp: new Date().toISOString()
        };

        render(
            <ChatMessageBubble
                msg={msg}
                selectedConvo={{ id: 10, contact_name: 'Aryaraj', phone: '5585996123586' }}
                allMessages={[msg]}
                getMediaSrc={() => ''}
                formatMessageTimestamp={() => '10:00'}
            />
        );

        const link = screen.getByRole('link', { name: 'www.google.com.br' });
        expect(link).toBeDefined();
        expect(link.getAttribute('href')).toBe('https://www.google.com.br');
        expect(link.getAttribute('target')).toBe('_blank');
    });

    it('renderiza links https no texto de mensagens recebidas do contato', () => {
        const msg = {
            id: 2,
            sender_type: 'contact',
            message_type: 'text',
            content: 'Segue o link oficial: https://zapvoice.com.br/planos',
            timestamp: new Date().toISOString()
        };

        render(
            <ChatMessageBubble
                msg={msg}
                selectedConvo={{ id: 10, contact_name: 'Aryaraj', phone: '5585996123586' }}
                allMessages={[msg]}
                getMediaSrc={() => ''}
                formatMessageTimestamp={() => '10:05'}
            />
        );

        const link = screen.getByRole('link', { name: 'https://zapvoice.com.br/planos' });
        expect(link).toBeDefined();
        expect(link.getAttribute('href')).toBe('https://zapvoice.com.br/planos');
    });

    it('não exibe badge de custos da IA (Router, Agente, IA) nas mensagens do chat', () => {
        const msgWithAiCost = {
            id: 3,
            sender_type: 'user',
            message_type: 'text',
            content: 'O Método Laser Day é 100% online.',
            timestamp: new Date().toISOString(),
            meta_data: {
                total_cost: 0.0025,
                router_cost: 0.0004,
                agent_cost: 0.0021
            }
        };

        render(
            <ChatMessageBubble
                msg={msgWithAiCost}
                selectedConvo={{ id: 10, contact_name: 'Aryaraj', phone: '5585996123586' }}
                allMessages={[msgWithAiCost]}
                getMediaSrc={() => ''}
                formatMessageTimestamp={() => '19:05'}
            />
        );

        expect(screen.queryByText('⚡ IA:')).not.toBeInTheDocument();
        expect(screen.queryByText(/Router:/)).not.toBeInTheDocument();
        expect(screen.queryByText(/Agente:/)).not.toBeInTheDocument();
    });

    it('renderiza ícones de fixada e favoritada quando a mensagem possui esses atributos', () => {
        const msgPinnedAndStarred = {
            id: 4,
            sender_type: 'contact',
            message_type: 'text',
            content: 'Mensagem com estrela e alfinete',
            timestamp: new Date().toISOString(),
            is_starred: true
        };

        render(
            <ChatMessageBubble
                msg={msgPinnedAndStarred}
                selectedConvo={{ id: 10, contact_name: 'Aryaraj', phone: '5585996123586', pinned_message_id: 4 }}
                allMessages={[msgPinnedAndStarred]}
                getMediaSrc={() => ''}
                formatMessageTimestamp={() => '11:20'}
            />
        );

        expect(screen.getByTitle('Mensagem fixada nesta conversa')).toBeInTheDocument();
        expect(screen.getByTitle('Mensagem favoritada')).toBeInTheDocument();
    });

    it('não exibe badge de IA nem texto Gratuito mesmo quando total_cost for 0', () => {
        const msgFreeAi = {
            id: 5,
            sender_type: 'user',
            message_type: 'text',
            content: 'Por nada! Se precisar de mais alguma coisa, é só chamar.',
            timestamp: new Date().toISOString(),
            meta_data: {
                total_cost: 0,
                router_cost: 0,
                agent_cost: 0
            }
        };

        render(
            <ChatMessageBubble
                msg={msgFreeAi}
                selectedConvo={{ id: 10, contact_name: 'Aryaraj', phone: '5585996123586' }}
                allMessages={[msgFreeAi]}
                getMediaSrc={() => ''}
                formatMessageTimestamp={() => '09:12'}
            />
        );

        expect(screen.queryByText('⚡ IA:')).not.toBeInTheDocument();
        expect(screen.queryByText('Gratuito')).not.toBeInTheDocument();
    });

    it('renderiza corretamente mensagens do tipo WhatsApp Template com botões e badge', () => {
        const templateMsg = {
            id: 6,
            sender_type: 'user',
            content: 'Boas-vindas ao nosso atendimento!',
            timestamp: new Date().toISOString(),
            meta_data: {
                is_template: true,
                template_name: 'boas_vindas_v1',
                buttons: ['Falar com Consultor', 'Ver Catálogo']
            }
        };

        render(
            <ChatMessageBubble
                msg={templateMsg}
                selectedConvo={{ id: 10, contact_name: 'Aryaraj', phone: '5585996123586' }}
                allMessages={[templateMsg]}
                getMediaSrc={() => ''}
                formatMessageTimestamp={() => '14:30'}
            />
        );

        expect(screen.getByText('WhatsApp Template: boas_vindas_v1')).toBeInTheDocument();
        expect(screen.getByText('Falar com Consultor')).toBeInTheDocument();
        expect(screen.getByText('Ver Catálogo')).toBeInTheDocument();
    });

    it('renderiza citação (quoted message) com autor e conteúdo original', () => {
        const originalMsg = {
            id: 100,
            wa_message_id: 'wamid.HBgLMTIzNDU2',
            sender_type: 'contact',
            content: 'Qual o valor da mensalidade?',
            timestamp: new Date().toISOString()
        };

        const replyMsg = {
            id: 101,
            sender_type: 'user',
            content: 'Custa R$ 97/mês no plano PRO.',
            quoted_message_id: 'wamid.HBgLMTIzNDU2',
            timestamp: new Date().toISOString()
        };

        render(
            <ChatMessageBubble
                msg={replyMsg}
                selectedConvo={{ id: 10, contact_name: 'Carlos Silva', phone: '5585996123586' }}
                allMessages={[originalMsg, replyMsg]}
                getMediaSrc={() => ''}
                formatMessageTimestamp={() => '15:00'}
            />
        );

        expect(screen.getByText('Carlos Silva')).toBeInTheDocument();
        expect(screen.getByText('Qual o valor da mensalidade?')).toBeInTheDocument();
        expect(screen.getByText('Custa R$ 97/mês no plano PRO.')).toBeInTheDocument();
    });

    it('renderiza cartão de contato com telefone e link do WhatsApp', () => {
        const contactMsg = {
            id: 7,
            sender_type: 'contact',
            message_type: 'contact',
            content: '👤 Maria Santos\n+55 11 98888-7777',
            timestamp: new Date().toISOString(),
            meta_data: {
                contact_name: 'Maria Santos',
                contact_phone: '+55 11 98888-7777'
            }
        };

        render(
            <ChatMessageBubble
                msg={contactMsg}
                selectedConvo={{ id: 10, contact_name: 'Aryaraj', phone: '5585996123586' }}
                allMessages={[contactMsg]}
                getMediaSrc={() => ''}
                formatMessageTimestamp={() => '16:10'}
            />
        );

        expect(screen.getByText('Maria Santos')).toBeInTheDocument();
        expect(screen.getByText('+55 11 98888-7777')).toBeInTheDocument();
        const talkBtn = screen.getByRole('link', { name: /Conversar/i });
        expect(talkBtn).toHaveAttribute('href', 'https://wa.me/5511988887777');
    });

    it('permite interagir com reações e invocar sendReaction no engine', () => {
        const sendReactionMock = vi.fn();
        const reactionMsg = {
            id: 8,
            wa_message_id: 'wamid.12345',
            sender_type: 'user',
            content: 'Mensagem com reação',
            timestamp: new Date().toISOString(),
            meta_data: {
                reactions: [{ sender: 'user', emoji: '❤️' }]
            }
        };

        render(
            <ChatMessageBubble
                msg={reactionMsg}
                selectedConvo={{ id: 10, contact_name: 'Aryaraj', phone: '5585996123586' }}
                allMessages={[reactionMsg]}
                getMediaSrc={() => ''}
                formatMessageTimestamp={() => '16:20'}
                engine={{ sendReaction: sendReactionMock }}
            />
        );

        const reactionBadge = screen.getByTitle('Clique para remover sua reação');
        expect(reactionBadge).toBeInTheDocument();
        fireEvent.click(reactionBadge);
        expect(sendReactionMock).toHaveBeenCalledWith('wamid.12345', '');
    });

    it('renderiza evento de funil iniciado com botão Ver Pipeline do Funil e dispara onOpenPipelineByTriggerId', () => {
        const onOpenPipelineMock = vi.fn();
        const funnelMsg = {
            id: 9,
            sender_type: 'system',
            message_type: 'funnel_event',
            content: '🚀 Funil "Funil Recuperação VIP" foi iniciado',
            timestamp: new Date().toISOString(),
            meta_data: {
                is_funnel_event: true,
                funnel_id: 55,
                funnel_name: 'Funil Recuperação VIP',
                trigger_id: 888
            }
        };

        render(
            <ChatMessageBubble
                msg={funnelMsg}
                selectedConvo={{ id: 10, contact_name: 'Aryaraj', phone: '5585996123586' }}
                allMessages={[funnelMsg]}
                getMediaSrc={() => ''}
                formatMessageTimestamp={() => '16:30'}
                onOpenPipelineByTriggerId={onOpenPipelineMock}
            />
        );

        expect(screen.getByText('Funil em Execução')).toBeInTheDocument();
        expect(screen.getByText('Funil Recuperação VIP')).toBeInTheDocument();
        const pipelineBtn = screen.getByRole('button', { name: /Ver Pipeline do Funil/i });
        expect(pipelineBtn).toBeInTheDocument();
        fireEvent.click(pipelineBtn);
        expect(onOpenPipelineMock).toHaveBeenCalledWith(888);
    });

    it('renderiza card de erro e botão Disparar Novamente quando template falha', () => {
        const onRetryMock = vi.fn();
        const failedTplMsg = {
            id: 10,
            sender_type: 'user',
            message_type: 'template',
            content: '[Template: compra_aprovada_bussula]',
            timestamp: new Date().toISOString(),
            meta_data: {
                is_template: true,
                template_name: 'compra_aprovada_bussula',
                status: 'failed',
                failure_reason: 'Erro Meta 2: Service temporarily unavailable'
            }
        };

        render(
            <ChatMessageBubble
                msg={failedTplMsg}
                selectedConvo={{ id: 10, contact_name: 'Aryaraj', phone: '5585996123586' }}
                allMessages={[failedTplMsg]}
                getMediaSrc={() => ''}
                formatMessageTimestamp={() => '16:40'}
                onRetryTemplateMessage={onRetryMock}
            />
        );

        expect(screen.getByText(/Service temporarily unavailable/i)).toBeInTheDocument();
        const retryBtn = screen.getByRole('button', { name: /Disparar Novamente/i });
        expect(retryBtn).toBeInTheDocument();
        fireEvent.click(retryBtn);
        expect(onRetryMock).toHaveBeenCalledWith(failedTplMsg);
    });

    it('renderiza indicador de leitura (dois tiques azuis) com status "read"', () => {
        const readMsg = {
            id: 20,
            sender_type: 'user',
            message_type: 'text',
            content: 'Olá! Sua fatura está disponível.',
            timestamp: new Date().toISOString(),
            status: 'read'
        };

        render(
            <ChatMessageBubble
                msg={readMsg}
                selectedConvo={{ id: 10, contact_name: 'Aryaraj', phone: '5585996123586' }}
                allMessages={[readMsg]}
                getMediaSrc={() => ''}
                formatMessageTimestamp={() => '17:00'}
            />
        );

        const readIndicator = screen.getByTestId('message-read-status');
        expect(readIndicator).toBeInTheDocument();
        expect(readIndicator.getAttribute('title')).toBe('Lida pelo contato');
    });

    it('renderiza indicador de leitura quando status "read" está em meta_data', () => {
        const readMsgMeta = {
            id: 21,
            sender_type: 'user',
            message_type: 'text',
            content: 'Sua solicitação foi confirmada.',
            timestamp: new Date().toISOString(),
            meta_data: { status: 'read' }
        };

        render(
            <ChatMessageBubble
                msg={readMsgMeta}
                selectedConvo={{ id: 10, contact_name: 'Aryaraj', phone: '5585996123586' }}
                allMessages={[readMsgMeta]}
                getMediaSrc={() => ''}
                formatMessageTimestamp={() => '17:05'}
            />
        );

        const readIndicator = screen.getByTestId('message-read-status');
        expect(readIndicator).toBeInTheDocument();
        expect(readIndicator.getAttribute('title')).toBe('Lida pelo contato');
    });

    it('não renderiza nenhum vezinho quando mensagem do atendente ainda não foi lida', () => {
        const sentMsg = {
            id: 22,
            sender_type: 'user',
            message_type: 'text',
            content: 'Mensagem recém-enviada.',
            timestamp: new Date().toISOString(),
            status: 'sent'
        };

        render(
            <ChatMessageBubble
                msg={sentMsg}
                selectedConvo={{ id: 10, contact_name: 'Aryaraj', phone: '5585996123586' }}
                allMessages={[sentMsg]}
                getMediaSrc={() => ''}
                formatMessageTimestamp={() => '17:10'}
            />
        );

        expect(screen.queryByTestId('message-read-status')).toBeNull();
        expect(screen.queryByTestId('message-sent-status')).toBeNull();
    });

    it('não exibe indicador de leitura/envio do atendente em mensagens recebidas do contato', () => {
        const contactMsg = {
            id: 23,
            sender_type: 'contact',
            message_type: 'text',
            content: 'Obrigado pelo retorno!',
            timestamp: new Date().toISOString()
        };

        render(
            <ChatMessageBubble
                msg={contactMsg}
                selectedConvo={{ id: 10, contact_name: 'Aryaraj', phone: '5585996123586' }}
                allMessages={[contactMsg]}
                getMediaSrc={() => ''}
                formatMessageTimestamp={() => '17:15'}
            />
        );

        expect(screen.queryByTestId('message-read-status')).toBeNull();
        expect(screen.queryByTestId('message-sent-status')).toBeNull();
    });

    it('aciona resposta ao clicar no botão de responder sem desbalancear scroll', () => {
        const replyMsg = {
            id: 24,
            sender_type: 'user',
            message_type: 'template',
            content: '[Template: COMBO_PRODUTO_OFICIAL]',
            meta_data: { template_name: 'COMBO_PRODUTO_OFICIAL' },
            timestamp: new Date().toISOString()
        };

        const setReplyingToMock = vi.fn();
        const setShouldScrollToBottomMock = vi.fn();
        const focusMock = vi.fn();
        const fakeInputRef = { current: { focus: focusMock } };

        render(
            <ChatMessageBubble
                msg={replyMsg}
                selectedConvo={{ id: 10, contact_name: 'Aryaraj', phone: '5585996123586' }}
                allMessages={[replyMsg]}
                getMediaSrc={() => ''}
                formatMessageTimestamp={() => '18:00'}
                setReplyingTo={setReplyingToMock}
                chatInputRef={fakeInputRef}
                engine={{ setShouldScrollToBottom: setShouldScrollToBottomMock, messagesContainerRef: { current: { scrollHeight: 2000, scrollTop: 1500, clientHeight: 400 } } }}
            />
        );

        const replyButton = screen.getByTitle('Responder a esta mensagem');
        expect(replyButton).toBeDefined();

        fireEvent.click(replyButton);

        expect(setReplyingToMock).toHaveBeenCalledWith(expect.objectContaining({
            id: 24,
            content: '[Template: COMBO_PRODUTO_OFICIAL]'
        }));
        expect(focusMock).toHaveBeenCalledWith({ preventScroll: true });
    });
});

