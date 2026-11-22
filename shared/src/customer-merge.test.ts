import { describe, expect, it } from 'vitest';
import {
  buildInstantUnambiguousMergePayload,
  customersEligibleForInstantUnambiguousMerge,
  mergeGroupMatchesQuickFilter,
  mergeReasonsForSimpleBadges,
  mergeSimpleBadgeLabel,
  type CustomerMergeSuggestionGroup,
  type MergeMatchReason,
} from './customer-merge';
import type { CustomerWithStats } from './customer';

describe('mergeReasonsForSimpleBadges', () => {
  it('expands composites into separate phone / email / name chips', () => {
    const reasons: MergeMatchReason[] = ['phone_email', 'name_collated'];
    expect(mergeReasonsForSimpleBadges(reasons)).toEqual(['phone', 'email', 'name']);
  });

  it('maps fuzzy / contains / similar to one similar-name badge', () => {
    expect(mergeReasonsForSimpleBadges(['name_fuzzy'])).toEqual(['similar_name']);
    expect(mergeReasonsForSimpleBadges(['name_contains'])).toEqual(['similar_name']);
    expect(mergeReasonsForSimpleBadges(['name_similar'])).toEqual(['similar_name']);
  });

  it('dedupes dimensions from phone + name composite', () => {
    expect(mergeReasonsForSimpleBadges(['phone_name'])).toEqual(['phone', 'name']);
  });

  it('maps manual selection to a manual badge', () => {
    expect(mergeReasonsForSimpleBadges(['manual'])).toEqual(['manual']);
  });
});

describe('mergeGroupMatchesQuickFilter', () => {
  it('matches phone groups via phone_email composite', () => {
    const group = {
      reasons: ['phone_email'] as MergeMatchReason[],
      keys: [],
      customers: [],
      confidenceScore: 90,
    } satisfies CustomerMergeSuggestionGroup;
    expect(mergeGroupMatchesQuickFilter(group, 'phone')).toBe(true);
    expect(mergeGroupMatchesQuickFilter(group, 'email')).toBe(true);
    expect(mergeGroupMatchesQuickFilter(group, 'name')).toBe(false);
  });

  it('matches triple when phone, email, and name badges all apply', () => {
    const group = {
      reasons: ['phone_email', 'name_collated'] as MergeMatchReason[],
      keys: [],
      customers: [],
      confidenceScore: 95,
    } satisfies CustomerMergeSuggestionGroup;
    expect(mergeGroupMatchesQuickFilter(group, 'triple')).toBe(true);
  });

  it('does not match triple without name signal', () => {
    const group = {
      reasons: ['phone_email'] as MergeMatchReason[],
      keys: [],
      customers: [],
      confidenceScore: 90,
    } satisfies CustomerMergeSuggestionGroup;
    expect(mergeGroupMatchesQuickFilter(group, 'triple')).toBe(false);
  });

  it('matches triple for phone+name when every profile has no email', () => {
    const group = {
      reasons: ['phone_name'] as MergeMatchReason[],
      keys: [],
      customers: [
        {
          _id: '1',
          name: 'Jane Doe',
          email: '',
          phone: '+15551234567',
          appointmentCount: 1,
          bookingRequestCount: 0,
        },
        {
          _id: '2',
          name: 'jane doe',
          email: '  ',
          phone: '(555) 123-4567',
          appointmentCount: 0,
          bookingRequestCount: 0,
        },
      ],
      confidenceScore: 90,
    } satisfies CustomerMergeSuggestionGroup;
    expect(mergeGroupMatchesQuickFilter(group, 'triple')).toBe(true);
  });

  it('does not treat phone+name as triple when any profile has an email', () => {
    const group = {
      reasons: ['phone_name'] as MergeMatchReason[],
      keys: [],
      customers: [
        {
          _id: '1',
          name: 'Jane Doe',
          email: '',
          phone: '+15551234567',
          appointmentCount: 0,
          bookingRequestCount: 0,
        },
        {
          _id: '2',
          name: 'Jane Doe',
          email: 'j@example.com',
          phone: '+15551234567',
          appointmentCount: 0,
          bookingRequestCount: 0,
        },
      ],
      confidenceScore: 90,
    } satisfies CustomerMergeSuggestionGroup;
    expect(mergeGroupMatchesQuickFilter(group, 'triple')).toBe(false);
  });

  it('matches triple for email+name when every profile has no phone', () => {
    const group = {
      reasons: ['email_name'] as MergeMatchReason[],
      keys: [],
      customers: [
        {
          _id: '1',
          name: 'Pat Lee',
          email: 'pat@example.com',
          phone: '',
          appointmentCount: 0,
          bookingRequestCount: 0,
        },
        {
          _id: '2',
          name: 'pat lee',
          email: 'pat@example.com',
          phone: undefined,
          appointmentCount: 0,
          bookingRequestCount: 0,
        },
      ],
      confidenceScore: 88,
    } satisfies CustomerMergeSuggestionGroup;
    expect(mergeGroupMatchesQuickFilter(group, 'triple')).toBe(true);
  });
});

