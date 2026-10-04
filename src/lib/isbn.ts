export type Lookup =
  | { kind: 'isbn'; isbn13: string; isbn10?: string }
  | { kind: 'invalid-isbn'; query: string }
  | { kind: 'query'; query: string };

export function stripIsbn(input: string): string {
  return input.replace(/[\s-]/g, '').toUpperCase();
}

export function isValidIsbn10(input: string): boolean {
  if (!/^[0-9]{9}[0-9X]$/.test(input)) return false;
  let sum = 0;
  for (let i = 0; i < 10; i++) {
    const ch = input[i];
    const digit = ch === 'X' ? 10 : Number(ch);
    sum += digit * (10 - i);
  }
  return sum % 11 === 0;
}

export function isValidIsbn13(input: string): boolean {
  if (!/^[0-9]{13}$/.test(input)) return false;
  let sum = 0;
  for (let i = 0; i < 13; i++) {
    const digit = Number(input[i]);
    sum += i % 2 === 0 ? digit : digit * 3;
  }
  return sum % 10 === 0;
}

export function toIsbn13(isbn10: string): string {
  const stripped = stripIsbn(isbn10);
  if (!isValidIsbn10(stripped)) throw new Error(`Not a valid ISBN-10: ${isbn10}`);
  const core = '978' + stripped.slice(0, 9);
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = Number(core[i]);
    sum += i % 2 === 0 ? digit : digit * 3;
  }
  const check = (10 - (sum % 10)) % 10;
  return core + String(check);
}

export function toIsbn10(isbn13: string): string | undefined {
  if (!isValidIsbn13(isbn13) || !isbn13.startsWith('978')) return undefined;
  const core = isbn13.slice(3, 12);
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += Number(core[i]) * (10 - i);
  const checkNum = (11 - (sum % 11)) % 11;
  const check = checkNum === 10 ? 'X' : String(checkNum);
  return core + check;
}

export function parseLookup(input: string): Lookup {
  const stripped = stripIsbn(input);
  if (/^[0-9]{13}$/.test(stripped)) {
    if (isValidIsbn13(stripped)) {
      const maybe10 = toIsbn10(stripped);
      return { kind: 'isbn', isbn13: stripped, ...(maybe10 ? { isbn10: maybe10 } : {}) };
    }
    return { kind: 'invalid-isbn', query: input.trim() };
  }
  if (/^[0-9]{9}[0-9X]$/.test(stripped)) {
    if (isValidIsbn10(stripped)) {
      return { kind: 'isbn', isbn13: toIsbn13(stripped), isbn10: stripped };
    }
    return { kind: 'invalid-isbn', query: input.trim() };
  }
  return { kind: 'query', query: input.trim() };
}
