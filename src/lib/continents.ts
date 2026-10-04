import { getCountry } from './countries';

export type Continent =
  | 'north-america'
  | 'south-america'
  | 'europe'
  | 'middle-east'
  | 'africa'
  | 'asia'
  | 'oceania';

export const CONTINENT_ORDER: Continent[] = [
  'north-america',
  'south-america',
  'europe',
  'middle-east',
  'africa',
  'asia',
  'oceania',
];

export const CONTINENT_LABEL: Record<Continent, string> = {
  'north-america': 'North America',
  'south-america': 'South America',
  europe: 'Europe',
  'middle-east': 'Middle East',
  africa: 'Africa',
  asia: 'Asia',
  oceania: 'Oceania',
};

interface RegionCountry {
  region?: string;
  subregion?: string;
}

// Overrides vs. the raw world-countries region/subregion. These pull
// countries into Middle East that UN M.49 classifies elsewhere:
//   - IR, AF: subregion 'Southern Asia' in M.49 but culturally Middle East
//   - EG, LY, TN, DZ, MA: region 'Africa' / subregion 'Northern Africa'
//     but commonly treated as Middle East
const OVERRIDES: Record<string, Continent> = {
  IR: 'middle-east',
  AF: 'middle-east',
  EG: 'middle-east',
  LY: 'middle-east',
  TN: 'middle-east',
  DZ: 'middle-east',
  MA: 'middle-east',
};

export function continentFor(cca2: string | null | undefined): Continent | null {
  if (!cca2) return null;
  const upper = cca2.toUpperCase();
  if (OVERRIDES[upper]) return OVERRIDES[upper];
  const c = getCountry(upper) as unknown as RegionCountry | undefined;
  if (!c) return null;
  const region = c.region;
  const subregion = c.subregion;

  if (region === 'Africa') return 'africa';
  if (region === 'Europe') return 'europe';
  if (region === 'Oceania') return 'oceania';
  if (subregion === 'Western Asia') return 'middle-east';
  if (region === 'Asia') return 'asia';
  if (subregion === 'South America') return 'south-america';
  if (region === 'Americas') return 'north-america';
  return null;
}

export const CONTINENT_PALETTE: Record<Continent, [string, string, string, string]> = {
  // Tailwind sky-100/300/500/700
  'north-america': ['#e0f2fe', '#7dd3fc', '#0ea5e9', '#0369a1'],
  // amber-100/300/500/700
  'south-america': ['#fef3c7', '#fcd34d', '#f59e0b', '#b45309'],
  // rose-100/300/500/700
  europe: ['#ffe4e6', '#fda4af', '#f43f5e', '#be123c'],
  // orange-100/300/500/700
  'middle-east': ['#ffedd5', '#fdba74', '#f97316', '#c2410c'],
  // emerald-100/300/500/700
  africa: ['#d1fae5', '#6ee7b7', '#10b981', '#047857'],
  // violet-100/300/500/700
  asia: ['#ede9fe', '#c4b5fd', '#8b5cf6', '#6d28d9'],
  // cyan-100/300/500/700
  oceania: ['#cffafe', '#67e8f9', '#06b6d4', '#0e7490'],
};

export const NEUTRAL_FILL = '#e5e7eb';

export function bucket(count: number): 0 | 1 | 2 | 3 {
  if (count === 0) return 0;
  if (count === 1) return 1;
  if (count <= 4) return 2;
  return 3;
}
