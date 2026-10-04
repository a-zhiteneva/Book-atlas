import { describe, expect, test, beforeEach } from 'vitest';
import { loadLibrary, saveLibrary, migrate, STORAGE_KEY } from '../state/storage';
import type { Book, Library } from '../state/schema';
import { SCHEMA_VERSION } from '../state/schema';

const sampleBook = (overrides: Partial<Book> = {}): Book => ({
  id: 'id-1',
  title: 'Lolita',
  authors: [
    {
      name: 'Vladimir Nabokov',
      birthCountry: 'RU',
      resolution: 'wikidata-birthplace',
    },
  ],
  status: 'finished',
  notes: '',
  countryCode: 'RU',
  countryOverridden: false,
  addedAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

describe('migrate', () => {
  test('accepts current v1 library untouched', () => {
    const lib: Library = { version: SCHEMA_VERSION, books: [sampleBook()] };
    const out = migrate(lib);
    expect(out).toEqual(lib);
  });

  test('throws on unknown version with a readable message', () => {
    expect(() => migrate({ version: 999, books: [] })).toThrow(/version/i);
  });

  test('throws on non-object input', () => {
    expect(() => migrate(null)).toThrow();
    expect(() => migrate('nope')).toThrow();
  });

  test('throws when books is not an array', () => {
    expect(() => migrate({ version: SCHEMA_VERSION, books: 'nope' })).toThrow();
  });
});

describe('load/save round-trip', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('loadLibrary returns an empty library when storage is empty', () => {
    const lib = loadLibrary();
    expect(lib).toEqual({ version: SCHEMA_VERSION, books: [] });
  });

  test('saveLibrary + loadLibrary round-trips exact content', () => {
    const lib: Library = {
      version: SCHEMA_VERSION,
      books: [sampleBook(), sampleBook({ id: 'id-2', title: 'Pale Fire' })],
    };
    saveLibrary(lib);
    const roundTripped = loadLibrary();
    expect(roundTripped).toEqual(lib);
  });

  test('loadLibrary recovers from corrupt JSON by returning empty', () => {
    localStorage.setItem(STORAGE_KEY, '{not valid json');
    const lib = loadLibrary();
    expect(lib).toEqual({ version: SCHEMA_VERSION, books: [] });
  });
});
