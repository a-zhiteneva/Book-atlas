#!/usr/bin/env node
// Writes a sample library JSON to book-atlas-seed.json. Import it from the
// Settings page (Replace) to see the app with eight books across six
// countries. Browsers own localStorage so a Node script can't poke it directly.

import { writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';

const now = new Date();
const nowIso = now.toISOString();
const today = nowIso.slice(0, 10);

function book({ title, author, country, place, year, rating, pages, isbn13, coverId, daysAgo = 0 }) {
  const finished = new Date(now.getTime() - daysAgo * 86400000).toISOString().slice(0, 10);
  return {
    id: randomUUID(),
    title,
    authors: [
      {
        name: author,
        birthCountry: country,
        birthPlaceLabel: place,
        resolution: 'wikidata-birthplace',
      },
    ],
    isbn13,
    coverId,
    firstPublishYear: year,
    pages,
    status: 'finished',
    dateFinished: finished,
    rating,
    notes: '',
    countryCode: country,
    countryOverridden: false,
    addedAt: nowIso,
    updatedAt: nowIso,
  };
}

const library = {
  version: 1,
  books: [
    book({
      title: 'Lolita',
      author: 'Vladimir Nabokov',
      country: 'RU',
      place: 'Saint Petersburg',
      year: 1955,
      pages: 336,
      rating: 5,
      daysAgo: 7,
    }),
    book({
      title: 'Pale Fire',
      author: 'Vladimir Nabokov',
      country: 'RU',
      place: 'Saint Petersburg',
      year: 1962,
      pages: 315,
      rating: 4,
      daysAgo: 60,
    }),
    book({
      title: 'Beloved',
      author: 'Toni Morrison',
      country: 'US',
      place: 'Lorain, Ohio',
      year: 1987,
      pages: 324,
      rating: 5,
      daysAgo: 20,
    }),
    book({
      title: 'The Old Man and the Sea',
      author: 'Ernest Hemingway',
      country: 'US',
      place: 'Oak Park, Illinois',
      year: 1952,
      pages: 127,
      rating: 4,
      daysAgo: 110,
    }),
    book({
      title: 'The Remains of the Day',
      author: 'Kazuo Ishiguro',
      country: 'JP',
      place: 'Nagasaki',
      year: 1989,
      pages: 258,
      rating: 5,
      daysAgo: 40,
    }),
    book({
      title: 'One Hundred Years of Solitude',
      author: 'Gabriel García Márquez',
      country: 'CO',
      place: 'Aracataca',
      year: 1967,
      pages: 417,
      rating: 5,
      daysAgo: 180,
    }),
    book({
      title: 'The Trial',
      author: 'Franz Kafka',
      country: 'CZ',
      place: 'Prague',
      year: 1925,
      pages: 255,
      rating: 4,
      daysAgo: 300,
    }),
    book({
      title: 'Things Fall Apart',
      author: 'Chinua Achebe',
      country: 'NG',
      place: 'Ogidi',
      year: 1958,
      pages: 209,
      rating: 5,
      daysAgo: 90,
    }),
  ],
};

const out = resolve(process.cwd(), 'book-atlas-seed.json');
writeFileSync(out, JSON.stringify(library, null, 2));
console.log(`Wrote ${library.books.length} books across 6 countries to ${out}`);
console.log(`Import via Settings > Import (Replace).`);
