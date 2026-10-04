import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import BookCard from '../components/BookCard';
import { useBooks } from '../state/booksContext';
import type { ReadingStatus } from '../state/schema';

const STATUS_ORDER: ReadingStatus[] = ['finished', 'reading', 'owned', 'wishlist'];
const STATUS_LABEL: Record<ReadingStatus, string> = {
  finished: 'Finished',
  reading: 'Reading',
  owned: 'Owned',
  wishlist: 'Wishlist',
};

type SortKey = 'dateFinished' | 'dateAdded' | 'title' | 'author' | 'rating';

const SORT_LABEL: Record<SortKey, string> = {
  dateFinished: 'Date finished',
  dateAdded: 'Date added',
  title: 'Title',
  author: 'Author',
  rating: 'Rating',
};

export default function Library() {
  const { library } = useBooks();
  const [tab, setTab] = useState<ReadingStatus>('finished');
  const [sort, setSort] = useState<SortKey>('dateFinished');
  const [query, setQuery] = useState('');
  const searchRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = document.activeElement?.tagName;
      if (e.key === '/' && tag !== 'INPUT' && tag !== 'TEXTAREA') {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const counts = useMemo(() => {
    const c: Record<ReadingStatus, number> = { finished: 0, reading: 0, owned: 0, wishlist: 0 };
    for (const b of library.books) c[b.status]++;
    return c;
  }, [library]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const books = library.books
      .filter((b) => b.status === tab)
      .filter((b) => {
        if (!q) return true;
        return (
          b.title.toLowerCase().includes(q) ||
          b.authors.some((a) => a.name.toLowerCase().includes(q))
        );
      });
    const sorted = [...books];
    sorted.sort((a, b) => {
      switch (sort) {
        case 'dateFinished':
          return (b.dateFinished ?? '').localeCompare(a.dateFinished ?? '');
        case 'dateAdded':
          return b.addedAt.localeCompare(a.addedAt);
        case 'title':
          return a.title.localeCompare(b.title);
        case 'author':
          return (a.authors[0]?.name ?? '').localeCompare(b.authors[0]?.name ?? '');
        case 'rating':
          return (b.rating ?? 0) - (a.rating ?? 0);
      }
    });
    return sorted;
  }, [library, tab, query, sort]);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="flex gap-1 bg-gray-100 rounded p-1">
          {STATUS_ORDER.map((s) => (
            <button
              key={s}
              onClick={() => setTab(s)}
              className={[
                'px-3 py-1 rounded text-sm transition',
                tab === s ? 'bg-white shadow-sm font-medium' : 'text-gray-600 hover:text-gray-900',
              ].join(' ')}
            >
              {STATUS_LABEL[s]} <span className="text-gray-400">{counts[s]}</span>
            </button>
          ))}
        </div>
        <div className="flex-1" />
        <input
          ref={searchRef}
          type="text"
          placeholder="Filter title or author  (press / to focus)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="border rounded px-3 py-1 text-sm w-full sm:w-64"
        />
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className="border rounded px-2 py-1 text-sm bg-white"
        >
          {(Object.keys(SORT_LABEL) as SortKey[]).map((k) => (
            <option key={k} value={k}>
              Sort: {SORT_LABEL[k]}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center text-gray-500 py-12">
          No books here yet.{' '}
          <Link to="/add" className="text-emerald-700 underline">
            Add one
          </Link>
          .
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filtered.map((b) => (
            <BookCard key={b.id} book={b} />
          ))}
        </div>
      )}
    </div>
  );
}
