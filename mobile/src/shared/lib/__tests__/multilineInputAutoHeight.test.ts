import { quantizeMultilineInputHeight } from '../multilineInputAutoHeight';

describe('quantizeMultilineInputHeight', () => {
  it('enforces minHeight', () => {
    expect(quantizeMultilineInputHeight(10, 120)).toBe(120);
  });

  it('rounds up to the quantum', () => {
    expect(quantizeMultilineInputHeight(9073, 120, 28)).toBe(9100);
    expect(quantizeMultilineInputHeight(9072, 120, 28)).toBe(9072);
  });

  it('uses 16px quantum by default', () => {
    expect(quantizeMultilineInputHeight(45, 44)).toBe(48);
  });
});
