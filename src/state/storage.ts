import { Library, SCHEMA_VERSION, emptyLibrary } from './schema';

export const STORAGE_KEY = 'bookatlas:v1';

export function migrate(raw: unknown): Library {
  if (raw === null || typeof raw !== 'object') {
    throw new Error('Invalid library: expected an object');
  }
  const obj = raw as Record<string, unknown>;
  if (obj.version !== SCHEMA_VERSION) {
    throw new Error(
      `Unknown library version ${String(obj.version)} (expected ${SCHEMA_VERSION})`,
    );
  }
  if (!Array.isArray(obj.books)) {
    throw new Error('Invalid library: `books` must be an array');
  }
  return { version: SCHEMA_VERSION, books: obj.books as Library['books'] };
}

export function loadLibrary(): Library {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyLibrary();
    const parsed = JSON.parse(raw);
    return migrate(parsed);
  } catch {
    return emptyLibrary();
  }
}

export function saveLibrary(lib: Library): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(lib));
}
