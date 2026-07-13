import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import Filters from './Filters';

// Mock react-icons/fi
vi.mock('react-icons/fi', () => ({
  FiSearch: () => <span data-testid="icon-search" />,
  FiTag: () => <span data-testid="icon-tag" />,
  FiChevronDown: () => <span data-testid="icon-chevron" />,
  FiX: () => <span data-testid="icon-x" />,
  FiFilter: () => <span data-testid="icon-filter" />,
  FiSliders: () => <span data-testid="icon-sliders" />,
  FiCalendar: () => <span data-testid="icon-calendar" />,
}));

// Mock sub-components
vi.mock('./FilterSelect', () => ({
  default: ({ placeholder, value, onChange }) => (
    <div data-testid={`filter-select-${placeholder}`}>
      <span>{placeholder}</span>
      <input 
        data-testid={`select-input-${placeholder}`}
        value={value || ''} 
        onChange={(e) => onChange(e.target.value)} 
      />
    </div>
  )
}));

vi.mock('./DateFilter', () => ({
  default: () => <div data-testid="date-filter-component" />
}));

const mockAvailableFilters = {
  tags: ['VIP', 'Lead', 'Customer'],
  imported_by_clients: [
    { id: 1, name: 'Admin' },
    { id: 2, name: 'Agent' }
  ]
};

describe('Filters Component', () => {
  it('renders search input and toggles advanced filters correctly', () => {
    const setSearch = vi.fn();
    
    render(
      <Filters
        search=""
        setSearch={setSearch}
        selectedTags={[]}
        setSelectedTags={vi.fn()}
        availableFilters={mockAvailableFilters}
        total={10}
      />
    );

    // Should render search input
    expect(screen.getByPlaceholderText('Buscar por nome ou telefone...')).toBeInTheDocument();

    // Advanced filters should be hidden initially
    expect(screen.queryByText('Criado por')).not.toBeInTheDocument();

    // Click on "Avançado" toggle button
    const advancedBtn = screen.getByText('Avançado');
    fireEvent.click(advancedBtn);

    // Advanced filters should now be visible
    expect(screen.getByText('Criado por')).toBeInTheDocument();
    expect(screen.getByText('Origem')).toBeInTheDocument();
    expect(screen.getByText('DDI (País)')).toBeInTheDocument();
  });
});
