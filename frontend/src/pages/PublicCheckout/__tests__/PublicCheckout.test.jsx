import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import PublicCheckoutHeader from '../components/PublicCheckoutHeader';
import PublicCheckoutForm from '../components/PublicCheckoutForm';
import DdiDropdown from '../components/DdiDropdown';
import { sanitizePhoneNumber } from '../constants/ddiOptions';

describe('PublicCheckout Components and Utils', () => {
  describe('sanitizePhoneNumber', () => {
    it('remove formatações não numéricas', () => {
      expect(sanitizePhoneNumber('(85) 99999-8888', '+55')).toBe('85999998888');
    });

    it('remove prefixo DDI repetido se passado com mais de 11 dígitos', () => {
      expect(sanitizePhoneNumber('5585999998888', '+55')).toBe('85999998888');
    });
  });

  describe('PublicCheckoutHeader', () => {
    it('renderiza o título e o badge', () => {
      render(
        <PublicCheckoutHeader
          pageConfig={{
            title: 'Masterclass Exclusiva',
            badge_text: 'Vagas Abertas',
            description: 'Garanta sua vaga no evento.'
          }}
        />
      );

      expect(screen.getByText('Masterclass Exclusiva')).toBeDefined();
      expect(screen.getByText('Vagas Abertas')).toBeDefined();
      expect(screen.getByText('Garanta sua vaga no evento.')).toBeDefined();
    });
  });

  describe('DdiDropdown', () => {
    it('renderiza com o DDI padrão', () => {
      render(
        <DdiDropdown
          ddi="+55"
          setDdi={vi.fn()}
          setPhone={vi.fn()}
        />
      );

      expect(screen.getByText('+55')).toBeDefined();
    });
  });

  describe('PublicCheckoutForm', () => {
    it('renderiza os campos de entrada e botão de submissão', () => {
      const handleSubmit = vi.fn((e) => e.preventDefault());

      render(
        <PublicCheckoutForm
          pageConfig={{ button_text: 'Avançar Agora' }}
          name="João Silva"
          setName={vi.fn()}
          email="joao@teste.com"
          setEmail={vi.fn()}
          ddi="+55"
          setDdi={vi.fn()}
          phone="85999998888"
          setPhone={vi.fn()}
          submitting={false}
          onSubmit={handleSubmit}
        />
      );

      expect(screen.getByPlaceholderText('Seu nome completo')).toBeDefined();
      expect(screen.getByPlaceholderText('seu@email.com')).toBeDefined();
      expect(screen.getByPlaceholderText('85 99999-9999')).toBeDefined();
      expect(screen.getByText('Avançar Agora')).toBeDefined();
    });
  });
});
