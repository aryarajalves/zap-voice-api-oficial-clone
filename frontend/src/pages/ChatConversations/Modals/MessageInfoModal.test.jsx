import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import MessageInfoModal, { formatDetailedDateTime } from './MessageInfoModal';
import toast from 'react-hot-toast';

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn()
  }
}));

describe('MessageInfoModal Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('formatDetailedDateTime', () => {
    it('retorna null se timestamp for nulo ou inválido', () => {
      expect(formatDetailedDateTime(null)).toBeNull();
      expect(formatDetailedDateTime('')).toBeNull();
      expect(formatDetailedDateTime('invalid-date')).toBeNull();
    });

    it('formata data e hora no padrão dd/mm/aaaa às hh:mm:ss', () => {
      const date = new Date(2026, 8, 28, 14, 30, 45); // 28 de Setembro de 2026 14:30:45
      const formatted = formatDetailedDateTime(date.toISOString());
      expect(formatted).toContain('28/09/2026');
      expect(formatted).toContain('14:30:45');
      expect(formatted).toContain('às');
    });
  });

  describe('MessageInfoModal Component', () => {
    it('não renderiza quando isOpen é falso', () => {
      const { container } = render(
        <MessageInfoModal
          isOpen={false}
          onClose={vi.fn()}
          msg={{ id: 1, content: 'Olá' }}
          selectedConvo={{ contact_name: 'Cliente Teste' }}
        />
      );
      expect(container.firstChild).toBeNull();
    });

    it('não renderiza quando msg é nulo', () => {
      const { container } = render(
        <MessageInfoModal
          isOpen={true}
          onClose={vi.fn()}
          msg={null}
          selectedConvo={{ contact_name: 'Cliente Teste' }}
        />
      );
      expect(container.firstChild).toBeNull();
    });

    it('renderiza dados da mensagem, horário de leitura e dispara onClose ao clicar em Fechar', () => {
      const onCloseMock = vi.fn();
      const readDate = new Date(2026, 8, 28, 16, 45, 10).toISOString();
      const deliveredDate = new Date(2026, 8, 28, 16, 44, 50).toISOString();
      const sentDate = new Date(2026, 8, 28, 16, 44, 30).toISOString();

      const msg = {
        id: 101,
        content: 'Olá! Seu pedido foi confirmado.',
        status: 'read',
        sender_type: 'user',
        wa_message_id: 'wamid.HBgLNTU4NTk5NjEyMzU4NhUCMRIA',
        timestamp: sentDate,
        meta_data: {
          status: 'read',
          read_at: readDate,
          delivered_at: deliveredDate,
          sent_at: sentDate
        }
      };

      render(
        <MessageInfoModal
          isOpen={true}
          onClose={onCloseMock}
          msg={msg}
          selectedConvo={{ contact_name: 'Maria Silva', phone: '5511999999999' }}
        />
      );

      // Título e contato
      expect(screen.getByText('Dados da Mensagem')).toBeInTheDocument();
      expect(screen.getByText(/Enviada para Maria Silva/)).toBeInTheDocument();

      // Conteúdo da mensagem
      expect(screen.getByText('Olá! Seu pedido foi confirmado.')).toBeInTheDocument();

      // Linhas da linha do tempo
      expect(screen.getByText('Lida')).toBeInTheDocument();
      expect(screen.getByText('Entregue')).toBeInTheDocument();
      expect(screen.getByText('Enviada')).toBeInTheDocument();

      // Horários exibidos
      const formattedRead = formatDetailedDateTime(readDate);
      expect(screen.getByText(formattedRead)).toBeInTheDocument();

      // ID da mensagem
      expect(screen.getByText(/wamid\.HBgLNTU4NTk5NjEyMzU4NhUCMRIA/)).toBeInTheDocument();

      // Botão fechar
      const closeBtn = screen.getByRole('button', { name: 'Fechar' });
      expect(closeBtn).toBeInTheDocument();
      fireEvent.click(closeBtn);
      expect(onCloseMock).toHaveBeenCalledTimes(1);
    });

    it('permite copiar o wamid ao clicar em Copiar', () => {
      const writeTextMock = vi.fn();
      Object.assign(navigator, {
        clipboard: {
          writeText: writeTextMock
        }
      });

      const msg = {
        id: 102,
        content: 'Teste copiar ID',
        status: 'sent',
        wa_message_id: 'wamid.HBgLTEST123',
        timestamp: new Date().toISOString()
      };

      render(
        <MessageInfoModal
          isOpen={true}
          onClose={vi.fn()}
          msg={msg}
          selectedConvo={{ contact_name: 'João' }}
        />
      );

      const copyBtn = screen.getByRole('button', { name: /copiar/i });
      fireEvent.click(copyBtn);

      expect(writeTextMock).toHaveBeenCalledWith('wamid.HBgLTEST123');
      expect(toast.success).toHaveBeenCalledWith('ID da mensagem copiado!');
    });

    it('suporta timestamps UNIX em segundos numéricos e em string', () => {
      // 1727546400 = 28/09/2026 em algum fuso horário
      const formattedNum = formatDetailedDateTime(1727546400);
      const formattedStr = formatDetailedDateTime("1727546400");
      expect(formattedNum).not.toBeNull();
      expect(formattedStr).not.toBeNull();
      expect(formattedNum).toEqual(formattedStr);
      expect(formattedNum).toContain('/');
      expect(formattedNum).toContain('às');
    });

    it('exibe horário de leitura vindo do nível superior da mensagem (msg.read_at) e fallback de entrega', () => {
      const readDate = new Date(2026, 8, 28, 10, 45, 12).toISOString();
      const sentDate = new Date(2026, 8, 28, 10, 40, 30).toISOString();

      const msg = {
        id: 103,
        content: 'Template promocional entregue e lido',
        status: 'read',
        sender_type: 'user',
        wa_message_id: 'wamid.HBgLTEST789',
        read_at: readDate,
        sent_at: sentDate,
        timestamp: sentDate
      };

      render(
        <MessageInfoModal
          isOpen={true}
          onClose={vi.fn()}
          msg={msg}
          selectedConvo={{ contact_name: 'Diego Anderle' }}
        />
      );

      const formattedRead = formatDetailedDateTime(readDate);
      expect(screen.getAllByText(formattedRead).length).toBeGreaterThanOrEqual(1);
      // O horário de entrega herdado de leitura/envio não deve ser texto genérico sem data
      expect(screen.queryByText('Entregue no aparelho do contato')).toBeNull();
    });
  });
});
