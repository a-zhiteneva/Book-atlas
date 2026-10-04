# Book Atlas — Claude Code one-shot spec

Oct 4, 2026 · @Krishna

## Goal and scope

Book Atlas is a single-user, browser-only web app: log the books you have read, and see them on a world map coloured by the author's birth country. No accounts, no backend, no server; all data lives in the browser's localStorage and can be exported as JSON.

**Instruction to Claude Code:** build the whole repo in one pass from this spec. Do not ask clarifying questions. Where the spec is silent, pick the simplest option that satisfies the acceptance criteria and note the choice in `README.md` under "Decisions". Verify every external API response shape with `curl` before writing a parser for it.

v1 does:

- Add a book by ISBN (10 or 13) or by title/author search, pulling title, author(s), cover, first publish year and page count from Open Library
- Store per book: one of four statuses (wishlist / owned but not started / started / finished), date started, date finished, rating 1–5, free-text notes
- Resolve each book's country automatically from the primary author's birthplace, with a manual override
- Show a world map: countries you have finished a book from are coloured, the header shows `N / 195 countries (x%)`, clicking a country lists your finished books from it
- Edit or delete any book; export and import the whole library as JSON

Not in v1: accounts, sync, sharing, reading goals, recommendations, multiple custom shelves, offline caching of covers, i18n.

## Stack and repo layout

These choices are fixed; do not swap libraries or add a backend.

| Concern | Choice | Notes |
| --- | --- | --- |
| Build | Vite + React 18 + TypeScript (strict) | `npm create vite@latest` template `react-ts` |
| Styling | Tailwind CSS v3 | No component library |
| Routing | react-router-dom v6 | Routes listed under Screens |
| State | React context + `useReducer`, persisted to localStorage | No Redux/Zustand |
| Map geometry | `d3-geo`, `topojson-client`, `world-atlas` (`countries-110m.json`) | Render SVG paths directly in React; do not use react-simple-maps |
| Country metadata | `world-countries` | Gives `cca2`, `ccn3`, `name.common`, `flag`, `independent` |
| IDs | `crypto.randomUUID()` | — |
| Tests | Vitest + @testing-library/react | Unit tests only, see Build order |
| Lint/format | ESLint (Vite default) + Prettier | — |
| Node | 20+ | npm, not pnpm/yarn |

Repo layout:

```text
book-atlas/
  README.md
  package.json
  index.html
  src/
    main.tsx
    App.tsx                 # router + BooksProvider
    routes/
      Library.tsx           # /
      AddBook.tsx           # /add
      BookDetail.tsx        # /book/:id
      MapPage.tsx           # /map
      Settings.tsx          # /settings
    components/
      WorldMap.tsx          # SVG map, props: counts by cca2, onSelect
      CountryPanel.tsx      # books for a selected country
      BookCard.tsx
      SearchResults.tsx
      RatingInput.tsx
      CountrySelect.tsx     # searchable dropdown of all countries
    state/
      booksContext.tsx      # provider, reducer, hooks
      storage.ts            # load/save/migrate localStorage
      schema.ts             # types + current schema version
    lib/
      isbn.ts               # detect/normalise/validate ISBN-10/13
      openLibrary.ts        # fetch wrappers + parsers
      wikidata.ts           # author -> birth country resolution
      countries.ts          # world-countries wrappers, denominator list
      cache.ts              # localStorage cache for API responses
    __tests__/
      isbn.test.ts
      resolveCountry.test.ts
      storage.test.ts
```

## Data model and storage

One localStorage key, `bookatlas:v1`, holds a versioned JSON document. Country codes are ISO 3166-1 alpha-2 everywhere; the map and the stats key off `Book.countryCode`.

```ts
// src/state/schema.ts
export const SCHEMA_VERSION = 1;

export type CountryResolution =
  | 'wikidata-birthplace'   // P19 -> P17 -> P297
  | 'wikidata-citizenship'  // P27 -> P297 (fallback)
  | 'manual'                // user picked it
  | 'unresolved';

export interface Author {
  name: string;
  olKey?: string;              // "OL23919A"
  wikidataId?: string;         // "Q6245"
  birthPlaceLabel?: string;    // "Saint Petersburg" — display only
  birthCountry: string | null; // cca2 or null
  resolution: CountryResolution;
}

// wishlist = want it, don't own it · owned = have it, not started
// reading  = started            · finished = read to the end
export type ReadingStatus = 'wishlist' | 'owned' | 'reading' | 'finished';

export interface Book {
  id: string;                  // crypto.randomUUID()
  title: string;
  authors: Author[];           // primary author first
  isbn13?: string;
  isbn10?: string;
  olWorkKey?: string;          // "OL45804W"
  olEditionKey?: string;       // "OL7353617M"
  coverId?: number;            // Open Library cover_i
  firstPublishYear?: number;
  pages?: number;

  status: ReadingStatus;
  dateStarted?: string;        // "YYYY-MM-DD"
  dateFinished?: string;       // "YYYY-MM-DD"
  rating?: 1 | 2 | 3 | 4 | 5;  // only when status === 'finished'
  notes: string;               // plain text, newlines preserved

  countryCode: string | null;  // what the map uses
  countryOverridden: boolean;  // true => never auto-overwrite

  addedAt: string;             // ISO datetime
  updatedAt: string;
}

export interface Library {
  version: typeof SCHEMA_VERSION;
  books: Book[];
}
```

