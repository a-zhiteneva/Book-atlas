import { Link } from 'react-router-dom';
import type { Book, ReadingStatus } from '../state/schema';
import { countryName } from '../lib/countries';
import { coverUrl } from '../lib/openLibrary';
import { useBooks } from '../state/booksContext';

interface Props {
  book: Book;
}

const STATUS_LABEL: Record<ReadingStatus, string> = {
  wishlist: 'Wishlist',
  owned: 'Owned',
  reading: 'Reading',
  finished: 'Finished',
};

export default function BookCard({ book }: Props) {
  const { updateBook } = useBooks();
  const cover = coverUrl(book.coverId);

  return (
    <div className="flex flex-col rounded border bg-white hover:shadow-sm transition overflow-hidden">
      <Link to={`/book/${book.id}`} className="block aspect-[2/3] bg-gray-100">
        {cover ? (
          <img src={cover} alt={book.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs text-center px-2">
            {book.title}
          </div>
        )}
      </Link>
      <div className="p-3 flex flex-col gap-1 flex-1">
        <Link to={`/book/${book.id}`} className="font-medium leading-tight line-clamp-2">
          {book.title}
        </Link>
        <div className="text-sm text-gray-600 line-clamp-1">
          {book.authors[0]?.name ?? 'Unknown author'}
        </div>
        <div className="text-xs text-gray-500">{countryName(book.countryCode)}</div>
        {book.status === 'finished' && book.rating && (
          <div className="text-emerald-600 text-sm">{'★'.repeat(book.rating)}</div>
        )}
        {book.status === 'finished' && book.dateFinished && (
          <div className="text-xs text-gray-500">Finished {book.dateFinished}</div>
        )}
        {book.status === 'reading' && book.dateStarted && (
          <div className="text-xs text-gray-500">Started {book.dateStarted}</div>
        )}
        <div className="mt-2">
          <select
            value={book.status}
            onChange={(e) => updateBook(book.id, { status: e.target.value as ReadingStatus })}
            className="w-full text-xs border rounded px-1 py-1 bg-gray-50"
          >
            {(['wishlist', 'owned', 'reading', 'finished'] as ReadingStatus[]).map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
