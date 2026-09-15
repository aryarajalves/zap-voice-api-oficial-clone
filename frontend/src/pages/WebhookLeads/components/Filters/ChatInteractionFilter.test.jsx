import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import ChatInteractionFilter, { getInteractionPresetLabel } from './ChatInteractionFilter';

describe('ChatInteractionFilter Component', () => {
  it('retorna labels corretos via helper getInteractionPresetLabel', () => {
    expect(getInteractionPresetLabel('any')).toContain('Já interagiu');
    expect(getInteractionPresetLabel('last7')).toContain('Últimos 7 dias');
    expect(getInteractionPresetLabel('never')).toContain('Nunca interagiu');
    expect(getInteractionPresetLabel('custom')).toContain('personalizado');
    expect(getInteractionPresetLabel('')).toBeNull();
  });

  it('renderiza o botão com estado inicial vazio (Todas as Interações)', () => {
    render(
      <ChatInteractionFilter
        interactionPreset=""
        setInteractionPreset={vi.fn()}
      />
    );

    const btn = screen.getByRole('button', { name: /Todas as Interações/i });
    expect(btn).toBeInTheDocument();
  });

  it('abre o dropdown ao clicar e exibe os presets de interação', () => {
    render(
      <ChatInteractionFilter
        interactionPreset=""
        setInteractionPreset={vi.fn()}
      />
    );

    const btn = screen.getByRole('button', { name: /Todas as Interações/i });
    fireEvent.click(btn);

    expect(screen.getByText(/Já interagiu alguma vez/i)).toBeInTheDocument();
    expect(screen.getByText(/Últimos 7 dias/i)).toBeInTheDocument();
    expect(screen.getByText(/Nunca interagiu/i)).toBeInTheDocument();
    expect(screen.getByText(/Período personalizado/i)).toBeInTheDocument();
  });

  it('chama setInteractionPreset ao selecionar uma opção', () => {
    const setInteractionPreset = vi.fn();
    render(
      <ChatInteractionFilter
        interactionPreset=""
        setInteractionPreset={setInteractionPreset}
      />
    );

    const btn = screen.getByRole('button', { name: /Todas as Interações/i });
    fireEvent.click(btn);

    const option7Days = screen.getByText(/Últimos 7 dias/i);
    fireEvent.click(option7Days);

    expect(setInteractionPreset).toHaveBeenCalledWith('last7');
  });

  it('exibe campos de data quando o preset for custom', () => {
    const setFrom = vi.fn();
    const setTo = vi.fn();

    render(
      <ChatInteractionFilter
        interactionPreset="custom"
        setInteractionPreset={vi.fn()}
        customInteractionFrom="2026-09-01"
        customInteractionTo="2026-09-15"
        setCustomInteractionFrom={setFrom}
        setCustomInteractionTo={setTo}
      />
    );

    const btn = screen.getByRole('button', { name: /Período personalizado/i });
    fireEvent.click(btn);

    const fromInput = document.getElementById('contacts-interaction-from-input');
    const toInput = document.getElementById('contacts-interaction-to-input');

    expect(fromInput).toBeInTheDocument();
    expect(toInput).toBeInTheDocument();
    expect(fromInput.value).toBe('2026-09-01');
    expect(toInput.value).toBe('2026-09-15');

    fireEvent.change(fromInput, { target: { value: '2026-09-05' } });
    expect(setFrom).toHaveBeenCalledWith('2026-09-05');
  });

  it('permite limpar o filtro de interação pelo botão limpar inline', () => {
    const handleClear = vi.fn();
    render(
      <ChatInteractionFilter
        interactionPreset="last7"
        setInteractionPreset={vi.fn()}
        handleClearInteractionFilters={handleClear}
      />
    );

    const clearBtn = document.getElementById('contacts-interaction-clear-inline-btn');
    expect(clearBtn).toBeInTheDocument();
    fireEvent.click(clearBtn);

    expect(handleClear).toHaveBeenCalled();
  });
});
