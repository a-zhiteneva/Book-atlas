import { FormEvent, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useBooks } from '../state/booksContext';
import { parseLookup } from '../lib/isbn';
import type { SearchHit } from '../lib/openLibrary';
import {
  PendingBook,
  makeBookFromPending,
  pendingFromIsbn,
  pendingFromSearchHit,
  search,
} from '../lib/lookup';
import SearchResults from '../components/SearchResults';
import CountrySelect from '../components/CountrySelect';
import RatingInput from '../components/RatingInput';
import { countryFlag, countryName } from '../lib/countries';
import { coverUrl, NotFoundError } from '../lib/openLibrary';
import type { Rating, ReadingStatus } from '../state/schema';

type Stage =
  | { kind: 'input' }
  | { kind: 'searching'; query: string }
  | { kind: 'results'; hits: SearchHit[]; query: string }
  | { kind: 'loading-detail' }
  | { kind: 'form'; pending: PendingBook }
  | { kind: 'error'; message: string };

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function emptyPending(): PendingBook {
  return {
    title: '',
    authors: [{ name: '', birthCountry: null, resolution: 'unresolved' }],
  };
}

export default function AddBook() {
  const { library, addBook } = useBooks();
  const navigate = useNavigate();
  const [stage, setStage] = useState<Stage>({ kind: 'input' });
  const [raw, setRaw] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [duplicateId, setDuplicateId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const handler = (e: KeyboardEvent) => {
      const tag = document.activeElement?.tagName;
      if (e.key === '/' && tag !== 'INPUT' && tag !== 'TEXTAREA') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const findDuplicate = (pending: PendingBook) =>
    library.books.find(
      (b) =>
        (pending.isbn13 && b.isbn13 === pending.isbn13) ||
        (pending.olWorkKey && b.olWorkKey === pending.olWorkKey),
    );

  const openFormForIsbn = async (isbn: string) => {
    setStage({ kind: 'loading-detail' });
    try {
      const pending = await pendingFromIsbn(isbn);
      const dup = findDuplicate(pending);
      setDuplicateId(dup?.id ?? null);
      if (dup) setNotice('Already in library.');
      setStage({ kind: 'form', pending });
    } catch (e) {
      if (e instanceof NotFoundError) {
        setNotice('Not found — add manually.');
        setStage({ kind: 'form', pending: { ...emptyPending(), isbn13: isbn } });
      } else {
        setStage({ kind: 'error', message: 'Could not reach Open Library.' });
      }
    }
  };

  const openFormForHit = async (hit: SearchHit) => {
    setStage({ kind: 'loading-detail' });
    try {
      const pending = await pendingFromSearchHit(hit);
      const dup = findDuplicate(pending);
      setDuplicateId(dup?.id ?? null);
      if (dup) setNotice('Already in library.');
      setStage({ kind: 'form', pending });
    } catch {
      setStage({ kind: 'error', message: 'Could not reach Open Library.' });
    }
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setNotice(null);
    const parsed = parseLookup(raw);
    if (parsed.kind === 'isbn') {
      void openFormForIsbn(parsed.isbn13);
    } else if (parsed.kind === 'invalid-isbn') {
      setNotice('Not a valid ISBN, searching by text instead.');
      await runSearch(parsed.query);
    } else {
      await runSearch(parsed.query);
    }
  };

  const runSearch = async (q: string) => {
    if (!q.trim()) return;
    setStage({ kind: 'searching', query: q });
    try {
      const hits = await search(q);
      setStage({ kind: 'results', hits, query: q });
    } catch {
      setStage({ kind: 'error', message: 'Search failed. Try again.' });
    }
  };

  const openManual = () => {
    setNotice(null);
    setStage({ kind: 'form', pending: emptyPending() });
  };

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Add a book</h1>

      {notice && (
        <div className="mb-3 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2 flex items-center gap-2">
          <span>{notice}</span>
          {duplicateId && (
            <Link to={`/book/${duplicateId}`} className="underline">
              Open existing
            </Link>
          )}
        </div>
      )}

      {stage.kind !== 'form' && (
        <form onSubmit={submit} className="flex gap-2 mb-4">
          <input
            ref={inputRef}
            type="text"
            placeholder="ISBN or title + author  (press / to focus)"
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            className="flex-1 border rounded px-3 py-2"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700"
          >
            Look up
          </button>
        </form>
      )}

      {stage.kind === 'input' && (
        <button type="button" onClick={openManual} className="text-sm text-emerald-700 underline">
          Add manually
        </button>
      )}

      {stage.kind === 'searching' && <div className="text-gray-500">Searching for “{stage.query}”…</div>}
      {stage.kind === 'results' && (
        <>
          <div className="text-xs text-gray-500 mb-2">
            {stage.hits.length} results for “{stage.query}”.{' '}
            <button type="button" onClick={openManual} className="underline">
              Add manually
            </button>
          </div>
          <SearchResults hits={stage.hits} onPick={openFormForHit} />
        </>
      )}
      {stage.kind === 'loading-detail' && <div className="text-gray-500">Loading details…</div>}
      {stage.kind === 'error' && (
        <div className="text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2 text-sm">
          {stage.message}
        </div>
      )}

      {stage.kind === 'form' && (
        <PendingForm
          initial={stage.pending}
          onCancel={() => {
            setNotice(null);
            setStage({ kind: 'input' });
          }}
          onSave={(book) => {
            addBook(book);
            navigate(`/book/${book.id}`);
          }}
        />
      )}
    </div>
  );
}

interface FormProps {
  initial: PendingBook;
  onCancel: () => void;
  onSave: (book: ReturnType<typeof makeBookFromPending>) => void;
}

function PendingForm({ initial, onCancel, onSave }: FormProps) {
  const [pending, setPending] = useState<PendingBook>(initial);
  const [status, setStatus] = useState<ReadingStatus>('finished');
  const [dateStarted, setDateStarted] = useState('');
  const [dateFinished, setDateFinished] = useState(() => today());
  const [rating, setRating] = useState<Rating | undefined>(undefined);
  const [notes, setNotes] = useState('');
  const primary = pending.authors[0];
  const [country, setCountry] = useState<string | null>(primary?.birthCountry ?? null);
  const [overridden, setOverridden] = useState(false);
  const [changing, setChanging] = useState(primary && !primary.birthCountry ? true : false);

  const cover = coverUrl(pending.coverId);

  useEffect(() => {
    if (status === 'reading' && !dateStarted) setDateStarted(today());
    if (status === 'finished' && !dateFinished) setDateFinished(today());
  }, [status, dateStarted, dateFinished]);

  const save = () => {
    const book = makeBookFromPending(pending, {
      status,
      dateStarted: status === 'reading' || status === 'finished' ? dateStarted || undefined : undefined,
      dateFinished: status === 'finished' ? dateFinished || undefined : undefined,
      rating: status === 'finished' ? rating : undefined,
      notes,
      countryCode: country,
      countryOverridden: overridden,
    });
    onSave(book);
  };

  return (
    <div className="grid md:grid-cols-[160px_1fr] gap-4 mt-4">
      <div className="aspect-[2/3] bg-gray-100 rounded overflow-hidden">
        {cover ? (
          <img src={cover} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
            No cover
          </div>
        )}
      </div>
      <div className="flex flex-col gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-gray-500">Title</span>
          <input
            type="text"
            value={pending.title}
            onChange={(e) => setPending({ ...pending, title: e.target.value })}
            className="border rounded px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-gray-500">
            Primary author{pending.authors.length > 1 ? ` (+ ${pending.authors.length - 1} more)` : ''}
          </span>
          <input
            type="text"
            value={primary?.name ?? ''}
            onChange={(e) => {
              const next = [...pending.authors];
              if (next[0]) next[0] = { ...next[0], name: e.target.value };
              else next[0] = { name: e.target.value, birthCountry: null, resolution: 'unresolved' };
              setPending({ ...pending, authors: next });
            }}
            className="border rounded px-3 py-2"
          />
        </label>

        <div className="flex flex-col gap-1">
          <span className="text-xs text-gray-500">Country</span>
          {!changing && country ? (
            <div className="flex items-center gap-2">
              <span className="text-xl leading-none">{countryFlag(country)}</span>
              <span>
                {primary?.birthPlaceLabel ? (
                  <>
                    Born in {primary.birthPlaceLabel} → {countryName(country)}
                  </>
                ) : (
                  countryName(country)
                )}
              </span>
              <button
                type="button"
                onClick={() => setChanging(true)}
                className="text-xs text-emerald-700 underline ml-2"
              >
                Change
              </button>
            </div>
          ) : (
            <>
              {!primary?.birthCountry && (
                <div className="text-xs text-gray-500">
                  Couldn’t detect — pick one.
                </div>
              )}
              <CountrySelect
                value={country}
                onChange={(c) => {
                  setCountry(c);
                  setOverridden(true);
                  setChanging(false);
                }}
              />
            </>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-gray-500">Year</span>
            <input
              type="number"
              value={pending.firstPublishYear ?? ''}
              onChange={(e) =>
                setPending({
                  ...pending,
                  firstPublishYear: e.target.value ? Number(e.target.value) : undefined,
                })
              }
              className="border rounded px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-gray-500">Pages</span>
            <input
              type="number"
              value={pending.pages ?? ''}
              onChange={(e) =>
                setPending({
                  ...pending,
                  pages: e.target.value ? Number(e.target.value) : undefined,
                })
              }
              className="border rounded px-3 py-2"
            />
          </label>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-xs text-gray-500">Status</span>
          <StatusPicker value={status} onChange={setStatus} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-gray-500">Date started</span>
            <input
              type="date"
              value={dateStarted}
              onChange={(e) => setDateStarted(e.target.value)}
              className="border rounded px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-gray-500">Date finished</span>
            <input
              type="date"
              value={dateFinished}
              onChange={(e) => setDateFinished(e.target.value)}
              className="border rounded px-3 py-2"
              disabled={status !== 'finished'}
            />
          </label>
        </div>

        {status === 'finished' && (
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500">Rating</span>
            <RatingInput value={rating} onChange={setRating} />
          </div>
        )}

        <label className="flex flex-col gap-1">
          <span className="text-xs text-gray-500">Notes</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            className="border rounded px-3 py-2"
          />
        </label>

        <div className="flex gap-2 mt-2">
          <button
            type="button"
            onClick={save}
            className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700"
          >
            Save
          </button>
          <button type="button" onClick={onCancel} className="px-4 py-2 border rounded">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export function StatusPicker({
  value,
  onChange,
}: {
  value: ReadingStatus;
  onChange: (next: ReadingStatus) => void;
}) {
  const options: Array<{ value: ReadingStatus; label: string }> = [
    { value: 'wishlist', label: 'Wishlist' },
    { value: 'owned', label: 'Owned' },
    { value: 'reading', label: 'Reading' },
    { value: 'finished', label: 'Finished' },
  ];
  return (
    <div className="inline-flex rounded border overflow-hidden bg-white">
      {options.map((o) => (
        <button
          type="button"
          key={o.value}
          onClick={() => onChange(o.value)}
          className={[
            'px-3 py-1 text-sm',
            value === o.value
              ? 'bg-emerald-600 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-50',
          ].join(' ')}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
