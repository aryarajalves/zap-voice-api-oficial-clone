import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import VariablesSection from './VariablesSection';

// Mocks
vi.mock('../SearchableSelect', () => ({
  default: ({ placeholder }) => <div data-testid="mock-searchable-select">{placeholder}</div>
}));

vi.mock('react-icons/fi', () => ({
  FiZap: () => <span data-testid="icon-zap" />,
  FiPlus: () => <span data-testid="icon-plus" />,
  FiTrash2: () => <span data-testid="icon-trash" />,
}));

const defaultProps = {
  mapping: {
    template_id: 'tpl-1',
    variables_mapping: []
  },
  mIndex: 0,
  updateMapping: vi.fn(),
  updateVariable: vi.fn(),
  addVariable: vi.fn(),
  removeVariable: vi.fn(),
  templateVars: [],
  customFieldsMapping: {},
  templates: [
    {
      id: 'tpl-1',
      name: 'Test Template',
      components: [
        { type: 'BODY', text: 'Olá!' }
      ]
    }
  ]
};

describe('VariablesSection Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve ocultar a seção Variáveis Adicionais / Cabeçalho se o template não exigir variáveis, mídias ou botões dinâmicos', () => {
    render(<VariablesSection {...defaultProps} />);
    expect(screen.queryByText(/Variáveis Adicionais \/ Cabeçalho/i)).not.toBeInTheDocument();
  });

  it('deve exibir a seção se o template possuir variáveis detectadas', () => {
    const props = {
      ...defaultProps,
      templateVars: [{ key: '1', type: 'body', label: 'Corpo {{1}}' }]
    };
    render(<VariablesSection {...props} />);
    expect(screen.getByText(/Variáveis Adicionais \/ Cabeçalho/i)).toBeInTheDocument();
  });

  it('deve exibir a seção se o template possuir mídia no cabeçalho (IMAGE)', () => {
    const templatesWithMedia = [
      {
        id: 'tpl-1',
        name: 'Test Template',
        components: [
          { type: 'HEADER', format: 'IMAGE' },
          { type: 'BODY', text: 'Olá!' }
        ]
      }
    ];
    const props = {
      ...defaultProps,
      templates: templatesWithMedia
    };
    render(<VariablesSection {...props} />);
    expect(screen.getByText(/Variáveis Adicionais \/ Cabeçalho/i)).toBeInTheDocument();
  });

  it('deve exibir a seção se o template possuir botões dinâmicos (com {{}} na URL)', () => {
    const templatesWithButtons = [
      {
        id: 'tpl-1',
        name: 'Test Template',
        components: [
          { 
            type: 'BUTTONS', 
            buttons: [
              { type: 'URL', text: 'Clique aqui', url: 'https://site.com/{{1}}' }
            ]
          },
          { type: 'BODY', text: 'Olá!' }
        ]
      }
    ];
    const props = {
      ...defaultProps,
      templates: templatesWithButtons
    };
    render(<VariablesSection {...props} />);
    expect(screen.getByText(/Variáveis Adicionais \/ Cabeçalho/i)).toBeInTheDocument();
  });

  it('deve exibir a seção se já houver variáveis manuais configuradas no mapeamento', () => {
    const props = {
      ...defaultProps,
      mapping: {
        template_id: 'tpl-1',
        variables_mapping: [
          { key: 'minha_var_manual', type: 'body', value: 'name' }
        ]
      }
    };
    render(<VariablesSection {...props} />);
    expect(screen.getByText(/Variáveis Adicionais \/ Cabeçalho/i)).toBeInTheDocument();
  });
});
