import { describe, expect, test, beforeEach, afterEach, vi } from 'vitest';
import editionJson from './fixtures/ol-isbn-9780143039990.json';
import workJson from './fixtures/ol-work-OL267171W.json';
import authorJson from './fixtures/ol-author-OL26783A.json';
import searchJson from './fixtures/ol-search-lolita.json';
import {
  parseEdition,
  parseWork,
  parseAuthor,
  searchBooks,
  fetchByIsbn,
  NotFoundError,
  coverUrl,
} from '../lib/openLibrary';
import { cacheClear } from '../lib/cache';

describe('parseEdition', () => {
  test('normalises edition JSON to our Edition shape', () => {
    const e = parseEdition(editionJson as never);
    expect(e.editionKey).toBe('OL7361811M');
    expect(e.workKey).toBe('OL267171W');
    expect(e.authorKeys).toEqual(['OL26783A']);
    expect(e.coverId).toBe(111565);
    expect(e.isbn13).toBe('9780143039990');
    expect(e.isbn10).toBe('0143039997');
    expect(e.pages).toBe(1424);
    expect(e.publishYear).toBe(2006);
  });
});

describe('parseWork', () => {
  test('normalises nested author refs and the first publish year', () => {
    const w = parseWork(workJson as never);
    expect(w.workKey).toBe('OL267171W');
    expect(w.authorKeys).toEqual(['OL26783A']);
    expect(w.firstPublishYear).toBe(1970);
  });
});

describe('parseAuthor', () => {
  test('picks name, birth date, Wikidata id from remote_ids', () => {
    const a = parseAuthor(authorJson as never);
    expect(a.authorKey).toBe('OL26783A');
    expect(a.name).toMatch(/Толстой|Tolstoy/);
    expect(a.wikidataId).toBe('Q7243');
    expect(a.birthDate).toBe('9 September 1828');
  });
});

describe('coverUrl', () => {
  test('builds Open Library cover URLs by size', () => {
    expect(coverUrl(111565)).toBe('https://covers.openlibrary.org/b/id/111565-M.jpg');
    expect(coverUrl(111565, 'L')).toBe('https://covers.openlibrary.org/b/id/111565-L.jpg');
    expect(coverUrl(undefined)).toBeNull();
  });
});

describe('searchBooks (mocked fetch)', () => {
  beforeEach(() => {
    cacheClear();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => searchJson,
      }),
    );
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    cacheClear();
  });

  test('returns normalised hits', async () => {
    const hits = await searchBooks('lolita nabokov');
    expect(hits.length).toBeGreaterThan(0);
    const first = hits[0];
    expect(first.title).toBe('Lolita');
    expect(first.workKey).toBe('OL627084W');
    expect(first.authorKeys).toEqual(['OL48139A']);
    expect(first.authorNames).toEqual(['Vladimir Nabokov']);
    expect(first.firstPublishYear).toBe(1777);
  });
});

describe('fetchByIsbn (mocked fetch, 404)', () => {
  beforeEach(() => {
    cacheClear();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 404, json: async () => ({}) }),
    );
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    cacheClear();
  });

  test('throws NotFoundError on 404', async () => {
    await expect(fetchByIsbn('9999999999999')).rejects.toBeInstanceOf(NotFoundError);
  });
});
