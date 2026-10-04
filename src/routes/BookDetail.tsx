import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useBooks } from '../state/booksContext';
import { countryFlag, countryName } from '../lib/countries';
import { coverUrl } from '../lib/openLibrary';
import CountrySelect from '../components/CountrySelect';
import RatingInput from '../components/RatingInput';
import { StatusPicker } from './AddBook';
import { reresolvePrimaryAuthor } from '../lib/lookup';
import type { Author, Book, Rating } from '../state/schema';

export default function BookDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { library, updateBook, deleteBook } = useBooks();
  const book = library.books.find((b) => b.id === id);

  const [changingCountry, setChangingCountry] = useState(false);
  const [reresolving, setReresolving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [draft, setDraft] = useState<Book | null>(book ?? null);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    setDraft(book ?? null);
  }, [book]);

  const commit = (next: Partial<Book>) => {
    if (!book) return;
    setDraft((prev) => (prev ? { ...prev, ...next } : prev));
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      updateBook(book.id, next);
      timer.current = null;
    }, 300);
  };

  const primary: Author | undefined = useMemo(() => draft?.authors[0], [draft]);

  if (!book || !draft) {
    return (
      <div className="text-gray-500">
        Book not found. <Link to="/" className="text-emerald-700 underline">Back to library</Link>
      </div>
    );
  }

  const cover = coverUrl(book.coverId, 'L');

  const doReresolve = async () => {
    setReresolving(true);
    try {
      const nextAuthors = await reresolvePrimaryAuthor(book.authors);
      const patch: Partial<Book> = { authors: nextAuthors };
      if (!book.countryOverridden) patch.countryCode = nextAuthors[0]?.birthCountry ?? null;
      updateBook(book.id, patch);
    } finally {
      setReresolving(false);
    }
  };

  const doDelete = () => {
    deleteBook(book.id);
    navigate('/');
  };

  return (
    <div className="max-w-3xl mx-auto grid md:grid-cols-[200px_1fr] gap-6">
      <div className="aspect-[2/3] bg-gray-100 rounded overflow-hidden">
        {cover ? (
          <img src={cover} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            No cover
          </div>
        )}
      </div>
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4">
          <input
            type="text"
            value={draft.title}
            onChange={(e) => commit({ title: e.target.value })}
            className="text-2xl font-semibold border-b border-transparent focus:border-gray-300 outline-none bg-transparent flex-1"
          />
          <Link to="/" className="text-sm text-gray-500 hover:underline whitespace-nowrap">
            ← Back
          </Link>
        </div>

        <input
          type="text"
          value={primary?.name ?? ''}
          onChange={(e) => {
            const next = [...draft.authors];
            if (next[0]) next[0] = { ...next[0], name: e.target.value };
            else next[0] = { name: e.target.value, birthCountry: null, resolution: 'unresolved' };
            commit({ authors: next });
          }}
          className="text-lg text-gray-700 border-b border-transparent focus:border-gray-300 outline-none bg-transparent"
        />

        <div className="flex flex-col gap-1">
          <span className="text-xs text-gray-500">Country</span>
          {!changingCountry ? (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xl leading-none">{countryFlag(draft.countryCode)}</span>
              <span>
                {primary?.birthPlaceLabel ? (
                  <>
                    Born in {primary.birthPlaceLabel} → {countryName(draft.countryCode)}
                  </>
                ) : (
                  countryName(draft.countryCode)
                )}
              </span>
              <button
                type="button"
                onClick={() => setChangingCountry(true)}
                className="text-xs text-emerald-700 underline ml-2"
              >
                Change
              </button>
              <button
                type="button"
                onClick={doReresolve}
                disabled={reresolving}
                className="text-xs text-gray-600 underline"
              >
                {reresolving ? 'Re-resolving…' : 'Re-resolve'}
              </button>
              {draft.countryOverridden && (
                <span className="text-xs text-amber-700">(manual)</span>
              )}
            </div>
          ) : (
            <CountrySelect
              value={draft.countryCode}
              onChange={(c) => {
                commit({ countryCode: c, countryOverridden: true });
                setChangingCountry(false);
              }}
            />
          )}
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-xs text-gray-500">Status</span>
          <StatusPicker
            value={draft.status}
            onChange={(status) => {
              const patch: Partial<Book> = { status };
              if (status === 'reading' && !draft.dateStarted) patch.dateStarted = todayStr();
              if (status === 'finished' && !draft.dateFinished) patch.dateFinished = todayStr();
              commit(patch);
            }}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-gray-500">Date started</span>
            <input
              type="date"
              value={draft.dateStarted ?? ''}
              onChange={(e) => commit({ dateStarted: e.target.value || undefined })}
              className="border rounded px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-gray-500">Date finished</span>
            <input
              type="date"
              value={draft.dateFinished ?? ''}
              onChange={(e) => commit({ dateFinished: e.target.value || undefined })}
              className="border rounded px-3 py-2"
            />
          </label>
        </div>

        {draft.status === 'finished' && (
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500">Rating</span>
            <RatingInput
              value={draft.rating}
              onChange={(r: Rating | undefined) => commit({ rating: r })}
              size="lg"
            />
          </div>
        )}

        <label className="flex flex-col gap-1">
          <span className="text-xs text-gray-500">Notes</span>
          <textarea
            value={draft.notes}
            onChange={(e) => commit({ notes: e.target.value })}
            rows={6}
            className="border rounded px-3 py-2 min-h-24"
          />
        </label>

        <div className="flex items-center gap-3 pt-4 border-t">
          {!confirmDelete ? (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="text-sm text-red-600 hover:underline"
            >
              Delete book
            </button>
          ) : (
            <>
              <span className="text-sm text-red-700">Delete this book?</span>
              <button
                type="button"
                onClick={doDelete}
                className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
              >
                Yes, delete
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="px-3 py-1 border rounded text-sm"
              >
                Cancel
              </button>
            </>
          )}
          <div className="flex-1" />
          <div className="text-xs text-gray-400">Autosaved</div>
        </div>
      </div>
    </div>
  );
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}
