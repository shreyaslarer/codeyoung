import { describe, it, expect } from 'vitest';
import { validateParentInput } from '@/lib/validation';

describe('Frontend Form Validation & Input Boundaries', () => {

  it('should accept valid parent name and email', () => {
    const result = validateParentInput('Alex Johnson', 'alex@example.com');
    expect(result.isValid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('should reject whitespace-only parent names', () => {
    const result = validateParentInput('   ', 'alex@example.com');
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('at least 2 characters');
  });

  it('should reject single-character parent names', () => {
    const result = validateParentInput('A', 'alex@example.com');
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('at least 2 characters');
  });

  it('should reject invalid email formats', () => {
    expect(validateParentInput('Alex Johnson', 'invalid-email').isValid).toBe(false);
    expect(validateParentInput('Alex Johnson', 'alex@').isValid).toBe(false);
    expect(validateParentInput('Alex Johnson', '@domain.com').isValid).toBe(false);
    expect(validateParentInput('Alex Johnson', 'alex@domain').isValid).toBe(false);
  });
});