Rules:

- `countryCode` defaults to `authors[0].birthCountry` when the book is created. If the user changes it, set `countryOverridden = true` and never recompute it.
- Re-resolving a book's country (button on detail page) refreshes `authors[*]` and, only if `countryOverridden` is false, `countryCode`.
- Only books with `status === 'finished'` count towards the map and the percentage. The rating input is shown only when status is `finished`; changing away from `finished` keeps the stored rating but hides it.
- Any status can be set directly from any other. Moving to `reading` fills `dateStarted` with today if empty; moving to `finished` fills `dateFinished` with today if empty. Both dates stay editable.
- `storage.ts` exposes `loadLibrary()`, `saveLibrary(lib)`, `migrate(raw): Library`. `migrate` must accept `{version: 1, ...}` today and throw a readable error on unknown versions. Save on every reducer change (debounce 300 ms).
- Export = the raw `Library` JSON, filename `book-atlas-YYYY-MM-DD.json`. Import validates shape with a hand-written type guard (no zod), then offers Replace or Merge (merge = union by `id`, incoming wins on conflict).
- API responses are cached in localStorage under `bookatlas:cache:<url>` with a 30-day TTL, capped at 200 entries (evict oldest).

## Book lookup: Open Library

All book metadata comes from Open Library's public JSON API (no key, CORS enabled). The search box accepts one string; `isbn.ts` decides whether it is an ISBN or a free-text query.

| Endpoint | Use | Fields to read |
| --- | --- | --- |
| `GET https://openlibrary.org/search.json?q={q}&fields=key,title,author_name,author_key,first_publish_year,cover_i,isbn,number_of_pages_median&limit=10` | Title/author search | `docs[]`: `key` (work), `title`, `author_name[]`, `author_key[]`, `first_publish_year`, `cover_i`, `isbn[]`, `number_of_pages_median` |
| `GET https://openlibrary.org/isbn/{isbn}.json` | ISBN lookup (redirects to an edition) | `key` (edition), `title`, `authors[].key`, `works[].key`, `covers[]`, `publish_date`, `number_of_pages`, `isbn_13[]`, `isbn_10[]` |
| `GET https://openlibrary.org/works/{id}.json` | Author keys when the edition has none; first publish year | `authors[].author.key`, `title` |
| `GET https://openlibrary.org/authors/{id}.json` | Author name and Wikidata id | `name`, `remote_ids.wikidata`, `birth_date` |
| `https://covers.openlibrary.org/b/id/{cover_i}-M.jpg` | Cover image URL (`-S`, `-M`, `-L`) | Image, not JSON; show a placeholder if 404 |

ISBN handling (`isbn.ts`, fully unit-tested):

1. Strip spaces and hyphens. If the result is 10 chars `[0-9]{9}[0-9Xx]` or 13 chars `[0-9]{13}`, treat as ISBN; otherwise it is a text query.
2. Validate the checksum for both forms. Invalid checksum → show "Not a valid ISBN, searching by text instead" and fall through to search.
3. Convert ISBN-10 to ISBN-13 (prefix 978, recompute check digit) and store both.

Flow for a text query: call `search.json`, render up to 10 results (cover thumbnail, title, first author, year). Selecting one fetches the work, then each author, then runs country resolution. Flow for an ISBN: call `/isbn/`, then the work if `authors` is missing on the edition, then each author.

Error handling: every fetch goes through one `fetchJson(url)` helper with a 10 s timeout, the cache from the Data model section, and typed errors (`NotFound`, `Network`, `RateLimited`). Open Library returns 404 for unknown ISBNs; show "Not found — add manually" and open the Add form empty.

## Author → country resolution: Wikidata

The country of a book is the birth country of its primary author, taken from Wikidata. Open Library's own author records rarely carry a birthplace, so OL is used only to reach the Wikidata id. All Wikidata calls are anonymous GETs with `origin=*` for CORS.

| Wikidata property | Meaning | Used for |
| --- | --- | --- |
| P19 | place of birth | primary signal |
| P17 | country (of a place) | place → country |
| P297 | ISO 3166-1 alpha-2 | country → `cca2` |
| P27 | country of citizenship | fallback when P19 missing |
| P582 | end time (qualifier) | pick the current P17 of a place with several |
| P1366 | replaced by | map a historical state to its successor |
| P31 = Q5 | instance of human | disambiguate name search |
| P106 | occupation | prefer writer-type occupations in name search |

