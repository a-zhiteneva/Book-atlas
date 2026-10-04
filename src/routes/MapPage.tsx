import { useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import WorldMap from '../components/WorldMap';
import CountryPanel from '../components/CountryPanel';
import { useBooks } from '../state/booksContext';
import { UN_DENOMINATOR, countryFlag, countryName, isDenominatorCountry } from '../lib/countries';

export default function MapPage() {
  const { library } = useBooks();
  const [params, setParams] = useSearchParams();
  const selected = params.get('c');

  const finished = useMemo(
    () => library.books.filter((b) => b.status === 'finished'),
    [library],
  );

  const countsByCca2 = useMemo(() => {
    const m: Record<string, number> = {};
    for (const b of finished) {
      if (!b.countryCode) continue;
      m[b.countryCode] = (m[b.countryCode] ?? 0) + 1;
    }
    return m;
  }, [finished]);

  const denominatorHits = Object.keys(countsByCca2).filter(isDenominatorCountry).length;
  const total = UN_DENOMINATOR.size;
  const pct = total ? ((denominatorHits / total) * 100).toFixed(1) : '0';

  const mostRead = useMemo(() => {
    const entries = Object.entries(countsByCca2).sort(([, a], [, b]) => b - a);
    return entries[0];
  }, [countsByCca2]);

  const booksForSelected = useMemo(() => {
    if (!selected) return [];
    return library.books.filter((b) => b.countryCode === selected);
  }, [library.books, selected]);

  const totalsByCca2 = useMemo(() => {
    const m: Record<string, number> = {};
    for (const b of library.books) {
      if (!b.countryCode) continue;
      m[b.countryCode] = (m[b.countryCode] ?? 0) + 1;
    }
    return m;
  }, [library]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selected) {
        const next = new URLSearchParams(params);
        next.delete('c');
        setParams(next);
      }
    };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [selected, params, setParams]);

  const setSelected = (cca2: string | null) => {
    const next = new URLSearchParams(params);
    if (cca2) next.set('c', cca2);
    else next.delete('c');
    setParams(next);
  };

  const sortedCountries = useMemo(() => {
    const codes = new Set<string>([
      ...Object.keys(countsByCca2),
      ...Object.keys(totalsByCca2),
    ]);
    return Array.from(codes)
      .map((cca2) => ({
        cca2,
        count: countsByCca2[cca2] ?? 0,
        total: totalsByCca2[cca2] ?? 0,
        name: countryName(cca2),
      }))
      .sort((a, b) => b.count - a.count || b.total - a.total || a.name.localeCompare(b.name));
  }, [countsByCca2, totalsByCca2]);

  return (
    <div>
      <header className="mb-4 flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">
            {denominatorHits} / {total} countries · {pct}%
          </h1>
          <div className="text-sm text-gray-600 flex flex-wrap gap-4 mt-1">
            <span>{finished.length} books finished</span>
            {mostRead && (
              <span>
                Most read: {countryFlag(mostRead[0])} {countryName(mostRead[0])} ({mostRead[1]})
              </span>
            )}
          </div>
        </div>
        <Link
          to="/add"
          className="self-start md:self-auto px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 text-sm whitespace-nowrap"
        >
          + Add a book
        </Link>
      </header>

      <div className="grid lg:grid-cols-[1fr_320px] gap-4">
        <div>
          <WorldMap
            countsByCca2={countsByCca2}
            selectedCca2={selected}
            onSelect={setSelected}
          />
        </div>
        {selected && (
          <div className="lg:sticky lg:top-4 self-start">
            <CountryPanel
              cca2={selected}
              books={booksForSelected}
              onClose={() => setSelected(null)}
            />
          </div>
        )}
      </div>

      <section className="mt-8">
        <h2 className="text-sm font-semibold text-gray-700 mb-2">
          Countries in your library ({sortedCountries.length})
        </h2>
        {sortedCountries.length === 0 ? (
          <div className="text-sm text-gray-500">
            Add a book to see its country here.
          </div>
        ) : (
          <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-1 text-sm">
            {sortedCountries.map((c) => (
              <li key={c.cca2}>
                <button
                  type="button"
                  onClick={() => setSelected(c.cca2)}
                  className={[
                    'flex items-center gap-2 w-full py-1 hover:text-emerald-700',
                    c.cca2 === selected ? 'text-emerald-700 font-medium' : '',
                  ].join(' ')}
                >
                  <span className="text-lg leading-none">{countryFlag(c.cca2)}</span>
                  <span className="flex-1 text-left">{c.name}</span>
                  <span className="text-xs text-gray-500">
                    {c.count}
                    {c.total > c.count && (
                      <span className="text-gray-400"> / {c.total}</span>
                    )}
                  </span>
                  {!isDenominatorCountry(c.cca2) && (
                    <span className="text-[10px] text-gray-400">(not counted)</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
