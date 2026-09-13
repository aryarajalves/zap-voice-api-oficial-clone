import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AppointmentsPage, { getRemainingTime } from './index';
import * as ClientContext from '../../../contexts/ClientContext';
import * as AuthContext from '../../../AuthContext';

describe('Modularização de AppointmentsPage', () => {
  beforeEach(() => {
    vi.spyOn(ClientContext, 'useClient').mockReturnValue({
      activeClient: { id: 1, name: 'Cliente Teste' }
    });
  });

  describe('getRemainingTime (countdown)', () => {
    it('deve retornar "Sem data" se a data for nula ou vazia', () => {
      expect(getRemainingTime(null)).toEqual({ text: 'Sem data', type: 'expired' });
      expect(getRemainingTime('')).toEqual({ text: 'Sem data', type: 'expired' });
    });

    it('deve retornar "Realizado / Ocorrido" se a data já passou', () => {
      const now = new Date('2026-09-13T12:00:00Z');
      const past = '2026-09-13T11:59:00Z';
      expect(getRemainingTime(past, now)).toEqual({ text: 'Realizado / Ocorrido', type: 'expired' });
    });

    it('deve formatar data futura em dias e horas (> 24h)', () => {
      const now = new Date('2026-09-13T12:00:00Z');
      const future = '2026-09-15T14:30:00Z'; // 2 dias, 2 horas, 30 min
      const res = getRemainingTime(future, now);
      expect(res.type).toBe('future');
      expect(res.text).toContain('Falta(m) 2d 2h 30m');
    });

    it('deve marcar como perigo/urgente quando faltam menos de 60 minutos', () => {
      const now = new Date('2026-09-13T12:00:00Z');
      const urgent = '2026-09-13T12:15:30Z'; // 15 min e 30 seg
      const res = getRemainingTime(urgent, now);
      expect(res.type).toBe('danger');
      expect(res.text).toContain('Urgente!');
    });
  });

  describe('AppointmentsPage Component', () => {
    it('deve renderizar tela com leads agendados vindos da API', async () => {
      const mockLeads = [
        {
          id: 101,
          name: 'Carlos Agendado',
          email: 'carlos@teste.com',
          phone: '5511999998888',
          created_at: '2026-09-13T10:00:00Z',
          event_datetime: '2026-09-15T15:00:00Z',
          google_calendar_link: 'https://calendar.google.com/event?id=123',
          google_calendar_reminder_sent: true,
          reminder_dispatch_status: 'delivered',
        }
      ];

      vi.spyOn(AuthContext, 'fetchWithAuth').mockResolvedValue({
        ok: true,
        json: async () => ({ items: mockLeads, total: 1 })
      });

      render(<AppointmentsPage />);

      expect(screen.getByText('Painel de Agendamentos')).toBeDefined();
      expect(screen.getByText('Filtros e Busca')).toBeDefined();

      await waitFor(() => {
        expect(screen.getByText('Carlos Agendado')).toBeDefined();
        expect(screen.getByText('5511999998888')).toBeDefined();
        expect(screen.getByText('Abrir Evento')).toBeDefined();
        expect(screen.getByText('Entregue')).toBeDefined();
      });
    });

    it('deve exibir botão de re-disparar quando lembrete falhou', async () => {
      const mockLeadsFailed = [
        {
          id: 102,
          name: 'Ana Falha',
          phone: '5511977776666',
          created_at: '2026-09-13T10:00:00Z',
          event_datetime: '2026-09-13T16:00:00Z',
          reminder_dispatch_status: 'failed',
          reminder_dispatch_failure_reason: 'Número bloqueado ou inexistente',
        }
      ];

      vi.spyOn(AuthContext, 'fetchWithAuth').mockResolvedValue({
        ok: true,
        json: async () => ({ items: mockLeadsFailed, total: 1 })
      });

      render(<AppointmentsPage />);

      await waitFor(() => {
        expect(screen.getByText('Ana Falha')).toBeDefined();
        expect(screen.getByText('Falhou')).toBeDefined();
        expect(screen.getByText('Re-disparar')).toBeDefined();
      });
    });

    it('deve permitir limpar filtros de busca e datas', async () => {
      vi.spyOn(AuthContext, 'fetchWithAuth').mockResolvedValue({
        ok: true,
        json: async () => ({ items: [], total: 0 })
      });

      render(<AppointmentsPage />);

      const searchInput = screen.getByPlaceholderText('Nome ou telefone...');
      fireEvent.change(searchInput, { target: { value: 'João' } });
      expect(searchInput.value).toBe('João');

      const clearBtn = screen.getByTitle('Limpar Filtros');
      fireEvent.click(clearBtn);

      expect(searchInput.value).toBe('');
    });
  });
});
