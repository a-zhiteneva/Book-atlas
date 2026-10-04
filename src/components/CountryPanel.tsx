import { Link } from 'react-router-dom';
import type { Book } from '../state/schema';
import { countryFlag, countryName } from '../lib/countries';
import { coverUrl } from '../lib/openLibrary';

interface Props {
  cca2: string;
  books: Book[];
  onClose: () => void;
}

export default function CountryPanel({ cca2, books, onClose }: Props) {
  return (
    <aside className="bg-white border rounded p-4">
      <header className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl leading-none">{countryFlag(cca2)}</span>
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
      {books.length === 0 ? (
        <div className="text-sm text-gray-500">No finished books yet.</div>
      ) : (
        <ul className="divide-y">
          {books.map((b) => {
            const cover = coverUrl(b.coverId, 'S');
            return (
              <li key={b.id}>
                <Link
                  to={`/book/${b.id}`}
                  className="flex gap-3 py-2 hover:bg-gray-50 rounded px-1"
                >
                  <div className="w-10 h-14 bg-gray-100 rounded overflow-hidden flex-shrink-0">
                    {cover && <img src={cover} alt="" className="w-full h-full object-cover" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{b.title}</div>
                    <div className="text-xs text-gray-600 truncate">
                      {b.authors[0]?.name ?? 'Unknown author'}
                    </div>
                    <div className="text-xs text-gray-400">
                      {b.rating ? '★'.repeat(b.rating) : ''}
                      {b.dateFinished && ` · ${b.dateFinished}`}
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </aside>
  );
}
