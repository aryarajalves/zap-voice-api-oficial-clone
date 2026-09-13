import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import TutorialPage from '../../TutorialPage';
import { useTutorialPage } from '../hooks/useTutorialPage';
import TutorialStepCard from '../components/TutorialStepCard';
import { renderHook } from '@testing-library/react';

vi.mock('react-hot-toast', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn()
  }
}));

import { toast } from 'react-hot-toast';

describe('TutorialPage Modular System', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined)
      }
    });
    vi.spyOn(window, 'open').mockImplementation(() => {});
  });

  describe('useTutorialPage hook', () => {
    it('deve inicializar com nenhum tutorial selecionado', () => {
      const { result } = renderHook(() => useTutorialPage());
      expect(result.current.selectedTutorial).toBeNull();
      expect(result.current.copiedId).toBeNull();
    });

    it('deve copiar o link e disparar o toast de sucesso', () => {
      const { result } = renderHook(() => useTutorialPage());

      act(() => {
        result.current.handleCopyLink({ stopPropagation: vi.fn() }, 'meta-bm-share');
      });

      expect(navigator.clipboard.writeText).toHaveBeenCalled();
      expect(result.current.copiedId).toBe('meta-bm-share');
      expect(toast.success).toHaveBeenCalledWith('Link público de compartilhamento copiado!');
    });

    it('deve abrir link em nova aba', () => {
      const { result } = renderHook(() => useTutorialPage());

      act(() => {
        result.current.handleOpenNewTab({ stopPropagation: vi.fn() }, 'meta-app-creation');
      });

      expect(window.open).toHaveBeenCalledWith(
        expect.stringContaining('/help/meta-app-creation'),
        '_blank'
      );
    });
  });

  describe('TutorialStepCard component', () => {
    it('deve renderizar dados do passo e link oficial quando fornecido', () => {
      const step = {
        num: '01',
        title: 'Criar Conta',
        text: 'Acesse o site oficial da Meta para criar a conta.',
        url: 'https://developers.facebook.com/'
      };

      render(<TutorialStepCard step={step} />);

      expect(screen.getByText('01')).toBeDefined();
      expect(screen.getByText('Criar Conta')).toBeDefined();
      expect(screen.getByText('Acessar link oficial')).toBeDefined();
    });
  });

  describe('TutorialPage orchestration component', () => {
    it('deve renderizar a listagem de tutoriais com o banner hero', () => {
      render(<TutorialPage />);

      expect(screen.getByText('Central de Tutoriais da API')).toBeDefined();
      expect(screen.getByText('Compartilhar Portfólio Empresarial')).toBeDefined();
      expect(screen.getByText('Criação do Aplicativo de Negócios na Meta')).toBeDefined();
    });

    it('deve abrir a visão detalhada ao clicar em um tutorial e permitir voltar', () => {
      render(<TutorialPage />);

      const card = screen.getByText('Compartilhar Portfólio Empresarial');
      fireEvent.click(card);

      // Deve mostrar o título na visão detalhada
      expect(screen.getByText('Tutorial Detalhado')).toBeDefined();
      expect(screen.getByText('Selecionar Negócio no Portfólio')).toBeDefined();

      // Clicar no botão voltar (FiArrowLeft)
      const backButton = screen.getByRole('button', { name: '' });
      fireEvent.click(backButton);

      // Deve retornar à listagem
      expect(screen.getByText('Central de Tutoriais da API')).toBeDefined();
    });
  });
});
