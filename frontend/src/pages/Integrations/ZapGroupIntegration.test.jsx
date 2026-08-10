import { describe, it, expect } from 'vitest';
import { EVENT_TYPES, PLATFORM_EVENT_TYPES } from './constants';

describe('ZapGroup Integration Constants', () => {
  it('should include lead_extraido in EVENT_TYPES', () => {
    const leadExtraidoEvent = EVENT_TYPES.find(e => e.value === 'lead_extraido');
    expect(leadExtraidoEvent).toBeDefined();
    expect(leadExtraidoEvent?.label).toContain('ZapGroup');
  });

  it('should define allowed event types for zapgroup platform', () => {
    expect(PLATFORM_EVENT_TYPES.zapgroup).toBeDefined();
    expect(PLATFORM_EVENT_TYPES.zapgroup).toContain('lead_extraido');
    expect(PLATFORM_EVENT_TYPES.zapgroup).toContain('compra_aprovada');
    expect(PLATFORM_EVENT_TYPES.zapgroup).toContain('outros');
  });
});
