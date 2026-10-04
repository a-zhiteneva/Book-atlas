import { describe, expect, test } from 'vitest';
import { continentFor, bucket } from '../lib/continents';

describe('continentFor', () => {
  test('North America: US, CA, MX land in north-america', () => {
    expect(continentFor('US')).toBe('north-america');
    expect(continentFor('CA')).toBe('north-america');
    expect(continentFor('MX')).toBe('north-america');
  });

  test('Caribbean and Central America also fold into north-america', () => {
    expect(continentFor('CU')).toBe('north-america');
    expect(continentFor('GT')).toBe('north-america');
    expect(continentFor('PA')).toBe('north-america');
  });

  test('South America: BR, AR, CO', () => {
    expect(continentFor('BR')).toBe('south-america');
    expect(continentFor('AR')).toBe('south-america');
    expect(continentFor('CO')).toBe('south-america');
  });

  test('Europe: GB, DE, RU, CY (Cyprus stays in Europe per world-countries)', () => {
    expect(continentFor('GB')).toBe('europe');
    expect(continentFor('DE')).toBe('europe');
    expect(continentFor('RU')).toBe('europe');
    expect(continentFor('CY')).toBe('europe');
  });

  test('Middle East (Western Asia subregion): TR, IL, SA, AE, JO, LB', () => {
    expect(continentFor('TR')).toBe('middle-east');
    expect(continentFor('IL')).toBe('middle-east');
    expect(continentFor('SA')).toBe('middle-east');
    expect(continentFor('AE')).toBe('middle-east');
    expect(continentFor('JO')).toBe('middle-east');
    expect(continentFor('LB')).toBe('middle-east');
  });

  test('Iran and Afghanistan land in Asia (world-countries puts them in Southern Asia)', () => {
    expect(continentFor('IR')).toBe('asia');
    expect(continentFor('AF')).toBe('asia');
  });

  test('Africa: EG, NG, ZA (Egypt stays Africa per world-countries)', () => {
    expect(continentFor('EG')).toBe('africa');
    expect(continentFor('NG')).toBe('africa');
    expect(continentFor('ZA')).toBe('africa');
  });

  test('Asia (non-Western): CN, JP, IN, TH', () => {
    expect(continentFor('CN')).toBe('asia');
    expect(continentFor('JP')).toBe('asia');
    expect(continentFor('IN')).toBe('asia');
    expect(continentFor('TH')).toBe('asia');
  });

  test('Oceania: AU, NZ, FJ', () => {
    expect(continentFor('AU')).toBe('oceania');
    expect(continentFor('NZ')).toBe('oceania');
    expect(continentFor('FJ')).toBe('oceania');
  });

  test('Nullish and unknown codes return null', () => {
    expect(continentFor(null)).toBeNull();
    expect(continentFor(undefined)).toBeNull();
    expect(continentFor('ZZ')).toBeNull();
  });
});

describe('bucket', () => {
  test('maps counts to 0/1/2/3 at the spec boundaries', () => {
    expect(bucket(0)).toBe(0);
    expect(bucket(1)).toBe(1);
    expect(bucket(2)).toBe(2);
    expect(bucket(4)).toBe(2);
    expect(bucket(5)).toBe(3);
    expect(bucket(99)).toBe(3);
  });
});
