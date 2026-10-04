import { describe, expect, test } from 'vitest';
import {
  UN_DENOMINATOR,
  isDenominatorCountry,
  getCountry,
  getCountryByCcn3,
  countryName,
  countryFlag,
} from '../lib/countries';

describe('UN_DENOMINATOR', () => {
  test('contains exactly 195 countries (193 members + 2 observers)', () => {
    expect(UN_DENOMINATOR.size).toBe(195);
  });

  test('includes Vatican (VA) and Palestine (PS) observers', () => {
    expect(UN_DENOMINATOR.has('VA')).toBe(true);
    expect(UN_DENOMINATOR.has('PS')).toBe(true);
  });

  test('excludes Taiwan (TW), Kosovo (XK), Hong Kong (HK), Puerto Rico (PR)', () => {
    expect(UN_DENOMINATOR.has('TW')).toBe(false);
    expect(UN_DENOMINATOR.has('XK')).toBe(false);
    expect(UN_DENOMINATOR.has('HK')).toBe(false);
    expect(UN_DENOMINATOR.has('PR')).toBe(false);
  });

  test('isDenominatorCountry handles lowercase + null/undefined', () => {
    expect(isDenominatorCountry('ru')).toBe(true);
    expect(isDenominatorCountry(null)).toBe(false);
    expect(isDenominatorCountry(undefined)).toBe(false);
  });
});

describe('getCountry / getCountryByCcn3 / helpers', () => {
  test('getCountry returns a known country', () => {
    const ru = getCountry('RU');
    expect(ru?.name.common).toBe('Russia');
    expect(ru?.flag).toBeDefined();
  });

  test('getCountryByCcn3 looks up by numeric code', () => {
    const ru = getCountryByCcn3('643');
    expect(ru?.cca2).toBe('RU');
  });

  test('countryName falls back to code when unknown and to "Unknown" when nullish', () => {
    expect(countryName('RU')).toBe('Russia');
    expect(countryName(null)).toBe('Unknown');
    expect(countryName('ZZ')).toBe('ZZ');
  });

  test('countryFlag has a sensible fallback', () => {
    expect(countryFlag('RU')).not.toBe('🏳️');
    expect(countryFlag(null)).toBe('🏳️');
  });
});
