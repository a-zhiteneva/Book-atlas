import { Author, Book, Library, SCHEMA_VERSION } from '../state/schema';

export class ImportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ImportError';
  }
}

function isString(x: unknown): x is string {
  return typeof x === 'string';
}

function isAuthor(x: unknown): x is Author {
  if (!x || typeof x !== 'object') return false;
  const a = x as Record<string, unknown>;
  if (!isString(a.name)) return false;
  if (a.birthCountry !== null && !isString(a.birthCountry)) return false;
  if (
    a.resolution !== 'wikidata-birthplace' &&
    a.resolution !== 'wikidata-citizenship' &&
    a.resolution !== 'manual' &&
    a.resolution !== 'unresolved'
  ) {
    return false;
  }
  return true;
}

function isBook(x: unknown): x is Book {
  if (!x || typeof x !== 'object') return false;
  const b = x as Record<string, unknown>;
  if (!isString(b.id) || !isString(b.title)) return false;
  if (!Array.isArray(b.authors) || !b.authors.every(isAuthor)) return false;
  if (!isString(b.notes)) return false;
  if (b.countryCode !== null && !isString(b.countryCode)) return false;
  if (typeof b.countryOverridden !== 'boolean') return false;
  if (!isString(b.addedAt) || !isString(b.updatedAt)) return false;
  const status = b.status;
  if (status !== 'wishlist' && status !== 'owned' && status !== 'reading' && status !== 'finished') {
    return false;
  }
  if (b.rating !== undefined && typeof b.rating !== 'number') return false;
  return true;
}

export function parseLibrary(json: unknown): Library {
  if (!json || typeof json !== 'object') {
    throw new ImportError('Not a JSON object');
  }
  const obj = json as Record<string, unknown>;
  if (obj.version !== SCHEMA_VERSION) {
    throw new ImportError(`Unsupported schema version: ${String(obj.version)}`);
  }
  if (!Array.isArray(obj.books)) {
    throw new ImportError('`books` must be an array');
  }
  for (let i = 0; i < obj.books.length; i++) {
    if (!isBook(obj.books[i])) {
      throw new ImportError(`Book at index ${i} is malformed`);
    }
  }
  return { version: SCHEMA_VERSION, books: obj.books as Book[] };
}
