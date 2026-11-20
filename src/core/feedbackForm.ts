/** Feedback form rules (shared by the form and its test; the server checks the same limits again). */
export type FeedbackKind = 'idea' | 'bug' | 'other';
export type FeedbackError = 'short' | 'long' | 'contact' | null;
export const MIN_MESSAGE = 5;
export const MAX_MESSAGE = 2000;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function validateFeedback(message: string, contact: string): FeedbackError {
  const m = message.trim();
  if (m.length < MIN_MESSAGE) return 'short';
  if (m.length > MAX_MESSAGE) return 'long';
  const c = contact.trim();
  if (c !== '' && (c.length > 120 || !EMAIL.test(c))) return 'contact';
  return null;
}

export function buildPayload(kind: FeedbackKind, message: string, contact: string, meta: Record<string, string | number> | null, website = ''): object {
  return { kind, message: message.trim(), contact: contact.trim(), meta: meta ?? {}, website };
}

/** IBAN checksum (ISO 13616, mod 97): catches a mistyped number before it is ever shown. */
export function ibanValid(iban: string): boolean {
  const s = iban.replace(/\s/g, '').toUpperCase();
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(s)) return false;
  let rem = 0;
  for (const ch of s.slice(4) + s.slice(0, 4)) {
    const v = ch >= 'A' ? String(ch.charCodeAt(0) - 55) : ch;
    for (const d of v) rem = (rem * 10 + Number(d)) % 97;
  }
  return rem === 1;
}

/** BG41 UBBS 8002 1019 8662 50 */
export const groupIban = (iban: string): string => iban.replace(/\s/g, '').replace(/(.{4})(?=.)/g, '$1 ');
