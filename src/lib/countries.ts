import rawCountries from 'world-countries';

interface WorldCountry {
  cca2: string;
  ccn3: string;
  name: { common: string; official: string };
  flag: string;
  independent: boolean | null;
}

const COUNTRIES = rawCountries as unknown as WorldCountry[];

const CODE_TO_COUNTRY = new Map<string, WorldCountry>(COUNTRIES.map((c) => [c.cca2, c]));
const N3_TO_COUNTRY = new Map<string, WorldCountry>(COUNTRIES.map((c) => [c.ccn3, c]));

export function getCountry(cca2: string): WorldCountry | undefined {
  return CODE_TO_COUNTRY.get(cca2.toUpperCase());
}

export function getCountryByCcn3(ccn3: string): WorldCountry | undefined {
  return N3_TO_COUNTRY.get(ccn3);
}

export function countryName(cca2: string | null | undefined): string {
  if (!cca2) return 'Unknown';
  return getCountry(cca2)?.name.common ?? cca2;
}

export function countryFlag(cca2: string | null | undefined): string {
  if (!cca2) return '🏳️';
  return getCountry(cca2)?.flag ?? '🏳️';
}

export const UN_DENOMINATOR: ReadonlySet<string> = new Set([
  'AF', 'AL', 'DZ', 'AD', 'AO', 'AG', 'AR', 'AM', 'AU', 'AT', 'AZ',
  'BS', 'BH', 'BD', 'BB', 'BY', 'BE', 'BZ', 'BJ', 'BT', 'BO', 'BA', 'BW',
  'BR', 'BN', 'BG', 'BF', 'BI',
  'CV', 'KH', 'CM', 'CA', 'CF', 'TD', 'CL', 'CN', 'CO', 'KM', 'CG', 'CD',
  'CR', 'CI', 'HR', 'CU', 'CY', 'CZ',
  'DK', 'DJ', 'DM', 'DO',
  'EC', 'EG', 'SV', 'GQ', 'ER', 'EE', 'SZ', 'ET',
  'FJ', 'FI', 'FR',
  'GA', 'GM', 'GE', 'DE', 'GH', 'GR', 'GD', 'GT', 'GN', 'GW', 'GY',
  'HT', 'HN', 'HU',
  'IS', 'IN', 'ID', 'IR', 'IQ', 'IE', 'IL', 'IT',
  'JM', 'JP', 'JO',
  'KZ', 'KE', 'KI', 'KP', 'KR', 'KW', 'KG',
  'LA', 'LV', 'LB', 'LS', 'LR', 'LY', 'LI', 'LT', 'LU',
  'MG', 'MW', 'MY', 'MV', 'ML', 'MT', 'MH', 'MR', 'MU', 'MX', 'FM', 'MD',
  'MC', 'MN', 'ME', 'MA', 'MZ', 'MM',
  'NA', 'NR', 'NP', 'NL', 'NZ', 'NI', 'NE', 'NG', 'MK', 'NO',
  'OM',
  'PK', 'PW', 'PA', 'PG', 'PY', 'PE', 'PH', 'PL', 'PT',
  'QA',
  'RO', 'RU', 'RW',
  'KN', 'LC', 'VC', 'WS', 'SM', 'ST', 'SA', 'SN', 'RS', 'SC', 'SL', 'SG',
  'SK', 'SI', 'SB', 'SO', 'ZA', 'SS', 'ES', 'LK', 'SD', 'SR', 'SE', 'CH', 'SY',
  'TJ', 'TZ', 'TH', 'TL', 'TG', 'TO', 'TT', 'TN', 'TR', 'TM', 'TV',
  'UG', 'UA', 'AE', 'GB', 'US', 'UY', 'UZ',
  'VU', 'VE', 'VN',
  'YE',
  'ZM', 'ZW',
  // UN observer states:
  'VA', 'PS',
]);

export function isDenominatorCountry(cca2: string | null | undefined): boolean {
  if (!cca2) return false;
  return UN_DENOMINATOR.has(cca2.toUpperCase());
}

export interface CountrySelectOption {
  cca2: string;
  name: string;
  flag: string;
}

export function allCountryOptions(): CountrySelectOption[] {
  return COUNTRIES.map((c) => ({ cca2: c.cca2, name: c.name.common, flag: c.flag })).sort((a, b) =>
    a.name.localeCompare(b.name),
  );
}
