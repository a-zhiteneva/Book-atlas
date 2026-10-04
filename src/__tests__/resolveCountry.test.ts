import { describe, expect, test, beforeEach, afterEach, vi } from 'vitest';
import nabokovEntity from './fixtures/wd-Q36591.json';
import stPetersburgEntity from './fixtures/wd-Q656.json';
import russiaEntity from './fixtures/wd-Q159.json';
import nabokovSearch from './fixtures/wd-search-nabokov.json';
import { resolveAuthorCountry } from '../lib/wikidata';
import { cacheClear } from '../lib/cache';

type FetchMock = ReturnType<typeof vi.fn>;

function respond(json: unknown) {
  return { ok: true, status: 200, json: async () => json };
}

function notFound() {
  return { ok: false, status: 404, json: async () => ({}) };
}

function routeFactory(routes: Record<string, unknown>): FetchMock {
  return vi.fn().mockImplementation(async (url: string) => {
    for (const [pattern, body] of Object.entries(routes)) {
      if (url.includes(pattern)) return respond(body);
    }
    return notFound();
  });
}

describe('resolveAuthorCountry', () => {
  beforeEach(() => {
    cacheClear();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    cacheClear();
  });

  test('uses supplied Wikidata id and resolves birthplace -> current country -> cca2', async () => {
    vi.stubGlobal(
      'fetch',
      routeFactory({
        'Q36591.json': nabokovEntity,
        'Q656.json': stPetersburgEntity,
        'Q159.json': russiaEntity,
      }),
    );
    const author = await resolveAuthorCountry({ name: 'Vladimir Nabokov', wikidataId: 'Q36591' });
    expect(author.birthCountry).toBe('RU');
    expect(author.birthPlaceLabel).toBe('Saint Petersburg');
    expect(author.resolution).toBe('wikidata-birthplace');
  });

  test('finds author via name search when no Wikidata id is supplied', async () => {
    vi.stubGlobal(
      'fetch',
      routeFactory({
        'wbsearchentities': nabokovSearch,
        'Q36591.json': nabokovEntity,
        'Q656.json': stPetersburgEntity,
        'Q159.json': russiaEntity,
      }),
    );
    const author = await resolveAuthorCountry({ name: 'Vladimir Nabokov' });
    expect(author.wikidataId).toBe('Q36591');
    expect(author.birthCountry).toBe('RU');
    expect(author.resolution).toBe('wikidata-birthplace');
  });

  test('follows P1366 when a historical state has no P297', async () => {
    const historical = {
      entities: {
        Q1: { id: 'Q1', claims: { P19: [claimItem('Q10')] } },
        Q10: { id: 'Q10', labels: { en: { language: 'en', value: 'Historical town' } }, claims: { P17: [claimItem('Q20')] } },
        Q20: { id: 'Q20', claims: { P1366: [claimItem('Q30')] } },
        Q30: { id: 'Q30', claims: { P297: [claimString('XX')] } },
      },
    };
    vi.stubGlobal(
      'fetch',
      routeFactory({
        'Q1.json': { entities: { Q1: historical.entities.Q1 } },
        'Q10.json': { entities: { Q10: historical.entities.Q10 } },
        'Q20.json': { entities: { Q20: historical.entities.Q20 } },
        'Q30.json': { entities: { Q30: historical.entities.Q30 } },
      }),
    );
    const author = await resolveAuthorCountry({ name: 'Historical Writer', wikidataId: 'Q1' });
    expect(author.birthCountry).toBe('XX');
    expect(author.resolution).toBe('wikidata-birthplace');
  });

  test('falls back to P27 citizenship when P19 is missing', async () => {
    const entA = { id: 'QA', claims: { P27: [claimItem('QC')] } };
    const entC = { id: 'QC', claims: { P297: [claimString('ZZ')] } };
    vi.stubGlobal(
      'fetch',
      routeFactory({
        'QA.json': { entities: { QA: entA } },
        'QC.json': { entities: { QC: entC } },
      }),
    );
    const author = await resolveAuthorCountry({ name: 'Stateless Writer', wikidataId: 'QA' });
    expect(author.birthCountry).toBe('ZZ');
    expect(author.resolution).toBe('wikidata-citizenship');
  });

  test('returns unresolved when name search finds nothing', async () => {
    vi.stubGlobal('fetch', routeFactory({ 'wbsearchentities': { search: [] } }));
    const author = await resolveAuthorCountry({ name: 'Totally Unknown' });
    expect(author.birthCountry).toBeNull();
    expect(author.resolution).toBe('unresolved');
  });
});

function claimItem(id: string) {
  return {
    mainsnak: {
      snaktype: 'value' as const,
      property: 'Pxx',
      datavalue: { type: 'wikibase-entityid', value: { id } },
    },
  };
}

function claimString(value: string) {
  return {
    mainsnak: {
      snaktype: 'value' as const,
      property: 'Pxx',
      datavalue: { type: 'string', value },
    },
  };
}
