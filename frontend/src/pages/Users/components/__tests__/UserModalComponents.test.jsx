import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import InviteSuccessView from '../UserModal/InviteSuccessView';
import UserPanelsAccessSection from '../UserModal/UserPanelsAccessSection';
import UserFunnelNodesSection from '../UserModal/UserFunnelNodesSection';
import UserClientsAccessSection from '../UserModal/UserClientsAccessSection';
import UserSetupStatusSection from '../UserModal/UserSetupStatusSection';

describe('UserModal Subcomponents', () => {
  describe('InviteSuccessView', () => {
    it('renderiza o link de convite e botões', () => {
      const handleCopy = vi.fn();
      const handleClose = vi.fn();

      render(
        <InviteSuccessView
          generatedLink="http://localhost:5176/invite/abc123token"
          copied={false}
          onCopyLink={handleCopy}
          onClose={handleClose}
        />
      );

      expect(screen.getByText('Convite Pronto!')).toBeDefined();
      expect(screen.getByDisplayValue('http://localhost:5176/invite/abc123token')).toBeDefined();
      expect(screen.getByText('Concluir')).toBeDefined();
    });
  });

  describe('UserPanelsAccessSection', () => {
    it('renderiza as seções categorizadas de painéis', () => {
      const setUserData = vi.fn();
      const userData = {
        blocked_features: ['schedules'],
        pages_status: {}
      };

      render(
        <UserPanelsAccessSection
          userData={userData}
          setUserData={setUserData}
        />
      );

      expect(screen.getByText('Painéis e Status de Construção')).toBeDefined();
      expect(screen.getByText('Disparo em Massa')).toBeDefined();
      expect(screen.getByText('Funis de Vendas')).toBeDefined();
    });
  });

  describe('UserFunnelNodesSection', () => {
    it('renderiza os nós configuráveis do funil', () => {
      const setUserData = vi.fn();
      const userData = {
        blocked_nodes: ['httpRequestNode']
      };

      render(
        <UserFunnelNodesSection
          userData={userData}
          setUserData={setUserData}
        />
      );

      expect(screen.getByText('Restringir Nós do Funil')).toBeDefined();
      expect(screen.getByText('Mensagem (Texto)')).toBeDefined();
      expect(screen.getByText('Requisição HTTP (Webhook)')).toBeDefined();
    });
  });

  describe('UserClientsAccessSection', () => {
    it('renderiza os clientes e permite toggle de acesso', () => {
      const toggleClient = vi.fn();
      const clients = [
        { id: 1, name: 'Cliente Alfa' },
        { id: 2, name: 'Cliente Beta' }
      ];
      const userData = {
        client_ids: [1]
      };

      render(
        <UserClientsAccessSection
          clients={clients}
          userData={userData}
          toggleClientAccess={toggleClient}
        />
      );

      expect(screen.getByText('Acesso aos Clientes')).toBeDefined();
      expect(screen.getByText('Cliente Alfa')).toBeDefined();
      expect(screen.getByText('Cliente Beta')).toBeDefined();
    });
  });

  describe('UserSetupStatusSection', () => {
    it('renderiza status de setup da página', () => {
      const setUserData = vi.fn();
      const userData = {
        setup_completed: false,
        setup_percentage: 50
      };

      render(
        <UserSetupStatusSection
          userData={userData}
          setUserData={setUserData}
        />
      );

      expect(screen.getByText('Status da Configuração')).toBeDefined();
      expect(screen.getByText('Página finalizada')).toBeDefined();
      expect(screen.getByText('50%')).toBeDefined();
    });
  });
});
