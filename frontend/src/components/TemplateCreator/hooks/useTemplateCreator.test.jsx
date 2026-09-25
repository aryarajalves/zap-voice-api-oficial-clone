import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useTemplateCreator } from './useTemplateCreator';
import {
  useTemplateUIState,
  useTemplateFormData,
  useTemplateListState
} from './templateCreator';
import { toast } from 'react-hot-toast';
import { fetchWithAuth } from '../../../AuthContext';

vi.mock('react-hot-toast', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(() => 'toast-loading-id'),
    dismiss: vi.fn()
  }
}));

vi.mock('../../../AuthContext', () => ({
  fetchWithAuth: vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve([]) })),
  AuthProvider: ({ children }) => <div>{children}</div>
}));

vi.mock('../../../contexts/ClientContext', () => ({
  useClient: () => ({ activeClient: { id: 1, name: 'Test Client' } }),
  ClientProvider: ({ children }) => <div>{children}</div>
}));

describe('TemplateCreator Hooks Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchWithAuth.mockReset();
    fetchWithAuth.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => []
    });
  });

  describe('useTemplateUIState', () => {
    it('controla expansão de corpo e abertura do modal de guia', () => {
      const { result } = renderHook(() => useTemplateUIState());

      expect(result.current.isBodyExpanded).toBe(false);
      expect(result.current.isGuideOpen).toBe(false);

      act(() => {
        result.current.setIsBodyExpanded(true);
        result.current.setIsGuideOpen(true);
      });

      expect(result.current.isBodyExpanded).toBe(true);
      expect(result.current.isGuideOpen).toBe(true);
    });
  });

  describe('useTemplateFormData', () => {
    const mockActiveClient = { id: 1, name: 'Cliente Teste' };

    it('inicializa o formulário com valores padrão', () => {
      const { result } = renderHook(() =>
        useTemplateFormData({ activeClient: mockActiveClient, fetchTemplates: vi.fn() })
      );

      expect(result.current.formData.name).toBe('');
      expect(result.current.formData.category).toBe('MARKETING');
      expect(result.current.formData.language).toBe('pt_BR');
      expect(result.current.formData.header_type).toBe('NONE');
      expect(result.current.formData.buttons).toHaveLength(0);
      expect(result.current.loading).toBe(false);
    });

    it('adiciona, atualiza e remove botões corretamente', () => {
      const { result } = renderHook(() =>
        useTemplateFormData({ activeClient: mockActiveClient, fetchTemplates: vi.fn() })
      );

      act(() => {
        result.current.handleAddButton();
      });
      expect(result.current.formData.buttons).toHaveLength(1);

      act(() => {
        result.current.updateButton(0, 'text', 'Acessar Site');
      });
      expect(result.current.formData.buttons[0].text).toBe('Acessar Site');

      act(() => {
        result.current.removeButton(0);
      });
      expect(result.current.isRemoveButtonModalOpen).toBe(true);
      expect(result.current.buttonIndexToRemove).toBe(0);

      act(() => {
        result.current.confirmRemoveButton();
      });
      expect(result.current.formData.buttons).toHaveLength(0);
      expect(result.current.isRemoveButtonModalOpen).toBe(false);
    });

    it('corrige texto para padrão da Meta via fixBodyTextForMeta', () => {
      const { result } = renderHook(() =>
        useTemplateFormData({ activeClient: mockActiveClient, fetchTemplates: vi.fn() })
      );

      act(() => {
        result.current.setFormData({ ...result.current.formData, body_text: '{{1}}' });
      });

      act(() => {
        result.current.fixBodyTextForMeta();
      });

      expect(result.current.formData.body_text).toBe('Olá {{1}}, tudo bem?');
      expect(toast.success).toHaveBeenCalledWith('Texto corrigido para o formato da Meta!');
    });

    it('carrega dados para edição via handleEdit', () => {
      const { result } = renderHook(() =>
        useTemplateFormData({ activeClient: mockActiveClient, fetchTemplates: vi.fn() })
      );

      const templateMock = {
        id: 42,
        name: 'template_existente',
        category: 'UTILITY',
        language: 'pt_BR',
        components: [
          { type: 'HEADER', format: 'TEXT', text: 'Cabeçalho Teste' },
          { type: 'BODY', text: 'Corpo do template' },
          { type: 'FOOTER', text: 'Rodapé' },
          { type: 'BUTTONS', buttons: [{ type: 'QUICK_REPLY', text: 'Opção 1' }] }
        ]
      };

      act(() => {
        result.current.handleEdit(templateMock);
      });

      expect(result.current.editingId).toBe(42);
      expect(result.current.formData.name).toBe('template_existente');
      expect(result.current.formData.category).toBe('UTILITY');
      expect(result.current.formData.header_text).toBe('Cabeçalho Teste');
      expect(result.current.formData.body_text).toBe('Corpo do template');
      expect(result.current.formData.buttons).toHaveLength(1);
    });

    it('cancela a edição e limpa todos os campos do formulário quando o cliente ativo muda', () => {
      const { result, rerender } = renderHook(
        ({ client }) =>
          useTemplateFormData({ activeClient: client, fetchTemplates: vi.fn() }),
        { initialProps: { client: { id: 11, name: 'Escola Sexologia' } } }
      );

      const templateMock = {
        id: 99,
        name: 'carrinho_abandonado_cama',
        category: 'MARKETING',
        language: 'pt_BR',
        components: [
          { type: 'HEADER', format: 'TEXT', text: 'Cabeçalho Antigo' },
          { type: 'BODY', text: 'Você estava a um passo de dominar...' },
          { type: 'FOOTER', text: 'Rodapé Antigo' },
          { type: 'BUTTONS', buttons: [{ type: 'QUICK_REPLY', text: 'Quero continuar' }] }
        ]
      };

      act(() => {
        result.current.handleEdit(templateMock);
      });

      expect(result.current.editingId).toBe(99);
      expect(result.current.formData.name).toBe('carrinho_abandonado_cama');
      expect(result.current.formData.body_text).toBe('Você estava a um passo de dominar...');
      expect(result.current.formData.buttons).toHaveLength(1);

      // Troca de cliente para ID 14 (Cliente - Crassus)
      rerender({ client: { id: 14, name: 'Cliente - Crassus' } });

      expect(result.current.editingId).toBeNull();
      expect(result.current.formData).toEqual({
        name: '',
        category: 'MARKETING',
        language: 'pt_BR',
        header_type: 'NONE',
        header_text: '',
        header_media_url: '',
        body_text: '',
        footer_text: '',
        buttons: []
      });
    });
  });

  describe('useTemplateListState', () => {
    const mockActiveClient = { id: 1, name: 'Cliente Teste' };

    it('busca e lista templates com sucesso', async () => {
      const mockTemplates = [
        { id: 1, name: 'template_1', is_pinned: false },
        { id: 2, name: 'template_2', is_pinned: true }
      ];

      fetchWithAuth.mockResolvedValue({
        ok: true,
        json: async () => mockTemplates
      });

      let result;
      await act(async () => {
        const rendered = renderHook(() =>
          useTemplateListState({ activeClient: mockActiveClient })
        );
        result = rendered.result;
      });

      expect(result.current.templates).toEqual(mockTemplates);
      expect(result.current.fetchingTemplates).toBe(false);
    });

    it('fixa e desafixa template no topo com sucesso', async () => {
      fetchWithAuth.mockResolvedValue({ ok: true, json: async () => [] });

      let result;
      await act(async () => {
        const rendered = renderHook(() =>
          useTemplateListState({ activeClient: mockActiveClient })
        );
        result = rendered.result;
      });

      let pinResult;
      await act(async () => {
        pinResult = await result.current.handlePinTemplate(10, true);
      });

      expect(pinResult).toBe(true);
      expect(toast.success).toHaveBeenCalledWith('Template fixado no topo!');
    });
  });

  describe('useTemplateCreator (Orquestrador)', () => {
    it('agrega e expõe todos os estados e manipuladores', () => {
      const { result } = renderHook(() => useTemplateCreator());

      expect(result.current).toHaveProperty('formData');
      expect(result.current).toHaveProperty('setFormData');
      expect(result.current).toHaveProperty('templates');
      expect(result.current).toHaveProperty('fetchTemplates');
      expect(result.current).toHaveProperty('handleAddButton');
      expect(result.current).toHaveProperty('removeButton');
      expect(result.current).toHaveProperty('handleSubmit');
      expect(result.current).toHaveProperty('isBodyExpanded');
      expect(result.current).toHaveProperty('isGuideOpen');
      expect(result.current).toHaveProperty('handlePinTemplate');
    });
  });
});
