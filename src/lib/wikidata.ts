import { Author, CountryResolution } from '../state/schema';
import { fetchJson } from './openLibrary';

const WRITER_OCCUPATIONS = new Set([
  'Q36180', // writer
  'Q482980', // author
  'Q6625963', // novelist
  'Q49757', // poet
  'Q4853732', // children's writer
  'Q1930187', // journalist
  'Q214917', // playwright
  'Q28389', // screenwriter
  'Q11774202', // essayist
  'Q333634', // translator
]);

const MAX_P1366_HOPS = 3;

interface Snak {
  snaktype: 'value' | 'novalue' | 'somevalue';
  property: string;
  datavalue?: { value: unknown; type: string };
}

interface Claim {
  mainsnak: Snak;
  qualifiers?: Record<string, Snak[]>;
}

interface Entity {
  id: string;
  labels?: Record<string, { language: string; value: string }>;
  claims?: Record<string, Claim[]>;
}

interface EntityResponse {
  entities: Record<string, Entity>;
}

interface SearchResponse {
  search: Array<{ id: string; label?: string; description?: string }>;
}

async function fetchEntity(qid: string): Promise<Entity | undefined> {
  const url = `https://www.wikidata.org/wiki/Special:EntityData/${qid}.json`;
  const data = await fetchJson<EntityResponse>(url);
  return data.entities[qid];
}

function enLabel(ent: Entity): string | undefined {
  return ent.labels?.en?.value;
}

function itemIdFromClaim(c: Claim): string | undefined {
  const v = c.mainsnak.datavalue?.value as { id?: string } | undefined;
  return v?.id;
}

function stringValueFromClaim(c: Claim): string | undefined {
  const v = c.mainsnak.datavalue?.value;
  return typeof v === 'string' ? v : undefined;
}

function endTimeIso(c: Claim): string | undefined {
  const q = c.qualifiers?.P582?.[0];
  const v = q?.datavalue?.value as { time?: string } | undefined;
  return v?.time;
}

function pickBestClaim(claims: Claim[] | undefined): Claim | undefined {
  if (!claims || claims.length === 0) return undefined;
  const noEnd = claims.find((c) => !endTimeIso(c));
  if (noEnd) return noEnd;
  return [...claims].sort((a, b) => (endTimeIso(a) ?? '').localeCompare(endTimeIso(b) ?? '')).pop();
}

async function searchHuman(name: string): Promise<string | undefined> {
  const url = `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(name)}&language=en&type=item&limit=5&format=json&origin=*`;
  const data = await fetchJson<SearchResponse>(url);
  const candidates = data.search ?? [];
  if (candidates.length === 0) return undefined;

  const resolved: Array<{ id: string; isHuman: boolean; isWriter: boolean }> = [];
  for (const c of candidates) {
    const ent = await fetchEntity(c.id);
    if (!ent) continue;
    const p31 = (ent.claims?.P31 ?? []).map(itemIdFromClaim);
    const isHuman = p31.includes('Q5');
    const p106 = (ent.claims?.P106 ?? []).map(itemIdFromClaim).filter((x): x is string => !!x);
    const isWriter = p106.some((q) => WRITER_OCCUPATIONS.has(q));
    resolved.push({ id: c.id, isHuman, isWriter });
    if (isHuman && isWriter) return c.id;
  }
  const anyHuman = resolved.find((r) => r.isHuman);
  if (anyHuman) return anyHuman.id;
  return undefined;
}

async function resolveCountryViaP297(countryQid: string): Promise<string | undefined> {
  let currentId: string | undefined = countryQid;
  for (let hop = 0; hop <= MAX_P1366_HOPS; hop++) {
    if (!currentId) return undefined;
    const ent = await fetchEntity(currentId);
    if (!ent) return undefined;
    const code = stringValueFromClaim((ent.claims?.P297 ?? [])[0] ?? { mainsnak: { snaktype: 'novalue', property: 'P297' } });
    if (code) return code.toUpperCase();
    const next = pickBestClaim(ent.claims?.P1366);
    currentId = next ? itemIdFromClaim(next) : undefined;
  }
  return undefined;
}

async function resolveBirthplace(entity: Entity): Promise<{ code?: string; label?: string }> {
  const p19 = pickBestClaim(entity.claims?.P19);
  const placeId = p19 ? itemIdFromClaim(p19) : undefined;
  if (!placeId) return {};
  const place = await fetchEntity(placeId);
  if (!place) return {};
  const label = enLabel(place);

  const directCode = stringValueFromClaim((place.claims?.P297 ?? [])[0] ?? {
    mainsnak: { snaktype: 'novalue', property: 'P297' },
  });
  if (directCode) return { code: directCode.toUpperCase(), label };

  const p17 = pickBestClaim(place.claims?.P17);
  const countryId = p17 ? itemIdFromClaim(p17) : undefined;
  if (!countryId) return { label };
  const code = await resolveCountryViaP297(countryId);
  return { code, label };
}

async function resolveCitizenship(entity: Entity): Promise<string | undefined> {
  const p27 = pickBestClaim(entity.claims?.P27);
  const countryId = p27 ? itemIdFromClaim(p27) : undefined;
  if (!countryId) return undefined;
  return resolveCountryViaP297(countryId);
}

export interface AuthorSeed {
  name: string;
  olKey?: string;
  wikidataId?: string;
}

export async function resolveAuthorCountry(seed: AuthorSeed): Promise<Author> {
  const base: Author = {
    name: seed.name,
    olKey: seed.olKey,
    wikidataId: seed.wikidataId,
    birthCountry: null,
    resolution: 'unresolved',
  };

  let qid = seed.wikidataId;
  if (!qid) qid = await searchHuman(seed.name);
  if (!qid) return base;

  const entity = await fetchEntity(qid);
  if (!entity) return { ...base, wikidataId: qid };

  const { code: birthCode, label } = await resolveBirthplace(entity);
  if (birthCode) {
    return {
      ...base,
      wikidataId: qid,
      birthPlaceLabel: label,
      birthCountry: birthCode,
      resolution: 'wikidata-birthplace' as CountryResolution,
    };
  }

  const citizenshipCode = await resolveCitizenship(entity);
  if (citizenshipCode) {
    return {
      ...base,
      wikidataId: qid,
      birthPlaceLabel: label,
      birthCountry: citizenshipCode,
      resolution: 'wikidata-citizenship' as CountryResolution,
    };
  }

  return { ...base, wikidataId: qid, birthPlaceLabel: label };
}
