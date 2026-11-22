import { describe, expect, it } from 'vitest';
import { csvCell, csvLine } from './csv-row';

describe('csvCell', () => {
  it('leaves simple values unquoted', () => {
    expect(csvCell('hello')).toBe('hello');
    expect(csvCell(42)).toBe('42');
  });

  it('quotes when comma or quote or newline present', () => {
    expect(csvCell('a,b')).toBe('"a,b"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell('line1\nline2')).toBe('"line1\nline2"');
  });

  it('treats null and undefined as empty', () => {
    expect(csvCell(null)).toBe('');
    expect(csvCell(undefined)).toBe('');
  });
});

describe('csvLine', () => {
  it('joins cells with commas', () => {
    expect(csvLine(['a', 'b', 'c'])).toBe('a,b,c');
  });
});
