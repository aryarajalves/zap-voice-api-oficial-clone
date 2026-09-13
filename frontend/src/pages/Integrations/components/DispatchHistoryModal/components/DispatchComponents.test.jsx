import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import DispatchStatsBar from './DispatchStatsBar';
import DispatchPagination from './DispatchPagination';
import DispatchModalHeader from './DispatchModalHeader';
import DispatchModalFooter from './DispatchModalFooter';

describe('DispatchHistoryModal subcomponents', () => {
  describe('DispatchStatsBar', () => {
    it('não renderiza nada se dispatchStats for nulo', () => {
      const { container } = render(<DispatchStatsBar dispatchStats={null} />);
      expect(container.firstChild).toBeNull();
    });

    it('renderiza corretamente os 5 cards com valores e porcentagens formatados', () => {
      const stats = {
        total_dispatches: 1250,
        delivered: 1100,
        delivered_pct: 88,
        read: 950,
        read_pct: 76,
        interactions: 320,
        interactions_pct: 25.6,
        total_cost: 154.80
      };

      render(<DispatchStatsBar dispatchStats={stats} />);

      expect(screen.getByText('Total de Disparos')).toBeInTheDocument();
      expect(screen.getByText('1.250')).toBeInTheDocument();

      expect(screen.getByText('Entregues')).toBeInTheDocument();
      expect(screen.getByText('1.100')).toBeInTheDocument();
      expect(screen.getByText('88%')).toBeInTheDocument();

      expect(screen.getByText('Abertura')).toBeInTheDocument();
      expect(screen.getByText('950')).toBeInTheDocument();
      expect(screen.getByText('76%')).toBeInTheDocument();

      expect(screen.getByText('Interações')).toBeInTheDocument();
      expect(screen.getByText('320')).toBeInTheDocument();
      expect(screen.getByText('25.6%')).toBeInTheDocument();

      expect(screen.getByText('Investimento')).toBeInTheDocument();
      expect(screen.getByText('R$ 154,80')).toBeInTheDocument();
    });
  });

  describe('DispatchModalHeader', () => {
    it('renderiza o título com o nome da integração', () => {
      render(<DispatchModalHeader integrationName="Minha Loja Hotmart" />);
      expect(screen.getByText(/Histórico de Disparos: Minha Loja Hotmart/i)).toBeInTheDocument();
      expect(screen.getByText(/Acompanhe a fila de execução/i)).toBeInTheDocument();
    });
  });

  describe('DispatchPagination', () => {
    it('renderiza seletor de limite e total de registros', () => {
      const setLimitMock = vi.fn();
      const setPageMock = vi.fn();

      render(
        <DispatchPagination
          dispatchLimit={20}
          setDispatchLimit={setLimitMock}
          dispatchPage={1}
          setDispatchPage={setPageMock}
          dispatchTotal={45}
          totalPages={3}
        />
      );

      expect(screen.getByText('45')).toBeInTheDocument();
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();

      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: '50' } });
      expect(setLimitMock).toHaveBeenCalledWith(50);
      expect(setPageMock).toHaveBeenCalledWith(1);
    });

    it('avança página ao clicar no botão próximo', () => {
      const setPageMock = vi.fn();

      render(
        <DispatchPagination
          dispatchLimit={20}
          setDispatchLimit={() => {}}
          dispatchPage={1}
          setDispatchPage={setPageMock}
          dispatchTotal={45}
          totalPages={3}
        />
      );

      const buttons = screen.getAllByRole('button');
      // O último botão é o "próximo"
      const nextBtn = buttons[buttons.length - 1];
      fireEvent.click(nextBtn);

      expect(setPageMock).toHaveBeenCalled();
    });
  });

  describe('DispatchModalFooter', () => {
    it('dispara onRefresh e onClose ao clicar nos respectivos botões', () => {
      const onRefreshMock = vi.fn();
      const onCloseMock = vi.fn();

      render(<DispatchModalFooter onRefresh={onRefreshMock} onClose={onCloseMock} />);

      const refreshBtn = screen.getByRole('button', { name: /Atualizar Fila/i });
      fireEvent.click(refreshBtn);
      expect(onRefreshMock).toHaveBeenCalledTimes(1);

      const closeBtn = screen.getByRole('button', { name: /Fechar Painel/i });
      fireEvent.click(closeBtn);
      expect(onCloseMock).toHaveBeenCalledTimes(1);
    });
  });
});
