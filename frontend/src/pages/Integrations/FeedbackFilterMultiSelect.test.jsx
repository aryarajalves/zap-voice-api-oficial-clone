import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import FeedbackFilterMultiSelect, {
  parseFilterStringToArray,
  formatFeedbackFilterDisplay
} from './components/MappingsConfig/FeedbackFilterMultiSelect';

describe('FeedbackFilterMultiSelect Component and Helpers', () => {
  it('parses filter strings correctly including ranges and commas', () => {
    expect(parseFilterStringToArray('')).toEqual([]);
    expect(parseFilterStringToArray(null)).toEqual([]);
    expect(parseFilterStringToArray('all')).toEqual([]);
    expect(parseFilterStringToArray('1,2,3')).toEqual(['1', '2', '3']);
    expect(parseFilterStringToArray('1-3')).toEqual(['1', '2', '3']);
    expect(parseFilterStringToArray('4..5')).toEqual(['4', '5']);
    expect(parseFilterStringToArray('skipped, 5')).toEqual(['skipped', '5']);
  });

  it('formats display labels accurately', () => {
    expect(formatFeedbackFilterDisplay('')).toBe('Qualquer Avaliação (Padrão - Todos)');
    expect(formatFeedbackFilterDisplay(null)).toBe('Qualquer Avaliação (Padrão - Todos)');
    expect(formatFeedbackFilterDisplay('1,2,3')).toBe('⭐ 1 a 3 Estrelas (Baixas)');
    expect(formatFeedbackFilterDisplay('1-3')).toBe('⭐ 1 a 3 Estrelas (Baixas)');
    expect(formatFeedbackFilterDisplay('4,5')).toBe('⭐ 4 e 5 Estrelas (Altas)');
    expect(formatFeedbackFilterDisplay('1,2,3,4,5')).toBe('⭐ 1 a 5 Estrelas (Todas)');
    expect(formatFeedbackFilterDisplay('5')).toBe('⭐ 5 Estrelas');
    expect(formatFeedbackFilterDisplay('skipped')).toBe('⏩ Pulou');
    expect(formatFeedbackFilterDisplay('skipped,5')).toBe('⭐ 5 Estrelas + ⏩ Pulou');
  });

  it('renders closed by default and opens dropdown on trigger click', () => {
    render(<FeedbackFilterMultiSelect value="" onChange={vi.fn()} />);

    expect(screen.getByText('Qualquer Avaliação (Padrão - Todos)')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Digite para filtrar opções...')).not.toBeInTheDocument();

    // Clica para abrir
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByPlaceholderText('Digite para filtrar opções...')).toBeInTheDocument();
    expect(screen.getByText('⭐ 1 a 3 Estrelas (Baixas)')).toBeInTheDocument();
  });

  it('applies "1 a 3 Estrelas" preset when clicking the preset button', () => {
    const onChange = vi.fn();
    render(<FeedbackFilterMultiSelect value="" onChange={onChange} />);

    // Abre o dropdown
    fireEvent.click(screen.getByRole('button'));

    // Clica no preset de 1 a 3 estrelas
    const presetBtn = screen.getByText('⭐ 1 a 3 Estrelas (Baixas)');
    fireEvent.click(presetBtn);

    expect(onChange).toHaveBeenCalledWith('1,2,3');
  });

  it('applies "4 e 5 Estrelas" preset when clicking the preset button', () => {
    const onChange = vi.fn();
    render(<FeedbackFilterMultiSelect value="" onChange={onChange} />);

    fireEvent.click(screen.getByRole('button'));
    const presetBtn = screen.getByText('⭐ 4 e 5 Estrelas (Altas)');
    fireEvent.click(presetBtn);

    expect(onChange).toHaveBeenCalledWith('4,5');
  });

  it('toggles individual checkbox options', () => {
    const onChange = vi.fn();
    render(<FeedbackFilterMultiSelect value="5" onChange={onChange} />);

    fireEvent.click(screen.getByRole('button'));
    
    // Clica em 4 Estrelas para adicionar à seleção
    const opt4 = screen.getByText('4 Estrelas (⭐⭐⭐⭐)');
    fireEvent.click(opt4);

    expect(onChange).toHaveBeenCalledWith('5,4');
  });

  it('clears selection when clicking "Qualquer (Limpar)"', () => {
    const onChange = vi.fn();
    render(<FeedbackFilterMultiSelect value="1,2,3" onChange={onChange} />);

    fireEvent.click(screen.getByRole('button'));
    const clearBtn = screen.getByText('🌐 Qualquer (Limpar)');
    fireEvent.click(clearBtn);

    expect(onChange).toHaveBeenCalledWith('');
  });
});
