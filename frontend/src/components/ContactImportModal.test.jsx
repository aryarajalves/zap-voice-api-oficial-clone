import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import ContactImportModal from './ContactImportModal';
import { useContactImport } from './ContactImportModal/hooks/useContactImport';

vi.mock('./ContactImportModal/hooks/useContactImport', () => ({
  useContactImport: vi.fn(),
}));

vi.mock('react-icons/fi', () => ({
  FiX: () => <span data-testid="icon-x" />,
  FiUpload: () => <span data-testid="icon-upload" />,
  FiCheckCircle: () => <span data-testid="icon-check-circle" />,
  FiAlertCircle: () => <span data-testid="icon-alert-circle" />,
  FiSettings: () => <span data-testid="icon-settings" />,
  FiArrowRight: () => <span data-testid="icon-arrow-right" />,
  FiArrowLeft: () => <span data-testid="icon-arrow-left" />,
  FiLoader: () => <span data-testid="icon-loader" />,
}));

const mockReset = vi.fn();
const mockOnClose = vi.fn();
const mockOnImportComplete = vi.fn();

const defaultHookReturn = {
  activeClient: { id: 1 },
  step: 2,
  setStep: vi.fn(),
  loading: false,
  previewData: {
    headers: ['Nome', 'Telefone', 'Etiquetas'],
    preview_rows: [
      ['Cliente A', '5511999999999', '["tag1", "tag2", "tag3", "tag4"]'],
      ['Cliente B', '5511888888888', '[tag-unico]'],
    ],
    total_rows: 2,
    unique_rows: 2,
  },
  mapping: {
    name: 'Nome',
    phone: 'Telefone',
    tags: 'Etiquetas',
    remove_tags: '',
  },
  setMapping: vi.fn(),
  importResult: null,
  fileInputRef: { current: null },
  importSource: 'file',
  setImportSource: vi.fn(),
  chatwootLabels: [],
  loadingLabels: false,
  selectedLabel: '',
  setSelectedLabel: vi.fn(),
  importAllTags: false,
  setImportAllTags: vi.fn(),
  customTag: '',
  setCustomTag: vi.fn(),
  handleChatwootImport: vi.fn(),
  handleFileChange: vi.fn(),
  handleExecuteImport: vi.fn(),
  reset: mockReset,
};

describe('ContactImportModal - Etiquetas render e modal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useContactImport.mockReturnValue(defaultHookReturn);
  });

  it('não renderiza se isOpen=false', () => {
    render(<ContactImportModal isOpen={false} onClose={mockOnClose} onImportComplete={mockOnImportComplete} />);
    expect(screen.queryByText('Importar Contatos')).not.toBeInTheDocument();
  });

  it('renderiza dados da prévia com aspas/colchetes removidos e no máximo 3 tags', () => {
    render(<ContactImportModal isOpen={true} onClose={mockOnClose} onImportComplete={mockOnImportComplete} />);
    
    // Tag 1, 2, 3 devem aparecer na tela como badges
    expect(screen.getByText('tag1')).toBeInTheDocument();
    expect(screen.getByText('tag2')).toBeInTheDocument();
    expect(screen.getByText('tag3')).toBeInTheDocument();
    
    // Tag 4 não deve aparecer inicialmente (somente 3 no máximo)
    expect(screen.queryByText('tag4')).not.toBeInTheDocument();

    // Deve mostrar o botão do popup (+1)
    expect(screen.getByRole('button', { name: '+1' })).toBeInTheDocument();
  });

  it('abre popup modal de todas as etiquetas ao clicar no botão +N', () => {
    render(<ContactImportModal isOpen={true} onClose={mockOnClose} onImportComplete={mockOnImportComplete} />);
    
    const plusOneBtn = screen.getByRole('button', { name: '+1' });
    fireEvent.click(plusOneBtn);

    // Deve abrir o modal de etiquetas com o título do contato
    expect(screen.getByText(/Todas as etiquetas de:/)).toBeInTheDocument();
    expect(screen.getAllByText('Cliente A')).toHaveLength(2);

    // Agora todas as etiquetas (incluindo tag4) devem estar visíveis no modal
    expect(screen.getByText('tag4')).toBeInTheDocument();

    // Fecha o modal ao clicar no botão Fechar
    const closeBtn = screen.getByRole('button', { name: 'Fechar' });
    fireEvent.click(closeBtn);

    expect(screen.queryByText(/Todas as etiquetas de:/)).not.toBeInTheDocument();
  });
});
