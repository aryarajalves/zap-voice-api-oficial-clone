import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { extractTemplateVariables, extractTemplateButtons } from './templateVariableHelpers';
import BulkSendContactsModalHeader from './BulkSendContactsModalHeader';
import ScheduleSection from './ScheduleSection';
import BulkSendContactsModalFooter from './BulkSendContactsModalFooter';

describe('BulkSendContactsModal Submodules and Helpers', () => {
  describe('templateVariableHelpers', () => {
    it('extracts media header, body variables and button dynamic urls', () => {
      const template = {
        components: [
          { type: 'HEADER', format: 'IMAGE' },
          { type: 'BODY', text: 'Olá {{1}}, seu código é {{2}}' },
          {
            type: 'BUTTONS',
            buttons: [
              { type: 'URL', url: 'https://site.com/track/{{1}}', text: 'Rastrear' },
              { type: 'QUICK_REPLY', text: 'Falar com atendente' }
            ]
          }
        ]
      };

      const vars = extractTemplateVariables(template);
      expect(vars).toHaveLength(4);
      expect(vars[0].isMedia).toBe(true);
      expect(vars[0].key).toBe('HEADER_0');
      expect(vars[1].key).toBe('BODY_0');
      expect(vars[2].key).toBe('BODY_1');
      expect(vars[3].key).toBe('BUTTONS_0');

      const buttons = extractTemplateButtons(template);
      expect(buttons).toHaveLength(1);
      expect(buttons[0].text).toBe('Falar com atendente');
    });

    it('returns empty array when template has no components', () => {
      expect(extractTemplateVariables(null)).toEqual([]);
      expect(extractTemplateButtons(null)).toEqual([]);
    });
  });

  describe('BulkSendContactsModalHeader', () => {
    it('renders count and fires onClose', () => {
      const handleClose = vi.fn();
      render(<BulkSendContactsModalHeader selectedCount={42} onClose={handleClose} />);
      expect(screen.getByText('Disparo em Massa')).toBeInTheDocument();
      expect(screen.getByText('Disparando para 42 contatos selecionados')).toBeInTheDocument();

      const closeBtn = screen.getByTitle('Fechar modal');
      fireEvent.click(closeBtn);
      expect(handleClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('ScheduleSection', () => {
    it('toggles schedule checkbox and shows datetime input', () => {
      const setSchedule = vi.fn();
      const setTime = vi.fn();
      const { rerender } = render(
        <ScheduleSection
          isScheduleEnabled={false}
          setIsScheduleEnabled={setSchedule}
          scheduledTime=""
          setScheduledTime={setTime}
        />
      );

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox.checked).toBe(false);
      fireEvent.click(checkbox);
      expect(setSchedule).toHaveBeenCalledWith(true);

      rerender(
        <ScheduleSection
          isScheduleEnabled={true}
          setIsScheduleEnabled={setSchedule}
          scheduledTime="2026-10-01T10:00"
          setScheduledTime={setTime}
        />
      );

      expect(screen.getByText('Data e Hora do Disparo')).toBeInTheDocument();
    });
  });

  describe('BulkSendContactsModalFooter', () => {
    it('disables submit button when sending or no template', () => {
      const handleSend = vi.fn();
      const handleClose = vi.fn();

      render(
        <BulkSendContactsModalFooter
          onClose={handleClose}
          handleSend={handleSend}
          isSending={false}
          selectedTemplate={null}
          isScheduleEnabled={false}
        />
      );

      const sendBtn = screen.getByRole('button', { name: 'Enviar Disparo' });
      expect(sendBtn).toBeDisabled();
    });
  });
});