Resolution steps for one author (`wikidata.ts`, `resolveAuthorCountry(author): Promise<Author>`):

1. Get a Wikidata id. If the OL author record has `remote_ids.wikidata`, use it. Otherwise call `https://www.wikidata.org/w/api.php?action=wbsearchentities&search={name}&language=en&type=item&limit=5&format=json&origin=*`, fetch each candidate's entity, and keep the first that is P31 = Q5 and has a P106 in {Q36180 writer, Q482980 author, Q6625963 novelist, Q49757 poet, Q4853732 children's writer, Q1930187 journalist, Q214917 playwright, Q28389 screenwriter, Q11774202 essayist, Q333634 translator}. If none, keep the first Q5 candidate with the lowest id number. No candidate → `unresolved`.
2. Fetch the entity: `https://www.wikidata.org/wiki/Special:EntityData/{Q}.json`. Read `entities[Q].claims`.
3. Birthplace path: take the P19 value (a place Q-id), fetch that place, take its P17 statements; prefer the one with no P582 qualifier, else the one with the latest P582. That is the country entity.
4. Country → code: fetch the country entity, read P297. If absent (historical state such as Russian Empire, Austria-Hungary, Yugoslavia, USSR), follow P1366 (up to three hops) until an entity with P297 is found. Still absent → fall back to step 5.
5. Citizenship path: take P27 values; prefer one with no P582 qualifier; read P297 as in step 4. Resolution = `wikidata-citizenship`.
6. Nothing worked → `birthCountry = null`, `resolution = 'unresolved'`. The Add form then shows the country select with a "couldn't detect — pick one" hint.

Also read the P19 place's English label into `birthPlaceLabel` so the UI can show "Born in Saint Petersburg → Russia (RU)" and the user can sanity-check it. Resolve only the primary author automatically; other authors keep `resolution: 'unresolved'` and `birthCountry: null` unless the user triggers resolution from the detail page.

Edge cases to handle explicitly: P19 pointing at a country directly rather than a city (then P17 is the place itself); UK constituent countries resolving to GB; Hong Kong (HK) and Puerto Rico (PR) have P297 but are not in the denominator list, so count them as HK/PR on the map but exclude them from the percentage; countries not present in the 110m map (Singapore, Malta, Vatican, Monaco etc.) still count in the percentage and appear in the country list under the map.

Tests for this module mock `fetch` with fixture JSON for: an author with `remote_ids.wikidata`; one found by name search; a Russian Empire birthplace that resolves via P1366; a missing P19 that falls back to P27; a complete miss.

## World map

`WorldMap.tsx` renders `world-atlas/countries-110m.json` as inline SVG with `d3-geo` (`geoEqualEarth`, `fitSize` to the container) and `topojson-client` `feature()`. Each feature's `id` is the numeric ISO code as a string (`"826"`); join it to `world-countries` on `ccn3` to get `cca2`, name and flag. Antarctica (`010`) is dropped.

Colouring, by number of `finished` books with that `countryCode`:

| Count | Fill |
| --- | --- |
| 0 | neutral grey (`#e5e7eb`), hover darkens slightly |
| 1 | light accent |
| 2–4 | mid accent |
| 5+ | strong accent |

Use one hue (e.g. Tailwind emerald) at four fixed stops; put the legend under the map. Selected country gets a 2 px dark stroke.

Interaction:

- Hover: tooltip with flag, name, `N books`. Pointer cursor only on countries with books.
- Click a country: set `selectedCountry` (in URL as `/map?c=RU`), open `CountryPanel` beside the map on desktop, as a bottom sheet on mobile. Panel lists that country's `finished` books (cover, title, author, rating, date finished), each linking to `/book/:id`. Click again or press Escape to clear.
- Below the map, a two-column list of every country with ≥ 1 finished book, sorted by count then name, with the same click behaviour. This is how small countries missing from the 110m geometry (Singapore, Malta, Monaco, Vatican, Bahrain, Maldives) stay reachable.
- No zoom/pan in v1. Keep the SVG responsive: `viewBox` fixed, `width: 100%`.

Percentage header, above the map: `N / 195 countries · x%` where N = distinct `countryCode` values among `finished` books that are in the denominator list, and the denominator = the 195 UN member and observer states, computed in `countries.ts` as `world-countries` entries with `independent === true` plus Vatican (`VA`) plus Palestine (`PS`) if not already included. Assert in a test that the list has exactly 195 entries; if `world-countries` gives a different count, hard-code the list instead and say so in README. Also show two secondary stats: total books finished, and the most-read country.

