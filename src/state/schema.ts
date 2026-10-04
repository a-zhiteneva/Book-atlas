export const SCHEMA_VERSION = 1 as const;

export type CountryResolution =
  | 'wikidata-birthplace'
  | 'wikidata-citizenship'
  | 'manual'
  | 'unresolved';

export interface Author {
  name: string;
  olKey?: string;
  wikidataId?: string;
  birthPlaceLabel?: string;
  birthCountry: string | null;
  resolution: CountryResolution;
}

export type ReadingStatus = 'wishlist' | 'owned' | 'reading' | 'finished';

export type Rating = 1 | 2 | 3 | 4 | 5;

export interface Book {
  id: string;
  title: string;
  authors: Author[];
  isbn13?: string;
  isbn10?: string;
  olWorkKey?: string;
  olEditionKey?: string;
  coverId?: number;
  firstPublishYear?: number;
  pages?: number;

  status: ReadingStatus;
  dateStarted?: string;
  dateFinished?: string;
  rating?: Rating;
  notes: string;

  countryCode: string | null;
  countryOverridden: boolean;

  addedAt: string;
  updatedAt: string;
}

export interface Library {
  version: typeof SCHEMA_VERSION;
  books: Book[];
}

export function emptyLibrary(): Library {
  return { version: SCHEMA_VERSION, books: [] };
}
