import { describe, it, expect } from 'vitest';
import { EVENT_TYPES, PLATFORM_EVENT_TYPES, BODY_VAR_OPTIONS } from './constants';
import { PLATFORM_OPTIONS } from './components/IntegrationFormModal/constants';
import { EVENT_HINTS } from './components/MappingsConfig/MappingItem/eventHints';

describe('YayForms Integration Constants and Platform Configuration', () => {
  it('should include YayForms in PLATFORM_OPTIONS with proper label', () => {
    const platform = PLATFORM_OPTIONS.find(p => p.value === 'yayforms');
    expect(platform).toBeDefined();
    expect(platform?.label).toBe('YayForms');
  });

  it('should include formulario in EVENT_TYPES', () => {
    const formEvent = EVENT_TYPES.find(e => e.value === 'formulario');
    expect(formEvent).toBeDefined();
    expect(formEvent?.label).toBe('Formulário');
  });

  it('should define allowed event types for yayforms platform', () => {
    expect(PLATFORM_EVENT_TYPES.yayforms).toBeDefined();
    expect(PLATFORM_EVENT_TYPES.yayforms).toContain('formulario');
    expect(PLATFORM_EVENT_TYPES.yayforms).toContain('form_submission');
    expect(PLATFORM_EVENT_TYPES.yayforms).toContain('outros');
  });

  it('should include YayForms variables in BODY_VAR_OPTIONS', () => {
    const varKeys = BODY_VAR_OPTIONS.map(v => v.value);
    expect(varKeys).toContain('form_id');
    expect(varKeys).toContain('response_id');
    expect(varKeys).toContain('investimento');
  });

  it('should define descriptive hint for formulario event', () => {
    expect(EVENT_HINTS.formulario).toBeDefined();
    expect(EVENT_HINTS.formulario).toContain('YayForms');
    expect(EVENT_HINTS.formulario).toContain('formulário');
  });
});
