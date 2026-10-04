import { cacheGet, cacheSet } from './cache';

export class NotFoundError extends Error {
  constructor(url: string) {
    super(`Not found: ${url}`);
    this.name = 'NotFoundError';
  }
}
export class NetworkError extends Error {
  constructor(url: string, cause?: unknown) {
    super(`Network error: ${url}`);
    this.name = 'NetworkError';
    this.cause = cause;
  }
}
export class RateLimitedError extends Error {
  constructor(url: string) {
    super(`Rate limited: ${url}`);
    this.name = 'RateLimitedError';
  }
}

const DEFAULT_TIMEOUT_MS = 10_000;

export async function fetchJson<T>(url: string, timeoutMs: number = DEFAULT_TIMEOUT_MS): Promise<T> {
  const cached = cacheGet<T>(url);
  if (cached !== undefined) return cached;

  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctl.signal, headers: { Accept: 'application/json' } });
    if (res.status === 404) throw new NotFoundError(url);
    if (res.status === 429) throw new RateLimitedError(url);
    if (!res.ok) throw new NetworkError(url);
    const data = (await res.json()) as T;
    cacheSet(url, data);
    return data;
  } catch (e) {
    if (e instanceof NotFoundError || e instanceof RateLimitedError || e instanceof NetworkError) {
      throw e;
    }
    throw new NetworkError(url, e);
  } finally {
    clearTimeout(timer);
  }
}

export interface SearchDoc {
  key: string;
  title: string;
  author_name?: string[];
  author_key?: string[];
  first_publish_year?: number;
  cover_i?: number;
  isbn?: string[];
  number_of_pages_median?: number;
}

interface SearchResponse {
  docs: SearchDoc[];
}

export interface SearchHit {
  workKey: string;
  title: string;
  authorNames: string[];
  authorKeys: string[];
  firstPublishYear?: number;
  coverId?: number;
  pages?: number;
  firstIsbn?: string;
}

export async function searchBooks(query: string, limit = 10): Promise<SearchHit[]> {
  const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&fields=key,title,author_name,author_key,first_publish_year,cover_i,isbn,number_of_pages_median&limit=${limit}`;
  const data = await fetchJson<SearchResponse>(url);
  return (data.docs ?? []).map((d) => ({
    workKey: stripPrefix(d.key, '/works/'),
    title: d.title,
    authorNames: d.author_name ?? [],
    authorKeys: (d.author_key ?? []).map((k) => stripPrefix(k, '/authors/')),
    firstPublishYear: d.first_publish_year,
    coverId: d.cover_i,
    pages: d.number_of_pages_median,
    firstIsbn: d.isbn?.[0],
  }));
}

interface EditionJson {
  key: string;
  title: string;
  authors?: Array<{ key: string }>;
  works?: Array<{ key: string }>;
  covers?: number[];
  publish_date?: string;
  number_of_pages?: number;
  isbn_13?: string[];
  isbn_10?: string[];
}

export interface Edition {
  editionKey: string;
  title: string;
  authorKeys: string[];
  workKey?: string;
  coverId?: number;
  publishYear?: number;
  pages?: number;
  isbn13?: string;
  isbn10?: string;
}

export async function fetchByIsbn(isbn: string): Promise<Edition> {
  const url = `https://openlibrary.org/isbn/${isbn}.json`;
  const data = await fetchJson<EditionJson>(url);
  return parseEdition(data);
}

export function parseEdition(data: EditionJson): Edition {
  return {
    editionKey: stripPrefix(data.key, '/books/'),
    title: data.title,
    authorKeys: (data.authors ?? []).map((a) => stripPrefix(a.key, '/authors/')),
    workKey: data.works?.[0] ? stripPrefix(data.works[0].key, '/works/') : undefined,
    coverId: data.covers?.[0],
    publishYear: parseYear(data.publish_date),
    pages: data.number_of_pages,
    isbn13: data.isbn_13?.[0],
    isbn10: data.isbn_10?.[0],
  };
}

interface WorkJson {
  key: string;
  title: string;
  authors?: Array<{ author: { key: string } }>;
  first_publish_date?: string;
}

export interface Work {
  workKey: string;
  title: string;
  authorKeys: string[];
  firstPublishYear?: number;
}

export async function fetchWork(workKey: string): Promise<Work> {
  const url = `https://openlibrary.org/works/${workKey}.json`;
  const data = await fetchJson<WorkJson>(url);
  return parseWork(data);
}

export function parseWork(data: WorkJson): Work {
  return {
    workKey: stripPrefix(data.key, '/works/'),
    title: data.title,
    authorKeys: (data.authors ?? []).map((a) => stripPrefix(a.author.key, '/authors/')),
    firstPublishYear: parseYear(data.first_publish_date),
  };
}

interface AuthorJson {
  key: string;
  name: string;
  birth_date?: string;
  remote_ids?: { wikidata?: string };
}

export interface AuthorRecord {
  authorKey: string;
  name: string;
  birthDate?: string;
  wikidataId?: string;
}

export async function fetchAuthor(authorKey: string): Promise<AuthorRecord> {
  const url = `https://openlibrary.org/authors/${authorKey}.json`;
  const data = await fetchJson<AuthorJson>(url);
  return parseAuthor(data);
}

export function parseAuthor(data: AuthorJson): AuthorRecord {
  return {
    authorKey: stripPrefix(data.key, '/authors/'),
    name: data.name,
    birthDate: data.birth_date,
    wikidataId: data.remote_ids?.wikidata,
  };
}

export function coverUrl(coverId: number | undefined, size: 'S' | 'M' | 'L' = 'M'): string | null {
  if (!coverId) return null;
  return `https://covers.openlibrary.org/b/id/${coverId}-${size}.jpg`;
}

function stripPrefix(s: string, prefix: string): string {
  return s.startsWith(prefix) ? s.slice(prefix.length) : s;
}

function parseYear(s: string | undefined): number | undefined {
  if (!s) return undefined;
  const m = s.match(/\b(\d{4})\b/);
  return m ? Number(m[1]) : undefined;
}
