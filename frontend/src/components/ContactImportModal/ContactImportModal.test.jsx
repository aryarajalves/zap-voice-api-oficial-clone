import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ContactImportModal from '../ContactImportModal';
import TagChipInput from './components/TagChipInput';
import ColumnCombobox from './components/ColumnCombobox';
import ImportStep3Success from './components/ImportStep3Success';

// Mock AuthContext e ClientContext
vi.mock('../../contexts/ClientContext', () => ({
  useClient: () => ({ activeClient: { id: 1, name: 'Cliente Teste' } })
}));

vi.mock('../../AuthContext', () => ({
  fetchWithAuth: vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({}) }))
}));

describe('ContactImportModal and Submodules Unit Tests', () => {
  it('TagChipInput adiciona tags via Enter e permite remoção', () => {
    const setTags = vi.fn();
    render(
      <TagChipInput
        tags={['vip', 'cliente']}
        setTags={setTags}
        placeholder="Digite uma tag..."
      />
    );

    expect(screen.getByText('vip')).toBeDefined();
    expect(screen.getByText('cliente')).toBeDefined();

    const input = screen.getByPlaceholderText('');
    fireEvent.change(input, { target: { value: 'novo-lead' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(setTags).toHaveBeenCalledWith(['vip', 'cliente', 'novo-lead']);
  });

  it('ColumnCombobox renderiza opções e filtra por busca', () => {
    const onChange = vi.fn();
    render(
      <ColumnCombobox
        headers={['Nome Completo', 'Telefone Celular', 'E-mail']}
        value="Nome Completo"
        onChange={onChange}
      />
    );

    expect(screen.getByText('Nome Completo')).toBeDefined();

    // Abrir dropdown
    fireEvent.click(screen.getByText('Nome Completo'));

    const searchInput = screen.getByPlaceholderText('Digite para buscar...');
    expect(searchInput).toBeDefined();

    fireEvent.change(searchInput, { target: { value: 'Celular' } });
    expect(screen.getByText('Telefone Celular')).toBeDefined();

    fireEvent.click(screen.getByText('Telefone Celular'));
    expect(onChange).toHaveBeenCalledWith('Telefone Celular');
  });

  it('ImportStep3Success exibe resultado e contadores de importação', () => {
    const result = {
      message: '150 contatos importados com sucesso.',
      imported: 150,
      errors: 2
    };

    render(<ImportStep3Success importResult={result} />);

    expect(screen.getByText('Sucesso!')).toBeDefined();
    expect(screen.getByText('150 contatos importados com sucesso.')).toBeDefined();
    expect(screen.getByText('150')).toBeDefined();
    expect(screen.getByText('2')).toBeDefined();
  });

  it('ContactImportModal renderiza header e passo 1 inicial', () => {
    render(<ContactImportModal isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByText('Importar Contatos')).toBeDefined();
    expect(screen.getByText(/Passo 1 de 3/)).toBeDefined();
    expect(screen.getByText('Clique para selecionar ou arraste o arquivo')).toBeDefined();
  });
});
