import { normalizeChatwootLabel } from './pages/Integrations/constants';

describe('normalizeChatwootLabel', () => {
  it('should return an empty array for null or undefined', () => {
    expect(normalizeChatwootLabel(null)).toEqual([]);
    expect(normalizeChatwootLabel(undefined)).toEqual([]);
  });

  it('should return the same string in an array if it is a simple string', () => {
    expect(normalizeChatwootLabel('label1')).toEqual(['label1']);
  });

  it('should handle JSON strings that are arrays', () => {
    expect(normalizeChatwootLabel('["label1", "label2"]')).toEqual(['label1', 'label2']);
  });

  it('should handle nested arrays', () => {
    expect(normalizeChatwootLabel([['label1'], 'label2'])).toEqual(['label1', 'label2']);
  });

  it('should deduplicate labels', () => {
    expect(normalizeChatwootLabel(['label1', 'label1', 'label2'])).toEqual(['label1', 'label2']);
  });

  it('should filter out invalid characters/strings', () => {
    expect(normalizeChatwootLabel(['[invalid]', '{alsoinvalid}', 'valid'])).toEqual(['invalid', 'valid']);
  });

  it('should handle complex corrupted JSON', () => {
    const corrupted = '["label1", "[\\"label2\\"]"]';
    expect(normalizeChatwootLabel(corrupted)).toEqual(['label1', 'label2']);
  });
});
