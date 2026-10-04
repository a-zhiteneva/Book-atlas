import { describe, expect, test } from 'vitest';
import {
  stripIsbn,
  isValidIsbn10,
  isValidIsbn13,
  toIsbn13,
  parseLookup,
} from '../lib/isbn';

describe('stripIsbn', () => {
  test('removes spaces and hyphens', () => {
    expect(stripIsbn(' 978-0-14-303999-0 ')).toBe('9780143039990');
    expect(stripIsbn('0 14 303999 7')).toBe('0143039997');
  });

  test('uppercases X', () => {
    expect(stripIsbn('043942089x')).toBe('043942089X');
  });
});

describe('isValidIsbn10', () => {
  test('valid numeric ISBN-10', () => {
    expect(isValidIsbn10('0143039997')).toBe(true);
  });

  test('valid X-terminated ISBN-10', () => {
    expect(isValidIsbn10('043942089X')).toBe(true);
  });

  test('rejects wrong checksum', () => {
    expect(isValidIsbn10('0143039998')).toBe(false);
  });

  test('rejects wrong length', () => {
    expect(isValidIsbn10('123456789')).toBe(false);
    expect(isValidIsbn10('12345678901')).toBe(false);
  });

  test('rejects non-digit chars inside', () => {
    expect(isValidIsbn10('0143O39997')).toBe(false);
  });
});

describe('isValidIsbn13', () => {
  test('valid ISBN-13', () => {
    expect(isValidIsbn13('9780143039990')).toBe(true);
    expect(isValidIsbn13('9780439020435')).toBe(true);
  });

  test('rejects wrong checksum', () => {
    expect(isValidIsbn13('9780143039991')).toBe(false);
  });

  test('rejects wrong length', () => {
    expect(isValidIsbn13('978014303999')).toBe(false);
  });
});

describe('toIsbn13', () => {
  test('converts a known ISBN-10 to ISBN-13', () => {
    expect(toIsbn13('0143039997')).toBe('9780143039990');
  });

  test('converts an X-terminated ISBN-10', () => {
    expect(toIsbn13('043942089X')).toBe('9780439420891');
  });

  test('throws on invalid ISBN-10', () => {
    expect(() => toIsbn13('1234567890')).toThrow();
  });
});

describe('parseLookup', () => {
  test('returns isbn for a valid ISBN-13', () => {
    expect(parseLookup('978-0-14-303999-0')).toEqual({
      kind: 'isbn',
      isbn13: '9780143039990',
      isbn10: '0143039997',
    });
  });

  test('returns isbn for a valid ISBN-10 and computes isbn13', () => {
    expect(parseLookup('0 14 303999 7')).toEqual({
      kind: 'isbn',
      isbn13: '9780143039990',
      isbn10: '0143039997',
    });
  });

  test('treats a 10-digit shape with bad checksum as invalid-isbn', () => {
    expect(parseLookup('0143039998')).toEqual({ kind: 'invalid-isbn', query: '0143039998' });
  });

  test('treats a 13-digit shape with bad checksum as invalid-isbn', () => {
    expect(parseLookup('9780143039991')).toEqual({ kind: 'invalid-isbn', query: '9780143039991' });
  });

  test('short strings are treated as text queries', () => {
    expect(parseLookup('Lolita')).toEqual({ kind: 'query', query: 'Lolita' });
  });

  test('mixed alphanumeric is a text query', () => {
    expect(parseLookup('Nabokov Lolita')).toEqual({ kind: 'query', query: 'Nabokov Lolita' });
  });
});
