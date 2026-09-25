import React from 'react';
import { render, screen, fireEvent, renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useBulkTagModal } from './hooks/useBulkTagModal';
import BulkTagModalHeader from './components/BulkTagModalHeader';
import BulkTagCategorySelector from './components/BulkTagCategorySelector';
import BulkTagSelectedList from './components/BulkTagSelectedList';
import BulkTagSearchInput from './components/BulkTagSearchInput';
import BulkTagAvailableList from './components/BulkTagAvailableList';
import BulkTagModalFooter from './components/BulkTagModalFooter';

describe('BulkTagModal Subcomponentes e Hooks', () => {
  describe('useBulkTagModal hook', () => {
    it('gerencia seleção e desmarcação de tags', () => {
      const { result } = renderHook(() =>
        useBulkTagModal({
          isOpen: true,
          chatLabels: ['VIP', 'Lead', 'Suporte'],
          onClose: vi.fn(),
          onApply: vi.fn()
        })
      );

      act(() => {
        result.current.handleToggleTag('VIP');
      });
      expect(result.current.selectedTags).toContain('VIP');

      act(() => {
        result.current.handleToggleTag('VIP');
      });
      expect(result.current.selectedTags).not.toContain('VIP');
    });

    it('abre modal de criação para tag personalizada e confirma criação com cor', async () => {
      const setCustomBulkTag = vi.fn();
      const { result } = renderHook(() =>
        useBulkTagModal({
          isOpen: true,
          chatLabels: ['VIP'],
          setCustomBulkTag
        })
      );

      act(() => {
        result.current.handleCreateCustomTag('NovaTagExclusiva');
      });

      expect(result.current.isCreateModalOpen).toBe(true);
      expect(result.current.createTagName).toBe('NovaTagExclusiva');

      await act(async () => {
        await result.current.handleConfirmCreateLabel();
      });

      expect(result.current.selectedTags).toContain('NovaTagExclusiva');
      expect(setCustomBulkTag).toHaveBeenCalledWith('NovaTagExclusiva');
      expect(result.current.isCreateModalOpen).toBe(false);
    });

    it('alterna categoria e limpa seleções anteriores', () => {
      const { result } = renderHook(() =>
        useBulkTagModal({
          isOpen: true,
          chatLabels: ['ChatLabel1'],
          contactLabels: ['ContactLabel1']
        })
      );

      act(() => {
        result.current.handleToggleTag('ChatLabel1');
      });
      expect(result.current.selectedTags).toContain('ChatLabel1');

      act(() => {
        result.current.handleSwitchCategory('contacts');
      });
      expect(result.current.targetCategory).toBe('contacts');
      expect(result.current.selectedTags).toHaveLength(0);
    });

    it('trata tecla Escape chamando onClose', () => {
      const onClose = vi.fn();
      const { result } = renderHook(() =>
        useBulkTagModal({
          isOpen: true,
          onClose
        })
      );

      act(() => {
        result.current.handleKeyDown({ key: 'Escape' });
      });
      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('BulkTagModalHeader & CategorySelector', () => {
    it('renderiza contagem e permite alternar categoria', () => {
      const onSwitchCategory = vi.fn();
      render(
        <>
          <BulkTagModalHeader selectedCount={5} />
          <BulkTagCategorySelector
            targetCategory="chat"
            onSwitchCategory={onSwitchCategory}
          />
        </>
      );

      expect(screen.getByText('5')).toBeInTheDocument();
      const btnContacts = screen.getByText('Aba de Contatos');
      fireEvent.click(btnContacts);
      expect(onSwitchCategory).toHaveBeenCalledWith('contacts');
    });
  });

  describe('BulkTagSelectedList & SearchInput', () => {
    it('renderiza tags selecionadas e botão de limpar todas', () => {
      const handleRemoveTag = vi.fn();
      const handleClearAllTags = vi.fn();

      render(
        <BulkTagSelectedList
          selectedTags={['Tag1', 'Tag2']}
          targetCategory="chat"
          resolveColor={() => '#ff0000'}
          handleRemoveTag={handleRemoveTag}
          handleClearAllTags={handleClearAllTags}
        />
      );

      expect(screen.getByText('Tag1')).toBeInTheDocument();
      expect(screen.getByText('Tag2')).toBeInTheDocument();

      const clearBtn = screen.getByText('Limpar todas');
      fireEvent.click(clearBtn);
      expect(handleClearAllTags).toHaveBeenCalled();
    });

    it('permite digitar no campo de busca e limpar pelo botão X', () => {
      const setSearchTerm = vi.fn();
      render(
        <BulkTagSearchInput
          targetCategory="chat"
          searchTerm="teste"
          setSearchTerm={setSearchTerm}
          searchInputRef={{ current: null }}
          onKeyDown={vi.fn()}
        />
      );

      const clearBtn = screen.getByTitle('Limpar busca');
      fireEvent.click(clearBtn);
      expect(setSearchTerm).toHaveBeenCalledWith('');
    });
  });

  describe('BulkTagAvailableList & Footer', () => {
    it('exibe opção para criar nova etiqueta quando não for match exato', () => {
      const handleCreateCustomTag = vi.fn();
      render(
        <BulkTagAvailableList
          filteredLabels={[]}
          searchTerm="nova"
          isExactMatch={false}
          targetCategory="chat"
          selectedTags={[]}
          resolveColor={() => '#000'}
          handleCreateCustomTag={handleCreateCustomTag}
          handleToggleTag={vi.fn()}
        />
      );

      const createBtn = screen.getByText(/Criar e selecionar nova etiqueta/i);
      fireEvent.click(createBtn);
      expect(handleCreateCustomTag).toHaveBeenCalledWith('nova');
    });

    it('footer aciona onApply com tags selecionadas', () => {
      const onApply = vi.fn();
      render(
        <BulkTagModalFooter
          onClose={vi.fn()}
          onApply={onApply}
          selectedTags={['TagA', 'TagB']}
          targetCategory="chat"
          isApplying={false}
        />
      );

      const applyBtn = screen.getByRole('button', { name: /Salvar 2 etiquetas no Chat/i });
      fireEvent.click(applyBtn);
      expect(onApply).toHaveBeenCalledWith(['TagA', 'TagB'], 'chat', { initialTags: [] });
    });

    it('footer exibe botão de remoção habilitado quando desmarcar todas as etiquetas existentes', () => {
      const onApply = vi.fn();
      render(
        <BulkTagModalFooter
          onClose={vi.fn()}
          onApply={onApply}
          selectedTags={[]}
          initialTags={['tag-antiga']}
          targetCategory="chat"
          isApplying={false}
        />
      );

      const removeBtn = screen.getByRole('button', { name: /Remover etiquetas do Chat/i });
      expect(removeBtn.disabled).toBe(false);
      fireEvent.click(removeBtn);
      expect(onApply).toHaveBeenCalledWith([], 'chat', { initialTags: ['tag-antiga'] });
    });
  });
});