## Screens

Five routes behind a persistent top nav (Library · Add · Map · Settings); on screens under 768 px the nav becomes a bottom bar. Pressing `/` anywhere focuses the nearest search box. Styling: neutral greys, one accent hue (emerald) shared with the map, covers as the dominant visual; no dark mode in v1.

| Route | Screen | Must have |
| --- | --- | --- |
| `/` | Library | Status tabs across the top: Finished (default) · Reading · Owned · Wishlist, each with its count. Grid of `BookCard` (cover, title, primary author, flag + country name, rating stars when finished, date finished or started). Sort: date finished (default), date added, title, author, rating. Text filter over title/author. Status changeable from the card via a small dropdown. Empty state links to `/add`. |
| `/add` | Add book | One input accepting ISBN or text, submit on Enter. ISBN → straight to the form; text → results list (cover, title, first author, year), pick one → form. Form is pre-filled with cover, title, author(s), year, pages. Country row reads `Born in {birthPlaceLabel} → {flag} {country}` with a Change button opening `CountrySelect`; unresolved shows the select directly. Then status (default Finished), date started / finished, rating (only when Finished), notes. Save → `/book/:id`. Duplicate check on `isbn13` or `olWorkKey` warns and links to the existing book. `Add manually` link opens the form empty. |
| `/book/:id` | Book detail | Large cover, all fields editable inline with autosave (debounced). Status segmented control. Country row as on Add plus a `Re-resolve` button (respects `countryOverridden`). Notes as a growing textarea. Delete with confirm. Back link to the previous list or map. |
| `/map` | Map | Stats header, `WorldMap`, `CountryPanel` (side panel ≥ 1024 px, bottom sheet below), country list under the map. Selected country mirrored in `?c=` so the URL is shareable with yourself. |
| `/settings` | Settings | Export JSON, Import JSON (Replace / Merge choice after validation), Clear library (type `DELETE` to confirm), API cache size + Clear cache, app version from `package.json`. |

`CountrySelect` is a searchable list of all `world-countries` entries (flag + common name), filtering on name and `cca2`, keyboard navigable. `RatingInput` is five clickable stars with keyboard support (arrows, 1–5).

## Build order and acceptance

Work in this order, committing after each step with a conventional-commit message. Run `npm run lint && npm test && npm run build` before every commit; a red step is fixed before moving on.

1. Scaffold: Vite `react-ts`, Tailwind, react-router, ESLint + Prettier, Vitest. `npm run dev` shows the nav shell with five empty routes.
2. `schema.ts`, `storage.ts`, `booksContext.tsx`; tests for `migrate` (accepts v1, rejects unknown) and load/save round-trip.
3. `isbn.ts` with tests: detection, checksum for 10 and 13, hyphen/space stripping, 10→13 conversion, `X` check digit.
4. `cache.ts` and `openLibrary.ts`. Before writing parsers, `curl` three live responses — an ISBN-13, a hyphenated ISBN-10, a title search — and save them as test fixtures.
5. `wikidata.ts` with the fixture tests listed in the resolution section. Then verify live against three authors: one whose OL record has `remote_ids.wikidata`, Vladimir Nabokov (born Saint Petersburg; must resolve to RU through the current-country rule), and one only reachable by name search.
6. `countries.ts` with the 195-entry denominator test.
7. Add flow, Library, Book detail.
8. `WorldMap`, `CountryPanel`, Map page.
9. Settings: export, import, clear, cache.
10. `README.md`: setup, how lookup and country resolution work, Decisions, Known limitations. Seed script `npm run seed` that writes 8 sample books across 6 countries into localStorage for demos.

Acceptance criteria (all must hold on a clean clone with Node 20):

- [ ] `npm install && npm run dev` starts; `npm run build`, `npm run lint`, `npm test` pass
- [ ] Adding by ISBN-13, by hyphenated ISBN-10 and by title search all reach a pre-filled form
- [ ] Searching `Lolita Nabokov` and saving yields country RU with birthplace label Saint Petersburg
- [ ] An author with no Wikidata match leaves the country unresolved, the form asks for one, and a manual pick survives `Re-resolve`
- [ ] The four statuses are selectable everywhere a status is shown; only `finished` books colour the map and count in the percentage, and flipping a book from finished to reading updates the map immediately
- [ ] Clicking a coloured country shows exactly the finished books with that code; a finished book from a country absent in the 110m geometry still appears in the list under the map and in the percentage
- [ ] Export then Import (Replace) in a fresh browser profile reproduces the identical library
- [ ] Reloading keeps everything; viewing an existing library needs no network except cover images
- [ ] Usable at 375 px and 1280 px widths with no horizontal scroll

Out of scope for this pass, even if tempting: accounts, backend, zoom/pan, dark mode, Goodreads import.
