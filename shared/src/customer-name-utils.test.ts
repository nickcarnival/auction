import { describe, expect, it } from 'vitest';
import {
  customerDisplayNamesOneContainsTheOther,
  customerDisplayNamesProbablyTypoVariant,
  customerDisplayNamesSimilarForMerge,
  customerDisplayNamesSimpleMatch,
  normalizeCustomerNameForLookup,
  normalizeCustomerNameForMatch,
  normalizeCustomerNameSortedTokens,
  normalizeCustomerNameWhileTyping,
} from './customer-name-utils';

describe('normalizeCustomerNameWhileTyping', () => {
  it('uppercases and collapses spaces but keeps trailing space while typing', () => {
    expect(normalizeCustomerNameWhileTyping('jo hn ')).toBe('JO HN ');
  });
});

describe('normalizeCustomerNameForMatch', () => {
  it('matches normalizeCustomerNameForLookup output when name is long enough', () => {
    expect(normalizeCustomerNameForMatch('  Testing\t Things  ')).toBe('TESTING THINGS');
    expect(normalizeCustomerNameForLookup('  Testing\t Things  ')).toBe('TESTING THINGS');
  });

  it('allows short names (unlike normalizeCustomerNameForLookup)', () => {
    expect(normalizeCustomerNameForMatch(' Ab ')).toBe('AB');
    expect(normalizeCustomerNameForLookup(' Ab ')).toBeNull();
  });
});

describe('normalizeCustomerNameForLookup', () => {
  it('returns null for empty or short names', () => {
    expect(normalizeCustomerNameForLookup(null)).toBeNull();
    expect(normalizeCustomerNameForLookup('')).toBeNull();
    expect(normalizeCustomerNameForLookup('  Ab  ')).toBeNull();
  });

  it('trims, uppercases, and collapses spaces', () => {
    expect(normalizeCustomerNameForLookup('  Testing\t Things  ')).toBe('TESTING THINGS');
  });
});

describe('normalizeCustomerNameSortedTokens', () => {
  it('aligns word order and punctuation', () => {
    expect(normalizeCustomerNameSortedTokens('Smith, John')).toBe('JOHN SMITH');
    expect(normalizeCustomerNameSortedTokens('John Smith')).toBe('JOHN SMITH');
    expect(normalizeCustomerNameSortedTokens('john  smith!')).toBe('JOHN SMITH');
  });
});

describe('customerDisplayNamesOneContainsTheOther', () => {
  it('true when a full compact name is inside a longer one', () => {
    expect(customerDisplayNamesOneContainsTheOther('Testing', 'Testing Things 2')).toBe(true);
    expect(customerDisplayNamesOneContainsTheOther('Testing Things 2', 'Testing')).toBe(true);
    expect(customerDisplayNamesOneContainsTheOther('TEST', 'Testing Things')).toBe(true);
  });

  it('false for unrelated names', () => {
    expect(customerDisplayNamesOneContainsTheOther('Alice', 'Bob Smith')).toBe(false);
  });
});

describe('customerDisplayNamesProbablyTypoVariant', () => {
  it('detects likely typos for comparable lengths', () => {
    expect(customerDisplayNamesProbablyTypoVariant('John Smith', 'Jon Smith')).toBe(true);
    expect(customerDisplayNamesProbablyTypoVariant('Testing Things', 'Testing Thing')).toBe(true);
  });

  it('rejects different people', () => {
    expect(customerDisplayNamesProbablyTypoVariant('Alice Johnson', 'Bob Johnson')).toBe(false);
  });
});

describe('customerDisplayNamesSimpleMatch', () => {
  it('test ↔ testing (any casing) and TeStT ↔ test', () => {
    expect(customerDisplayNamesSimpleMatch('test', 'testing')).toBe(true);
    expect(customerDisplayNamesSimpleMatch('Test', 'testing')).toBe(true);
    expect(customerDisplayNamesSimpleMatch('TEST', 'Testing')).toBe(true);
    expect(customerDisplayNamesSimpleMatch('TeStT', 'test')).toBe(true);
    expect(customerDisplayNamesSimpleMatch('test', 'TeStT')).toBe(true);
  });

  it('test ↔ testing, notest; spaced t e s t; phrase Bob Marley; 1 test 2', () => {
    expect(customerDisplayNamesSimpleMatch('test', 'testing')).toBe(true);
    expect(customerDisplayNamesSimpleMatch('test', 'notest')).toBe(true);
    expect(customerDisplayNamesSimpleMatch('test', 't e s t')).toBe(true);
    expect(
      customerDisplayNamesSimpleMatch('Bob Marley', 'Bob Marley eod eod eod')
    ).toBe(true);
    expect(customerDisplayNamesSimpleMatch('test', '1 test 2')).toBe(true);
  });

  it('no test does not match test or testing; test does not match t12est', () => {
    expect(customerDisplayNamesSimpleMatch('no test', 'test')).toBe(false);
    expect(customerDisplayNamesSimpleMatch('test', 'no test')).toBe(false);
    expect(customerDisplayNamesSimpleMatch('no test', 'testing')).toBe(false);
    expect(customerDisplayNamesSimpleMatch('test', 't12est')).toBe(false);
    expect(customerDisplayNamesSimpleMatch('t12est', 'test')).toBe(false);
  });

  it('1 test 2 matches testing via guarded token', () => {
    expect(customerDisplayNamesSimpleMatch('1 test 2', 'testing')).toBe(true);
    expect(customerDisplayNamesSimpleMatch('testing', '1 test 2')).toBe(true);
  });

  it('testing ↔ customer is still false', () => {
    expect(customerDisplayNamesSimpleMatch('testing', 'customer')).toBe(false);
  });

  it('multi-word: fuzzy on same slot only (Test Customer ↔ Testing Customer)', () => {
    expect(customerDisplayNamesSimpleMatch('Test Customer', 'Testing Customer')).toBe(true);
    expect(customerDisplayNamesSimpleMatch('TeStT Smith', 'test smith')).toBe(true);
    expect(customerDisplayNamesSimpleMatch('Alice Zork', 'Alice Zorx')).toBe(false);
  });
});

describe('customerDisplayNamesSimilarForMerge', () => {
  const clusterSamples = ['1 test 2', 'test', 'testing', 'notest'];

  it('treats sample cluster pairwise as similar', () => {
    for (let i = 0; i < clusterSamples.length; i++) {
      for (let j = i + 1; j < clusterSamples.length; j++) {
        expect(customerDisplayNamesSimilarForMerge(clusterSamples[i], clusterSamples[j])).toBe(
          true
        );
      }
    }
  });

  it('rejects unrelated names', () => {
    expect(customerDisplayNamesSimilarForMerge('Alice Zork', 'Bob Qvist')).toBe(false);
    expect(customerDisplayNamesSimilarForMerge('testing', 'customer')).toBe(false);
  });
});
