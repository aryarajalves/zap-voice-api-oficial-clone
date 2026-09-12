import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ContactImportModal from '../ContactImportModal';
import TagChipInput from './components/TagChipInput';
import ColumnCombobox from './components/ColumnCombobox';
import ImportStep3Success from './components/ImportStep3Success';
import { decomposeAndBuildPhone, digitsOnly, parseDdiVal } from './components/ImportStep2Mapping';

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

  it('TagChipInput filtra etiquetas existentes e exibe sugestões correspondentes', () => {
    const setTags = vi.fn();
    const availableTags = ['cliente-vip', 'cliente-antigo', 'lead-quente'];

    render(
      <TagChipInput
        tags={[]}
        setTags={setTags}
        availableTags={availableTags}
        placeholder="Digite uma tag..."
      />
    );

    const input = screen.getByPlaceholderText('Digite uma tag...');
    fireEvent.change(input, { target: { value: 'cliente' } });

    // Deve exibir as tags existentes correspondentes
    expect(screen.getByText('cliente-vip')).toBeDefined();
    expect(screen.getByText('cliente-antigo')).toBeDefined();
    expect(screen.queryByText('lead-quente')).toBeNull();

    // Clicar em uma tag existente deve adicioná-la
    fireEvent.mouseDown(screen.getByText('cliente-vip'));
    expect(setTags).toHaveBeenCalledWith(['cliente-vip']);
  });

  it('TagChipInput avisa e permite criar nova etiqueta quando não houver correspondência', () => {
    const setTags = vi.fn();
    const availableTags = ['cliente-vip', 'lead-quente'];

    render(
      <TagChipInput
        tags={[]}
        setTags={setTags}
        availableTags={availableTags}
        placeholder="Digite uma tag..."
      />
    );

    const input = screen.getByPlaceholderText('Digite uma tag...');
    fireEvent.change(input, { target: { value: 'tag-inexistente' } });

    // Deve exibir o aviso explícito de que não há etiquetas com esses dígitos
    expect(screen.getByText('Nenhuma etiqueta existente com esses dígitos')).toBeDefined();
    
    // Deve exibir o botão de criar nova etiqueta
    const createButton = screen.getByText(/Criar nova etiqueta:/);
    expect(createButton).toBeDefined();

    // Ao clicar na opção de criar, deve adicionar a nova etiqueta
    fireEvent.mouseDown(createButton);
    expect(setTags).toHaveBeenCalledWith(['tag-inexistente']);
  });

  it('TagChipInput seleciona sugestão via teclado (ArrowDown + Enter)', () => {
    const setTags = vi.fn();
    const availableTags = ['alfa', 'beta'];

    render(
      <TagChipInput
        tags={[]}
        setTags={setTags}
        availableTags={availableTags}
        placeholder="Digite uma tag..."
      />
    );

    const input = screen.getByPlaceholderText('Digite uma tag...');
    fireEvent.change(input, { target: { value: 'al' } });

    // Navega com seta para baixo e seleciona com Enter
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(setTags).toHaveBeenCalledWith(['alfa']);
  });

  it('TagChipInput abre lista de etiquetas cadastradas ao focar com campo vazio e permite seleção', () => {
    const setTags = vi.fn();
    const availableTags = ['cliente-ouro', 'prospecto'];

    render(
      <TagChipInput
        tags={[]}
        setTags={setTags}
        availableTags={availableTags}
        placeholder="Digite uma tag..."
      />
    );

    const input = screen.getByPlaceholderText('Digite uma tag...');
    // Foca no input vazio
    fireEvent.focus(input);

    // Deve exibir o cabeçalho de etiquetas cadastradas
    expect(screen.getByText('Etiquetas cadastradas')).toBeDefined();
    expect(screen.getByText('2 disponível(is)')).toBeDefined();
    expect(screen.getByText('cliente-ouro')).toBeDefined();
    expect(screen.getByText('prospecto')).toBeDefined();

    // Clica para selecionar uma etiqueta existente
    fireEvent.mouseDown(screen.getByText('cliente-ouro'));
    expect(setTags).toHaveBeenCalledWith(['cliente-ouro']);
  });

  it('TagChipInput orienta sobre criar etiqueta quando não houver nenhuma etiqueta cadastrada no sistema', () => {
    const setTags = vi.fn();

    render(
      <TagChipInput
        tags={[]}
        setTags={setTags}
        availableTags={[]}
        placeholder="Digite uma tag..."
      />
    );

    const input = screen.getByPlaceholderText('Digite uma tag...');
    // Foca no input vazio
    fireEvent.focus(input);

    // Deve informar que não há etiquetas e orientar sobre como criar
    expect(screen.getByText('Nenhuma etiqueta cadastrada no sistema')).toBeDefined();
    expect(screen.getByText(/Deseja criar uma nova etiqueta\? Basta digitar o nome no campo acima/)).toBeDefined();
  });

  it('TagChipInput avisa quando todas as etiquetas cadastradas já foram selecionadas', () => {
    const setTags = vi.fn();

    render(
      <TagChipInput
        tags={['etiqueta-unica']}
        setTags={setTags}
        availableTags={['etiqueta-unica']}
        placeholder="Digite uma tag..."
      />
    );

    const input = screen.getByPlaceholderText('');
    fireEvent.focus(input);

    expect(screen.getByText('Todas as etiquetas cadastradas já foram selecionadas')).toBeDefined();
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

  describe('decomposeAndBuildPhone (DDI manual e verificação inteligente)', () => {
    it('adiciona DDI 55 quando número tem 11 dígitos e DDI foi informado manualmente', () => {
      const res = decomposeAndBuildPhone('', '11947260688', '', '55');
      expect(res.ddi).toBe('55');
      expect(res.ddd).toBe('');
      expect(res.number).toBe('11947260688');
      expect(res.full).toBe('5511947260688');
    });

    it('não duplica DDI 55 quando número já possui 13 dígitos começando com 55', () => {
      const res = decomposeAndBuildPhone('', '5511947260688', '', '55');
      expect(res.ddi).toBe('55');
      expect(res.ddd).toBe('');
      expect(res.number).toBe('11947260688');
      expect(res.full).toBe('5511947260688');
    });

    it('adiciona DDI 55 para número do RS com DDD 55 (11 dígitos, sem DDI)', () => {
      const res = decomposeAndBuildPhone('', '55981112233', '', '55');
      expect(res.ddi).toBe('55');
      expect(res.ddd).toBe('');
      expect(res.number).toBe('55981112233');
      expect(res.full).toBe('5555981112233');
    });

    it('mantém DDI 55 se número do RS já possui 13 dígitos (com DDI)', () => {
      const res = decomposeAndBuildPhone('', '5555981112233', '', '55');
      expect(res.ddi).toBe('55');
      expect(res.ddd).toBe('');
      expect(res.number).toBe('55981112233');
      expect(res.full).toBe('5555981112233');
    });

    it('combina coluna DDD separada e número com DDI manual 55', () => {
      const res = decomposeAndBuildPhone('11', '947260688', '', '55');
      expect(res.ddi).toBe('55');
      expect(res.ddd).toBe('11');
      expect(res.number).toBe('947260688');
      expect(res.full).toBe('5511947260688');
    });

    it('converte nome de país na coluna DDI e aplica', () => {
      const res = decomposeAndBuildPhone('', '11947260688', 'Brasil', '');
      expect(res.ddi).toBe('55');
      expect(res.ddd).toBe('');
      expect(res.number).toBe('11947260688');
      expect(res.full).toBe('5511947260688');
    });

    it('remove sufixo .0 de float e monta número com DDI 55', () => {
      const res = decomposeAndBuildPhone('', '11947260688.0', '', '55');
      expect(res.ddi).toBe('55');
      expect(res.number).toBe('11947260688');
      expect(res.full).toBe('5511947260688');
    });

    it('detecta número de Portugal (351) e não adiciona DDI 55 por padrão', () => {
      const res = decomposeAndBuildPhone('', '351932457372', '', '55');
      expect(res.isBrazilian).toBe(false);
      expect(res.country).toBe('Portugal');
      expect(res.flag).toBe('🇵🇹');
      expect(res.ddi).toBe('351');
      expect(res.number).toBe('932457372');
      expect(res.full).toBe('351932457372');
      expect(res.ddiApplied).toBe(false);
    });

    it('permite forçar DDI 55 em número internacional via forceApplyDdi=true', () => {
      const res = decomposeAndBuildPhone('', '351932457372', '', '55', true);
      expect(res.ddi).toBe('55');
      expect(res.full).toBe('55351932457372');
      expect(res.ddiApplied).toBe(true);
    });

    it('permite remover DDI 55 de número brasileiro via forceApplyDdi=false', () => {
      const res = decomposeAndBuildPhone('', '31996111818', '', '55', false);
      expect(res.ddi).toBe('');
      expect(res.number).toBe('31996111818');
      expect(res.full).toBe('31996111818');
      expect(res.ddiApplied).toBe(false);
    });
  });
});
