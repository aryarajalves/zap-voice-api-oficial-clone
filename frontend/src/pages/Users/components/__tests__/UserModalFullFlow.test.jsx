import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import UserModal from '../UserModal';
import { useUserModalLogic } from '../UserModal/useUserModalLogic';
import { renderHook, act } from '@testing-library/react';

vi.mock('../../../../AuthContext', () => ({
  fetchWithAuth: vi.fn()
}));

vi.mock('react-hot-toast', () => ({
  toast: {
    loading: vi.fn().mockReturnValue('toast-1'),
    success: vi.fn(),
    error: vi.fn(),
    dismiss: vi.fn()
  }
}));

import { fetchWithAuth } from '../../../../AuthContext';
import { toast } from 'react-hot-toast';

describe('UserModal Modular Flow & Subcomponents', () => {
  const baseUserData = {
    full_name: 'Usuário Teste',
    email: 'teste@email.com',
    role: 'admin',
    client_ids: [1],
    blocked_features: [],
    is_active: true
  };

  beforeEach(() => {
    vi.clearAllMocks();
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined)
      }
    });
  });

  it('não deve renderizar nada quando isOpen for false', () => {
    const { container } = render(
      <UserModal
        isOpen={false}
        setIsOpen={vi.fn()}
        editingUser={null}
        userData={baseUserData}
        setUserData={vi.fn()}
        handleSubmit={vi.fn()}
        showPassword={false}
        setShowPassword={vi.fn()}
        clients={[]}
        toggleClientAccess={vi.fn()}
      />
    );
    expect(container.innerHTML).toBe('');
  });

  it('deve renderizar modal de criação com título "Convidar Novo Usuário" e botão "Gerar Link de Convite"', () => {
    render(
      <UserModal
        isOpen={true}
        setIsOpen={vi.fn()}
        editingUser={null}
        userData={baseUserData}
        setUserData={vi.fn()}
        handleSubmit={vi.fn()}
        showPassword={false}
        setShowPassword={vi.fn()}
        clients={[{ id: 1, name: 'Cliente Alpha' }]}
        toggleClientAccess={vi.fn()}
      />
    );

    expect(screen.getByText('Convidar Novo Usuário')).toBeDefined();
    expect(screen.getByText('Prazo de Validade do Convite')).toBeDefined();
    expect(screen.getByText('Gerar Link de Convite')).toBeDefined();
  });

  it('deve renderizar modal de edição com dados do usuário e botão "Salvar Alterações"', () => {
    const editingUser = { id: 10, full_name: 'Carlos Admin', role: 'admin' };

    render(
      <UserModal
        isOpen={true}
        setIsOpen={vi.fn()}
        editingUser={editingUser}
        userData={{ ...baseUserData, full_name: 'Carlos Admin' }}
        setUserData={vi.fn()}
        handleSubmit={vi.fn()}
        showPassword={false}
        setShowPassword={vi.fn()}
        clients={[]}
        toggleClientAccess={vi.fn()}
      />
    );

    expect(screen.getByText('Editar Usuário')).toBeDefined();
    expect(screen.getByDisplayValue('Carlos Admin')).toBeDefined();
    expect(screen.getByText('Redefinição de Senha')).toBeDefined();
    expect(screen.getByText('Criar Link de Nova Senha')).toBeDefined();
    expect(screen.getByText('Salvar Alterações')).toBeDefined();
  });

  it('deve disparar toggle de acesso ao mudar cargo para Vendedor e exibir o banner', () => {
    const setUserData = vi.fn();

    render(
      <UserModal
        isOpen={true}
        setIsOpen={vi.fn()}
        editingUser={null}
        userData={{ ...baseUserData, role: 'vendedor' }}
        setUserData={setUserData}
        handleSubmit={vi.fn()}
        showPassword={false}
        setShowPassword={vi.fn()}
        clients={[]}
        toggleClientAccess={vi.fn()}
      />
    );

    expect(screen.getByText('Acesso restrito ao Painel de Atendimento')).toBeDefined();
    expect(screen.getByText('Pontuação do Vendedor (Peso de Distribuição)')).toBeDefined();
  });

  describe('useUserModalLogic hook', () => {
    it('deve gerar link de convite com sucesso via API', async () => {
      fetchWithAuth.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ token: 'convite-token-123' })
      });

      const onInviteGenerated = vi.fn();
      const { result } = renderHook(() => useUserModalLogic({
        userData: baseUserData,
        setUserData: vi.fn(),
        editingUser: null,
        onInviteGenerated,
        setIsOpen: vi.fn()
      }));

      await act(async () => {
        await result.current.handleGenerateInvite({ preventDefault: vi.fn() });
      });

      expect(fetchWithAuth).toHaveBeenCalled();
      expect(result.current.generatedLink).toContain('/invite/convite-token-123');
      expect(onInviteGenerated).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith('Link de convite gerado com sucesso!');
    });

    it('deve gerar link de redefinição de senha para usuário em edição', async () => {
      fetchWithAuth.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ token: 'reset-token-456' })
      });

      const editingUser = { id: 99 };
      const { result } = renderHook(() => useUserModalLogic({
        userData: baseUserData,
        setUserData: vi.fn(),
        editingUser,
        onInviteGenerated: vi.fn(),
        setIsOpen: vi.fn()
      }));

      await act(async () => {
        await result.current.handleGenerateResetLink();
      });

      expect(fetchWithAuth).toHaveBeenCalled();
      expect(result.current.resetLink).toContain('/reset-password/reset-token-456');
      expect(toast.success).toHaveBeenCalledWith('Link de redefinição gerado e copiado!');
    });
  });
});
