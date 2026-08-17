import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import MaximizedInputModal from './MaximizedInputModal';

vi.mock('react-icons/fi', () => ({
  FiX: () => <span data-testid="icon-x" />,
  FiSend: () => <span data-testid="icon-send" />,
  FiMaximize2: () => <span data-testid="icon-maximize" />,
  FiRefreshCw: () => <span data-testid="icon-refresh" />,
  FiSmile: () => <span data-testid="icon-smile" />,
  FiSearch: () => <span data-testid="icon-search" />,
  FiZap: () => <span data-testid="icon-zap" />,
  FiCommand: () => <span data-testid="icon-command" />,
  FiCornerDownLeft: () => <span data-testid="icon-enter" />,
}));

const mockQuickMessages = [
  {
    id: 1,
    shortcut: 'pix',
    title: 'Chave PIX e Instruções',
    content: 'Olá {{nome}}, segue a chave pix: contato@zapvoice.com'
  },
  {
    id: 2,
    shortcut: 'ola',
    title: 'Boas-vindas Padrão',
    content: 'Olá {{primeiro_nome}}, como posso te ajudar hoje?'
  }
];

const defaultProps = {
  isOpen: true,
  onClose: vi.fn(),
  value: 'Olá\nTudo bem?',
  onChange: vi.fn(),
  onSend: vi.fn(),
  isSending: false,
  contactName: 'Neidivaldo Cabral',
  selectedConvo: { id: 10, contact_name: 'Neidivaldo Cabral', phone: '5511999999999', client_id: 1 },
  activeClientId: 1,
};

describe('MaximizedInputModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockQuickMessages,
    });
  });

  it('não renderiza quando isOpen=false', () => {
    render(<MaximizedInputModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByText(/Responder para Neidivaldo Cabral/i)).not.toBeInTheDocument();
  });

  it('renderiza quando isOpen=true', () => {
    render(<MaximizedInputModal {...defaultProps} />);
    expect(screen.getByText(/Responder para Neidivaldo Cabral/i)).toBeInTheDocument();
    expect(screen.getByText('Enviar quebrando linhas (mensagens separadas)')).toBeInTheDocument();
  });

  it('chama onChange quando o texto é alterado', () => {
    const onChange = vi.fn();
    render(<MaximizedInputModal {...defaultProps} onChange={onChange} />);
    const textarea = screen.getByPlaceholderText(/Digite ou cole sua resposta aqui.../i);
    fireEvent.change(textarea, { target: { value: 'Novo texto' } });
    expect(onChange).toHaveBeenCalledWith('Novo texto');
  });

  it('chama onSend com splitLines=false por padrão', () => {
    const onSend = vi.fn();
    render(<MaximizedInputModal {...defaultProps} onSend={onSend} />);
    fireEvent.click(screen.getByRole('button', { name: /Enviar Resposta/i }));
    expect(onSend).toHaveBeenCalledWith(expect.any(Object), { splitLines: false });
  });

  it('abre o seletor de emojis ao clicar no botão Emojis e insere emoji no texto', () => {
    const onChange = vi.fn();
    render(<MaximizedInputModal {...defaultProps} value="Olá" onChange={onChange} />);
    const emojiBtn = screen.getByRole('button', { name: /Emojis/i });
    expect(emojiBtn).toBeInTheDocument();
    
    // Abre o dropdown de emoji
    fireEvent.click(emojiBtn);
    expect(screen.getByPlaceholderText('Buscar emoji...')).toBeInTheDocument();

    // Clica no primeiro emoji disponível no grid
    const emojiItems = screen.getAllByTestId('emoji-item');
    fireEvent.click(emojiItems[0]);
    expect(onChange).toHaveBeenCalled();
  });

  it('abre o dropdown de respostas rápidas ao digitar / e permite selecionar uma mensagem', async () => {
    const onChange = vi.fn();
    const { rerender } = render(<MaximizedInputModal {...defaultProps} value="" onChange={onChange} />);

    // Aguarda carregar as mensagens rápidas
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });

    const textarea = screen.getByPlaceholderText(/Digite ou cole sua resposta aqui.../i);

    // Simula digitação da barra /
    fireEvent.change(textarea, { target: { value: '/', selectionStart: 1 } });
    expect(onChange).toHaveBeenCalledWith('/');

    // Re-renderiza com o valor atualizado
    rerender(<MaximizedInputModal {...defaultProps} value="/" onChange={onChange} />);

    // O dropdown de respostas rápidas deve aparecer
    expect(screen.getByText('Respostas Rápidas')).toBeInTheDocument();
    expect(screen.getByText('/pix')).toBeInTheDocument();
    expect(screen.getByText('/ola')).toBeInTheDocument();

    // Clica na opção /pix
    const pixOption = screen.getByText('/pix').closest('div[role="option"]');
    fireEvent.mouseDown(pixOption);

    // Verifica se onChange foi chamado com o conteúdo processado
    expect(onChange).toHaveBeenCalledWith('Olá Neidivaldo Cabral, segue a chave pix: contato@zapvoice.com ');
  });
});

