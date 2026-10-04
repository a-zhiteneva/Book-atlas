import { useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import WorldMap from '../components/WorldMap';
import CountryPanel from '../components/CountryPanel';
import { useBooks } from '../state/booksContext';
import { UN_DENOMINATOR, countryName, isDenominatorCountry } from '../lib/countries';

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
    const entries = Object.entries(countsByCca2);
    if (entries.length === 0) return null;
    const max = entries.reduce((m, [, c]) => (c > m ? c : m), 0);
    const cca2s = entries
      .filter(([, c]) => c === max)
      .map(([k]) => k)
      .sort((a, b) => countryName(a).localeCompare(countryName(b)));
    return { count: max, cca2s };
  }, [countsByCca2]);

  const booksForSelected = useMemo(() => {
    if (!selected) return [];
    return library.books.filter((b) => b.countryCode === selected);
  }, [library.books, selected]);

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
    return Object.entries(countsByCca2)
      .filter(([, count]) => count > 0)
      .map(([cca2, count]) => ({ cca2, count, name: countryName(cca2) }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [countsByCca2]);

  return (
    <div>
      <header className="mb-4 flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">
            {denominatorHits} / {total} countries · {pct}%
          </h1>
          <div className="text-sm text-gray-600 mt-1 space-y-1">
            <div>{finished.length} books finished</div>
            {mostRead && mostRead.cca2s.length === 1 && (
              <div>
                Most read: {countryName(mostRead.cca2s[0])} ({mostRead.count})
              </div>
            )}
            {mostRead && mostRead.cca2s.length > 1 && (
              <div>
                <div>Most read ({mostRead.count} each):</div>
                <ul className="ml-4 mt-0.5">
                  {mostRead.cca2s.map((cca2) => (
                    <li key={cca2}>{countryName(cca2)}</li>
                  ))}
                </ul>
              </div>
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
          Countries you've read from ({sortedCountries.length})
        </h2>
        {sortedCountries.length === 0 ? (
          <div className="text-sm text-gray-500">
            Mark a book as Finished to see its country here.
          </div>
        ) : (
          <ul className="text-sm divide-y border rounded bg-white">
            {sortedCountries.map((c) => (
              <li key={c.cca2}>
                <button
                  type="button"
                  onClick={() => setSelected(c.cca2)}
                  className={[
                    'flex items-center gap-2 w-full py-2 px-3 hover:bg-gray-50',
                    c.cca2 === selected ? 'text-emerald-700 font-medium bg-emerald-50' : '',
                  ].join(' ')}
                >
                  <span className="flex-1 text-left">{c.name}</span>
                  <span className="text-xs text-gray-500">{c.count}</span>
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
