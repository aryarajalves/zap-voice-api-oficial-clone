import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import TagSelector from './TagSelector';

describe('TagSelector Component', () => {
  it('abre o dropdown de etiquetas e aplica as classes de stacking context corretas', () => {
    const setSelectedTags = vi.fn();
    render(
      <TagSelector
        selectedTags={[]}
        setSelectedTags={setSelectedTags}
        excludedTags={[]}
        setExcludedTags={vi.fn()}
        availableTags={['Compra Aprovada', 'Lead Extraido', 'aryaraj']}
        isLoadingTags={false}
      />
    );

    const button = screen.getByText('-- Escolha as etiquetas --');
    fireEvent.click(button);

    expect(screen.getByPlaceholderText('Buscar etiqueta...')).toBeInTheDocument();
    expect(screen.getByText('Compra Aprovada')).toBeInTheDocument();
    expect(screen.getByText('Lead Extraido')).toBeInTheDocument();
    expect(screen.getByText('aryaraj')).toBeInTheDocument();
  });
});
