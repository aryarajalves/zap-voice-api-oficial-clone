import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import IntegrationFormModal from './IntegrationFormModal';
import PlatformSelect from './IntegrationFormModal/PlatformSelect';
import UpsellProductsConfig from './IntegrationFormModal/UpsellProductsConfig';

// Mock de MappingsConfig para isolar o teste do modal
vi.mock('./MappingsConfig/index', () => ({
  default: () => <div data-testid="mock-mappings-config">Mock Mappings Config</div>
}));

describe('IntegrationFormModal & Subcomponents Unit Tests', () => {
  const defaultFormData = {
    name: 'Hotmart VIP',
    custom_slug: 'hotmart-vip',
    platform: 'hotmart',
    mappings: [{ id: 1, event: 'purchase_approved' }],
    upsell_products: ['Produto Upsell 1'],
    discovered_products: ['E-book Bonus', 'Mentoria Extra']
  };

  describe('IntegrationFormModal', () => {
    it('não renderiza nada quando isOpen=false', () => {
      const { container } = render(
        <IntegrationFormModal
          isOpen={false}
          onClose={vi.fn()}
          formData={defaultFormData}
          setFormData={vi.fn()}
          onSave={vi.fn()}
        />
      );
      expect(screen.queryByText('Nova Integração')).not.toBeInTheDocument();
      expect(screen.queryByText('Editar Integração')).not.toBeInTheDocument();
    });

    it('renderiza o modal quando isOpen=true com abas e badges de contagem', () => {
      render(
        <IntegrationFormModal
          isOpen={true}
          onClose={vi.fn()}
          formData={defaultFormData}
          setFormData={vi.fn()}
          onSave={vi.fn()}
          editingIntegration={false}
        />
      );

      expect(screen.getByText('Nova Integração')).toBeInTheDocument();
      expect(screen.getByText('Automação para hotmart')).toBeInTheDocument();
      expect(screen.getAllByRole('button', { name: /Configuração/i })[0]).toBeInTheDocument();
      expect(screen.getAllByRole('button', { name: /Upsell/i })[0]).toBeInTheDocument();
      expect(screen.getAllByRole('button', { name: /Gatilhos/i })[0]).toBeInTheDocument();
      
      // Contadores de badge (1 upsell e 1 gatilho)
      expect(screen.getAllByText('1').length).toBe(2);
    });

    it('permite alternar entre as abas ao clicar nos botões do header', () => {
      render(
        <IntegrationFormModal
          isOpen={true}
          onClose={vi.fn()}
          formData={defaultFormData}
          setFormData={vi.fn()}
          onSave={vi.fn()}
        />
      );

      // Aba inicial é Configuração
      expect(screen.getByDisplayValue('Hotmart VIP')).toBeInTheDocument();

      // Clica na aba Upsell no header
      const upsellTabBtn = screen.getAllByRole('button', { name: /Upsell/i })[0];
      fireEvent.click(upsellTabBtn);
      expect(screen.getByText('Produtos Upsell')).toBeInTheDocument();
      expect(screen.getByText('Produto Upsell 1')).toBeInTheDocument();

      // Clica na aba Gatilhos no header
      const gatilhosTabBtn = screen.getAllByRole('button', { name: /Gatilhos/i })[0];
      fireEvent.click(gatilhosTabBtn);
      expect(screen.getByTestId('mock-mappings-config')).toBeInTheDocument();
    });

    it('dispara onSave ao clicar em Salvar Alterações e onClose ao clicar em Cancelar', () => {
      const onSaveMock = vi.fn();
      const onCloseMock = vi.fn();

      render(
        <IntegrationFormModal
          isOpen={true}
          onClose={onCloseMock}
          formData={defaultFormData}
          setFormData={vi.fn()}
          onSave={onSaveMock}
          isSaving={false}
        />
      );

      const saveBtn = screen.getByRole('button', { name: /Salvar Alterações/i });
      fireEvent.click(saveBtn);
      expect(onSaveMock).toHaveBeenCalledTimes(1);

      const cancelBtn = screen.getByRole('button', { name: /Cancelar/i });
      fireEvent.click(cancelBtn);
      expect(onCloseMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('PlatformSelect', () => {
    it('abre a lista suspensa e permite selecionar uma plataforma com busca', () => {
      const onChangeMock = vi.fn();
      render(<PlatformSelect value="hotmart" onChange={onChangeMock} />);

      const triggerBtn = screen.getByRole('button');
      expect(screen.getByText('Hotmart')).toBeInTheDocument();

      // Abre dropdown
      fireEvent.click(triggerBtn);

      const searchInput = screen.getByPlaceholderText('Buscar plataforma...');
      expect(searchInput).toBeInTheDocument();

      // Filtra por Kiwify
      fireEvent.change(searchInput, { target: { value: 'Kiwify' } });
      const kiwifyOption = screen.getByText('Kiwify');
      expect(kiwifyOption).toBeInTheDocument();

      fireEvent.click(kiwifyOption);
      expect(onChangeMock).toHaveBeenCalledWith('kiwify');
    });
  });

  describe('UpsellProductsConfig', () => {
    it('permite adicionar e remover produtos de upsell', () => {
      const onChangeMock = vi.fn();
      render(
        <UpsellProductsConfig
          upsellProducts={['Produto 1']}
          discoveredProducts={['Mentoria VIP']}
          onChange={onChangeMock}
        />
      );

      expect(screen.getByText('Produto 1')).toBeInTheDocument();

      // Adiciona novo produto pelo input
      const input = screen.getByPlaceholderText(/Digite o nome exato do produto upsell/i);
      fireEvent.change(input, { target: { value: 'Comunidade Anual' } });

      const addBtn = screen.getByRole('button', { name: /Adicionar/i });
      fireEvent.click(addBtn);
      expect(onChangeMock).toHaveBeenCalledWith(['Produto 1', 'Comunidade Anual']);

      // Clica na sugestão de produto detectado
      const suggestionBtn = screen.getByRole('button', { name: /\+ Mentoria VIP/i });
      fireEvent.click(suggestionBtn);
      expect(onChangeMock).toHaveBeenCalledWith(['Produto 1', 'Mentoria VIP']);
    });
  });
});
