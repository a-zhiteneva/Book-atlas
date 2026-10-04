import { Link } from 'react-router-dom';
import type { Book, ReadingStatus } from '../state/schema';
import { countryName } from '../lib/countries';
import { coverUrl } from '../lib/openLibrary';

interface Props {
  cca2: string;
  books: Book[];
  onClose: () => void;
}

const GROUPS: Array<{ status: ReadingStatus; label: string }> = [
  { status: 'finished', label: 'Finished' },
  { status: 'reading', label: 'Reading' },
  { status: 'owned', label: 'Owned' },
  { status: 'wishlist', label: 'Wishlist' },
];

function groupByStatus(books: Book[]): Record<ReadingStatus, Book[]> {
  const out: Record<ReadingStatus, Book[]> = {
    finished: [],
    reading: [],
    owned: [],
    wishlist: [],
  };
  for (const b of books) out[b.status].push(b);
  for (const key of Object.keys(out) as ReadingStatus[]) {
    out[key].sort((a, b) => a.title.localeCompare(b.title));
  }
  return out;
}

export default function CountryPanel({ cca2, books, onClose }: Props) {
  const grouped = groupByStatus(books);
  const anyBooks = books.length > 0;

  return (
    <aside className="bg-white border rounded p-4">
      <header className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">{countryName(cca2)}</h2>
          <span className="text-sm text-gray-500">
            {books.length} {books.length === 1 ? 'book' : 'books'}
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-sm text-gray-500 hover:underline"
          aria-label="Close"
        >
          Close
        </button>
      </header>

      {!anyBooks ? (
        <div className="text-sm text-gray-500">
          No books from {countryName(cca2)} yet.{' '}
          <Link to="/add" className="text-emerald-700 underline">
            Add one
          </Link>
          .
        </div>
      ) : (
        <div className="space-y-4">
          {GROUPS.map(({ status, label }) => {
            const list = grouped[status];
            if (list.length === 0) return null;
            return (
              <section key={status}>
                <h3 className="text-xs uppercase tracking-wide text-gray-500 mb-1 flex items-center gap-2">
                  <span>{label}</span>
                  <span className="bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded text-[10px]">
                    {list.length}
                  </span>
                </h3>
                <ul className="divide-y">
                  {list.map((b) => {
                    const cover = coverUrl(b.coverId, 'S');
                    return (
                      <li key={b.id}>
                        <Link
                          to={`/book/${b.id}`}
                          className="flex gap-3 py-2 hover:bg-gray-50 rounded px-1"
                        >
                          <div className="w-10 h-14 bg-gray-100 rounded overflow-hidden flex-shrink-0">
                            {cover && (
                              <img src={cover} alt="" className="w-full h-full object-cover" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">{b.title}</div>
                            <div className="text-xs text-gray-600 truncate">
                              {b.authors[0]?.name ?? 'Unknown author'}
                            </div>
                            <div className="text-xs text-gray-400">
                              {b.status === 'finished' && b.rating && '★'.repeat(b.rating)}
                              {b.status === 'finished' && b.dateFinished && ` · ${b.dateFinished}`}
                              {b.status === 'reading' && b.dateStarted && `Started ${b.dateStarted}`}
                            </div>
                          </div>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </aside>
  );
}
