/** Validates the ISSN check digit only; registration still needs the ISSN registry. */
export function isValidIssn(value?: string): boolean {
  if (!value) return false;
  const digits = value.trim().toUpperCase().replace('-', '');
  if (!/^\d{7}[\dX]$/.test(digits)) return false;
  const sum = [...digits.slice(0, 7)].reduce((total, digit, index) => total + Number(digit) * (8 - index), 0);
  const expected = (11 - sum % 11) % 11;
  return digits[7] === (expected === 10 ? 'X' : String(expected));
}
