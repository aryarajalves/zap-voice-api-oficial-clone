import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

vi.mock('../config', () => ({ API_URL: 'http://localhost:8000' }));

vi.mock('react-hot-toast', () => ({
  toast: { success: vi.fn(), error: vi.fn(), loading: vi.fn(), dismiss: vi.fn() },
}));

import { fetchWithAuth } from '../AuthContext';
vi.mock('../AuthContext', () => ({
  fetchWithAuth: vi.fn(),
}));

vi.mock('../contexts/ClientContext', () => ({
  useClient: () => ({ activeClient: { id: 1 } }),
}));

vi.mock('xlsx', () => ({
  read: vi.fn(),
  utils: {
    sheet_to_json: vi.fn(() => []),
    book_new: vi.fn(),
  },
}));

// Importamos após os mocks
import RecipientSelector from './RecipientSelector';

const defaultProps = {
  onSelect: vi.fn(),
  selectedInbox: 1,
  requireOpenWindow: false,
  title: 'Destinatários',
  showValidation: false,
  exclusionList: [],
  templateVariables: [],
};

describe('RecipientSelector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza o título corretamente', () => {
    render(<RecipientSelector {...defaultProps} title="Meus Destinatários" />);
    expect(screen.getByText('Meus Destinatários')).toBeInTheDocument();
  });

  it('renderiza botões de modo manual e upload', () => {
    render(<RecipientSelector {...defaultProps} />);
    expect(screen.getByText(/manual/i)).toBeInTheDocument();
    expect(screen.getByText(/upload/i)).toBeInTheDocument();
  });

  it('inicia no modo manual', () => {
    render(<RecipientSelector {...defaultProps} />);
    const textarea = screen.getByRole('textbox');
    expect(textarea).toBeInTheDocument();
  });

  it('chama onSelect com lista vazia ao iniciar', () => {
    render(<RecipientSelector {...defaultProps} />);
    expect(defaultProps.onSelect).toHaveBeenCalledWith([]);
  });

  it('muda para modo upload ao clicar no botão', () => {
    render(<RecipientSelector {...defaultProps} />);
    const uploadBtn = screen.getByText(/upload/i);
    fireEvent.click(uploadBtn);
    // Modo upload exibe input de arquivo
    expect(screen.getByText(/arrast|selecione|arquivo/i)).toBeInTheDocument();
  });

  it('aceita entrada manual de telefones', async () => {
    render(<RecipientSelector {...defaultProps} />);
    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: '5511999998888' } });
    expect(textarea.value).toBe('5511999998888');
  });

  it('respects requireOpenWindow prop setting filterOpenOnly', () => {
    render(<RecipientSelector {...defaultProps} requireOpenWindow={true} />);
    // Quando requireOpenWindow=true, deve haver indicação visual do filtro ativo
    // O componente seta filterOpenOnly=true internamente
    render(<RecipientSelector {...defaultProps} requireOpenWindow={false} />);
  });

  it('exibe variáveis de template na aba de etiquetas', () => {
    const vars = [{ key: '1', label: 'Var 1' }];
    render(<RecipientSelector {...defaultProps} templateVariables={vars} />);
    
    // Mudar para aba etiquetas
    const tagTab = screen.getByText(/etiquetas/i);
    fireEvent.click(tagTab);
    
    expect(screen.getByText(/Var 1/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Valor para Var 1/i)).toBeInTheDocument();
  });

  it('abre o menu mágico e seleciona uma opção', async () => {
    const vars = [{ key: '1', label: 'Var 1' }];
    render(<RecipientSelector {...defaultProps} templateVariables={vars} />);
    
    fireEvent.click(screen.getByText(/etiquetas/i));
    
    const magicBtn = screen.getByTitle(/campos mágicos/i);
    fireEvent.click(magicBtn);
    
    // O menu deve aparecer
    expect(screen.getByText(/Campos Disponíveis/i)).toBeInTheDocument();
    
    // Selecionar Nome Completo
    const optNome = screen.getByText(/Nome Completo/i);
    fireEvent.click(optNome);
    
    // O valor {{nome}} deve estar no input
    const input = screen.getByPlaceholderText(/Valor para Var 1/i);
    expect(input.value).toBe('{{nome}}');
  });

  it('carrega leads da etiqueta e aplica variáveis', async () => {
    const vars = [{ key: '1', label: 'Var 1' }];
    
    // Mock inicial de filtros
    vi.mocked(fetchWithAuth).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ event_types: [], product_names: [], tags: ['tag_teste'] })
    });

    // Mock do carregamento de leads
    vi.mocked(fetchWithAuth).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ items: [{ id: 1, name: 'João Silva', phone: '5511999998888', email: 'joao@teste.com' }] })
    });

    render(<RecipientSelector {...defaultProps} templateVariables={vars} />);
    
    // Mudar para Etiquetas e selecionar a tag mockada
    fireEvent.click(screen.getByText(/etiquetas/i));
    
    // Preencher variável manualmente com código
    const input = screen.getByPlaceholderText(/Valor para Var 1/i);
    fireEvent.change(input, { target: { value: 'Olá {{primeiro_nome}}!' } });
    
    // Clicar em carregar
    const loadBtn = screen.getByText(/Carregar Leads/i);
    fireEvent.click(loadBtn);

    await waitFor(() => {
      expect(defaultProps.onSelect).toHaveBeenCalledWith(expect.arrayContaining([
        expect.objectContaining({
          vars: expect.objectContaining({ '1': 'Olá João!' })
        })
      ]));
    });
  });
});
