import { westernDigits } from './i18n/i18n';

/** Iraqi mobile numbers: 7XX XXX XXXX (10 digits). Accepts +964 / 0 prefixes and Eastern Arabic digits. */
export function normalisePhone(input: string): string | null {
  let d = westernDigits(input).replace(/[^\d]/g, '');
  if (d.startsWith('964')) d = d.slice(3);
  if (d.startsWith('0')) d = d.slice(1);
  return /^7\d{9}$/.test(d) ? d : null;
}

export const formatPhone = (national: string) => `+964 ${national.slice(0, 3)} ${national.slice(3, 6)} ${national.slice(6)}`;

export const cleanText = (s: string, max: number) => s.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);

/** At least three characters, and not starting with = + - @, which spreadsheets would read as a formula. */
export const validName = (s: string) => {
  const name = cleanText(s, 80);
  return name.length >= 3 && !/^[=+\-@]/.test(name);
};

export function validBirthDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, day] = s.split('-').map(Number);
  const d = new Date(y, m - 1, day);
  // Rejects dates such as 31 February, which Date would quietly roll over into March.
  const real = d.getFullYear() === y && d.getMonth() === m - 1 && d.getDate() === day;
  return real && d <= new Date() && y >= 1900;
}

export function ageFrom(birth: string, now = new Date()) {
  const b = new Date(birth + 'T00:00:00');
  let age = now.getFullYear() - b.getFullYear();
  if (now.getMonth() < b.getMonth() || (now.getMonth() === b.getMonth() && now.getDate() < b.getDate())) age--;
  return age;
}
