import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import FinancialFilterBar from '../components/FinancialFilterBar';

describe('Modularização de FinancialFilterBar', () => {
  const defaultProps = {
    period: 'monthly',
    setPeriod: vi.fn(),
    startDate: '',
    setStartDate: vi.fn(),
    endDate: '',
    setEndDate: vi.fn(),
    selectedLabels: [],
    setSelectedLabels: vi.fn(),
    allLabels: ['Lead Quente', 'Cliente VIP'],
    platforms: [],
    setPlatforms: vi.fn(),
    statuses: [],
    setStatuses: vi.fn(),
    selectedProducts: [],
    setSelectedProducts: vi.fn(),
    allProducts: ['Curso ZapVoice', 'Mentoria Escala'],
    paymentMethod: 'all',
    setPaymentMethod: vi.fn(),
    onResetTxPage: vi.fn(),
  };

  it('deve renderizar opções de período e permitir selecionar período', () => {
    render(<FinancialFilterBar {...defaultProps} />);

    expect(screen.getByText('Por Dia')).toBeDefined();
    expect(screen.getByText('Por Semana')).toBeDefined();
    expect(screen.getByText('Por Mês')).toBeDefined();
    expect(screen.getByText('Por Ano')).toBeDefined();

    fireEvent.click(screen.getByText('Por Dia'));
    expect(defaultProps.setPeriod).toHaveBeenCalledWith('daily');
    expect(defaultProps.setStartDate).toHaveBeenCalledWith('');
    expect(defaultProps.setEndDate).toHaveBeenCalledWith('');
  });

  it('deve exibir botão limpar quando datas estiverem preenchidas', () => {
    render(<FinancialFilterBar {...defaultProps} startDate="2026-09-01" endDate="2026-09-10" />);

    const clearButton = screen.getByText('Limpar');
    expect(clearButton).toBeDefined();

    fireEvent.click(clearButton);
    expect(defaultProps.setStartDate).toHaveBeenCalledWith('');
    expect(defaultProps.setEndDate).toHaveBeenCalledWith('');
  });

  it('deve abrir e interagir com o dropdown de etiquetas', () => {
    render(<FinancialFilterBar {...defaultProps} />);

    const button = screen.getByText('Todas as Etiquetas');
    fireEvent.click(button);

    expect(screen.getByText('Lead Quente')).toBeDefined();
    expect(screen.getByText('Cliente VIP')).toBeDefined();

    fireEvent.click(screen.getByText('Lead Quente'));
    expect(defaultProps.setSelectedLabels).toHaveBeenCalled();
  });

  it('deve abrir e interagir com o dropdown de plataformas e exibir badge removível', () => {
    render(<FinancialFilterBar {...defaultProps} platforms={['kiwify']} />);

    const kiwifyElements = screen.getAllByText('Kiwify');
    expect(kiwifyElements.length).toBeGreaterThan(0);
    const removeBadge = screen.getByText('×');
    fireEvent.click(removeBadge);
    expect(defaultProps.setPlatforms).toHaveBeenCalled();
  });

  it('deve abrir e interagir com o dropdown de produtos', () => {
    render(<FinancialFilterBar {...defaultProps} />);

    const productDropdownBtn = screen.getByText('Todos os Produtos');
    fireEvent.click(productDropdownBtn);

    expect(screen.getByText('Curso ZapVoice')).toBeDefined();
    fireEvent.click(screen.getByText('Curso ZapVoice'));
    expect(defaultProps.setSelectedProducts).toHaveBeenCalled();
  });

  it('deve alternar forma de pagamento e resetar página', () => {
    render(<FinancialFilterBar {...defaultProps} />);

    const pixButton = screen.getByText('Pix');
    fireEvent.click(pixButton);

    expect(defaultProps.setPaymentMethod).toHaveBeenCalledWith('pix');
    expect(defaultProps.onResetTxPage).toHaveBeenCalled();
  });
});
