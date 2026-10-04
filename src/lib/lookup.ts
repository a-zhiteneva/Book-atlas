import { Author, Book, ReadingStatus } from '../state/schema';
import {
  Edition,
  SearchHit,
  fetchAuthor,
  fetchByIsbn,
  fetchWork,
  searchBooks,
} from './openLibrary';
import { resolveAuthorCountry } from './wikidata';

export interface PendingBook {
  title: string;
  authors: Author[];
  isbn13?: string;
  isbn10?: string;
  olWorkKey?: string;
  olEditionKey?: string;
  coverId?: number;
  firstPublishYear?: number;
  pages?: number;
}

async function hydrateAuthors(
  olKeys: string[],
  names: string[] = [],
  resolvePrimary: boolean,
): Promise<Author[]> {
  const authors: Author[] = [];
  for (let i = 0; i < olKeys.length; i++) {
    const key = olKeys[i];
    try {
      const rec = await fetchAuthor(key);
      const base: Author = {
        name: rec.name,
        olKey: rec.authorKey,
        wikidataId: rec.wikidataId,
        birthCountry: null,
        resolution: 'unresolved',
      };
      if (i === 0 && resolvePrimary) {
        const resolved = await resolveAuthorCountry({
          name: rec.name,
          olKey: rec.authorKey,
          wikidataId: rec.wikidataId,
        });
        authors.push(resolved);
      } else {
        authors.push(base);
      }
    } catch {
      const fallbackName = names[i] ?? 'Unknown author';
      authors.push({
        name: fallbackName,
        olKey: key,
        birthCountry: null,
        resolution: 'unresolved',
      });
    }
  }
  if (authors.length === 0) {
    for (const n of names) {
      authors.push({ name: n, birthCountry: null, resolution: 'unresolved' });
    }
    if (authors.length > 0 && resolvePrimary) {
      authors[0] = await resolveAuthorCountry({ name: authors[0].name });
    }
  }
  return authors;
}

async function editionToPending(e: Edition): Promise<PendingBook> {
  let authorKeys = e.authorKeys;
  let publishYear = e.publishYear;
  let workKey = e.workKey;
  if ((authorKeys.length === 0 || !publishYear) && workKey) {
    try {
      const work = await fetchWork(workKey);
      if (authorKeys.length === 0) authorKeys = work.authorKeys;
      if (!publishYear) publishYear = work.firstPublishYear;
      workKey = work.workKey;
    } catch {
      /* fall through */
    }
  }
  const authors = await hydrateAuthors(authorKeys, [], true);
  return {
    title: e.title,
    authors,
    isbn13: e.isbn13,
    isbn10: e.isbn10,
    olWorkKey: workKey,
    olEditionKey: e.editionKey,
    coverId: e.coverId,
    firstPublishYear: publishYear,
    pages: e.pages,
  };
}

export async function pendingFromIsbn(isbn: string): Promise<PendingBook> {
  const edition = await fetchByIsbn(isbn);
  return editionToPending(edition);
}

export async function pendingFromSearchHit(hit: SearchHit): Promise<PendingBook> {
  const authors = await hydrateAuthors(hit.authorKeys, hit.authorNames, true);
  return {
    title: hit.title,
    authors,
    olWorkKey: hit.workKey,
    coverId: hit.coverId,
    firstPublishYear: hit.firstPublishYear,
    pages: hit.pages,
  };
}

export async function search(query: string): Promise<SearchHit[]> {
  return searchBooks(query);
}

export function makeBookFromPending(
  pending: PendingBook,
  overrides: {
    status: ReadingStatus;
    rating?: Book['rating'];
    notes?: string;
    dateStarted?: string;
    dateFinished?: string;
    countryCode?: string | null;
    countryOverridden?: boolean;
  },
): Book {
  const now = new Date().toISOString();
  const primaryCountry = pending.authors[0]?.birthCountry ?? null;
  return {
    id: crypto.randomUUID(),
    title: pending.title,
    authors: pending.authors,
    isbn13: pending.isbn13,
    isbn10: pending.isbn10,
    olWorkKey: pending.olWorkKey,
    olEditionKey: pending.olEditionKey,
    coverId: pending.coverId,
    firstPublishYear: pending.firstPublishYear,
    pages: pending.pages,
    status: overrides.status,
    dateStarted: overrides.dateStarted,
    dateFinished: overrides.dateFinished,
    rating: overrides.status === 'finished' ? overrides.rating : undefined,
    notes: overrides.notes ?? '',
    countryCode: overrides.countryCode ?? primaryCountry,
    countryOverridden: overrides.countryOverridden ?? false,
    addedAt: now,
    updatedAt: now,
  };
}

export async function reresolvePrimaryAuthor(authors: Author[]): Promise<Author[]> {
  if (authors.length === 0) return authors;
  const primary = authors[0];
  const resolved = await resolveAuthorCountry({
    name: primary.name,
    olKey: primary.olKey,
    wikidataId: primary.wikidataId,
  });
  return [resolved, ...authors.slice(1)];
}
