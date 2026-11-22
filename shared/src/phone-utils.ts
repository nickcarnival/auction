export const formatPhone = (inputPhone?: string | null): string => {
  if (!inputPhone) return '';

  const numbers = inputPhone.replace(/\D/g, '');

  // Format the number as XXX-XXX-XXXX
  if (numbers.length <= 3) {
    return numbers;
  } else if (numbers.length <= 6) {
    return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
  } else {
    return `${numbers.slice(0, 3)}-${numbers.slice(3, 6)}-${numbers.slice(6, 10)}`;
  }
};

/**
 * Digits-only key for matching customers within a tenant (dedupe).
 * Strips non-digits; for 11-digit NANP numbers starting with 1, uses the last 10 digits.
 */
export function normalizePhoneForLookup(phone: string | null | undefined): string | null {
  if (phone == null || phone === '') return null;
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 0) return null;
  if (digits.length === 11 && digits.startsWith('1')) {
    return digits.slice(1);
  }
  return digits;
}