describe('mergeSimpleBadgeLabel', () => {
  it('uses short copy', () => {
    expect(mergeSimpleBadgeLabel('phone')).toBe('Same phone');
    expect(mergeSimpleBadgeLabel('email')).toBe('Same email');
    expect(mergeSimpleBadgeLabel('name')).toBe('Same name');
    expect(mergeSimpleBadgeLabel('similar_name')).toBe('Similar name');
    expect(mergeSimpleBadgeLabel('manual')).toBe('Manual selection');
  });
});

const baseStats = { appointmentCount: 0, bookingRequestCount: 0 } as const;

function row(
  overrides: Partial<CustomerWithStats> & Pick<CustomerWithStats, '_id'>
): CustomerWithStats {
  return { ...baseStats, name: 'Test', email: '', phone: '', ...overrides };
}

describe('customersEligibleForInstantUnambiguousMerge', () => {
  const reasons: MergeMatchReason[] = ['phone_name'];

  it('is true when name, phone, and email match case-insensitively; empty phone/email allowed', () => {
    const customers: CustomerWithStats[] = [
      row({ _id: '1', name: 'Jane Doe', email: '', phone: '' }),
      row({ _id: '2', name: 'jane  doe', email: '  ', phone: undefined }),
    ];
    expect(customersEligibleForInstantUnambiguousMerge(customers, reasons)).toBe(true);
  });

  it('is true when same contacts with different casing / formatting', () => {
    const customers: CustomerWithStats[] = [
      row({ _id: '1', name: 'Jane Doe', email: 'Pat@EXAMPLE.com', phone: '(555) 123-4567' }),
      row({ _id: '2', name: 'jane doe', email: 'pat@example.com', phone: '+1 555 123 4567' }),
    ];
    expect(customersEligibleForInstantUnambiguousMerge(customers, reasons)).toBe(true);
  });

  it('is false when names match but phones differ', () => {
    const customers: CustomerWithStats[] = [
      row({ _id: '1', name: 'Jane Doe', phone: '+15551230001', email: '' }),
      row({ _id: '2', name: 'jane doe', phone: '+15551230002', email: '' }),
    ];
    expect(customersEligibleForInstantUnambiguousMerge(customers, reasons)).toBe(false);
  });

  it('is false when one row has a phone and the other does not', () => {
    const customers: CustomerWithStats[] = [
      row({ _id: '1', name: 'Jane Doe', phone: '+15551230001', email: '' }),
      row({ _id: '2', name: 'jane doe', phone: '', email: '' }),
    ];
    expect(customersEligibleForInstantUnambiguousMerge(customers, reasons)).toBe(false);
  });

  it('is false for manual reasons', () => {
    const customers: CustomerWithStats[] = [
      row({ _id: '1', name: 'A', email: 'a@b.co', phone: '' }),
      row({ _id: '2', name: 'a', email: 'a@b.co', phone: '' }),
    ];
    expect(customersEligibleForInstantUnambiguousMerge(customers, ['manual'])).toBe(false);
  });
});

describe('buildInstantUnambiguousMergePayload', () => {
  it('uppercases name and lowercases email', () => {
    const customers: CustomerWithStats[] = [
      row({
        _id: '1',
        name: 'Jane Doe',
        email: 'Pat@EXAMPLE.com',
        phone: '(555) 123-4567',
        appointmentCount: 2,
      }),
      row({
        _id: '2',
        name: 'jane doe',
        email: 'pat@example.com',
        phone: '+15551234567',
        appointmentCount: 0,
      }),
    ];
    const payload = buildInstantUnambiguousMergePayload(customers, ['phone_email']);
    expect(payload).toEqual({
      keepCustomerId: '1',
      mergeCustomerIds: ['2'],
      profile: {
        name: 'JANE DOE',
        email: 'pat@example.com',
        phone: '(555) 123-4567',
      },
    });
  });
});
