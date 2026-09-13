import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act, renderHook } from '@testing-library/react';
import TemplateAssistant from './index';
import { useTemplateAssistant, extractJSON } from './hooks/useTemplateAssistant';
import { toast } from 'react-hot-toast';

vi.mock('react-hot-toast', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(() => 'toast-id')
  }
}));

const mockLogic = {
  activeClient: { id: 10, name: 'Cliente Teste' },
  formData: {
    name: 'meu_template',
    category: 'MARKETING',
    header_type: 'NONE',
    header_text: '',
    header_media_url: '',
    body_text: 'Texto inicial',
    footer_text: '',
    buttons: []
  },
  setFormData: vi.fn()
};

describe('TemplateAssistant Module & Components', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({})
    });
    // Mock scrollIntoView
    Element.prototype.scrollIntoView = vi.fn();
  });

  describe('extractJSON utility', () => {
    it('extrai objeto JSON válido de bloco markdown com body_text', () => {
      const markdown = 'Aqui está uma sugestão:\n```json\n{"name": "promo_natal", "body_text": "Feliz Natal!"}\n```\nEspero que goste!';
      const result = extractJSON(markdown);
      expect(result).toEqual({
        name: 'promo_natal',
        body_text: 'Feliz Natal!'
      });
    });

    it('retorna null se o markdown não contiver json válido', () => {
      const text = 'Apenas um texto normal sem JSON';
      expect(extractJSON(text)).toBeNull();
    });

    it('retorna null se o JSON for inválido', () => {
      const text = '```json\n{name: "invalido",\n```';
      expect(extractJSON(text)).toBeNull();
    });
  });

  describe('useTemplateAssistant Hook', () => {
    it('inicializa com mensagem padrão e campos selecionados', () => {
      const { result } = renderHook(() => useTemplateAssistant(mockLogic));

      expect(result.current.isOpen).toBe(false);
      expect(result.current.isMaximized).toBe(false);
      expect(result.current.messages).toHaveLength(1);
      expect(result.current.messages[0].role).toBe('assistant');
      expect(result.current.fieldsToApply).toEqual({
        name: true,
        category: true,
        header: true,
        body: true,
        footer: true,
        buttons: true
      });
    });

    it('alterna seleção de campos via toggleField', () => {
      const { result } = renderHook(() => useTemplateAssistant(mockLogic));

      act(() => {
        result.current.toggleField('footer');
      });
      expect(result.current.fieldsToApply.footer).toBe(false);

      act(() => {
        result.current.toggleField('footer');
      });
      expect(result.current.fieldsToApply.footer).toBe(true);
    });

    it('envia mensagem do usuário e recebe resposta do assistente', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          content: 'Sugestão: ```json\n{"name":"recup_carrinho","body_text":"Finalize seu pedido"}\n```'
        })
      });

      const { result } = renderHook(() => useTemplateAssistant(mockLogic));

      act(() => {
        result.current.setInput('Quero um template de recuperação de carrinho');
      });

      await act(async () => {
        await result.current.handleSend({ preventDefault: vi.fn() });
      });

      expect(result.current.messages).toHaveLength(3); // inicial + user + assistant
      expect(result.current.messages[1].content).toBe('Quero um template de recuperação de carrinho');
      expect(result.current.messages[2].content).toContain('recup_carrinho');
      expect(result.current.input).toBe('');
      expect(result.current.loading).toBe(false);
    });

    it('aplica campos do template sugerido no formulário via handleApplyTemplate', () => {
      const { result } = renderHook(() => useTemplateAssistant(mockLogic));

      const suggestedTemplate = {
        name: 'novo_template_ia',
        category: 'UTILITY',
        header_type: 'TEXT',
        header_text: 'Aviso Importante',
        body_text: 'Seu código é 1234',
        footer_text: 'ZapVoice',
        buttons: [{ type: 'QUICK_REPLY', text: 'Confirmar' }]
      };

      act(() => {
        result.current.handleApplyTemplate(suggestedTemplate);
      });

      expect(mockLogic.setFormData).toHaveBeenCalledWith({
        name: 'novo_template_ia',
        category: 'UTILITY',
        header_type: 'TEXT',
        header_text: 'Aviso Importante',
        header_media_url: '',
        body_text: 'Seu código é 1234',
        footer_text: 'ZapVoice',
        buttons: [{ type: 'QUICK_REPLY', text: 'Confirmar', phone_number: '', url: '' }]
      });
      expect(toast.success).toHaveBeenCalledWith(
        'Campos selecionados aplicados ao formulário com sucesso!'
      );
    });
  });

  describe('TemplateAssistant Component UI', () => {
    it('renderiza o botão flutuante e abre o painel ao clicar', () => {
      render(<TemplateAssistant logic={mockLogic} />);

      const launcherButton = screen.getByTitle('Assistente de Criação com IA');
      expect(launcherButton).toBeInTheDocument();

      fireEvent.click(launcherButton);

      expect(screen.getByText('ZapVoice IA')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Escreva sua mensagem aqui...')).toBeInTheDocument();
    });

    it('permite maximizar, minimizar e fechar o painel', () => {
      render(<TemplateAssistant logic={mockLogic} />);

      fireEvent.click(screen.getByTitle('Assistente de Criação com IA'));

      const maxButton = screen.getByTitle('Maximizar');
      fireEvent.click(maxButton);
      expect(screen.getByTitle('Minimizar')).toBeInTheDocument();

      fireEvent.click(screen.getByTitle('Minimizar'));
      expect(screen.getByTitle('Maximizar')).toBeInTheDocument();

      const closeButton = screen.getByTitle('Fechar');
      fireEvent.click(closeButton);
      expect(screen.queryByText('ZapVoice IA')).not.toBeInTheDocument();
    });

    it('digita mensagem e dispara o envio pelo formulário', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ content: 'Resposta mockada' })
      });

      render(<TemplateAssistant logic={mockLogic} />);

      fireEvent.click(screen.getByTitle('Assistente de Criação com IA'));

      const textarea = screen.getByPlaceholderText('Escreva sua mensagem aqui...');
      fireEvent.change(textarea, { target: { value: 'Olá assistente' } });

      await act(async () => {
        fireEvent.submit(textarea.closest('form'));
      });

      expect(screen.getByText('Olá assistente')).toBeInTheDocument();
    });
  });
});
