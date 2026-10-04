import { useEffect, useMemo, useRef, useState } from 'react';
import { allCountryOptions, countryFlag, countryName } from '../lib/countries';

interface Props {
  value: string | null;
  onChange: (cca2: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}

export default function CountrySelect({ value, onChange, placeholder, autoFocus }: Props) {
  const options = useMemo(() => allCountryOptions(), []);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options.slice(0, 100);
    return options.filter(
      (o) => o.name.toLowerCase().includes(q) || o.cca2.toLowerCase().includes(q),
    );
  }, [options, query]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  useEffect(() => {
    setCursor(0);
  }, [query]);

  const pick = (cca2: string) => {
    onChange(cca2);
    setOpen(false);
    setQuery('');
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 border rounded px-3 py-2 text-left bg-white hover:border-gray-400"
      >
        <span className="text-xl leading-none">{countryFlag(value)}</span>
        <span className={value ? '' : 'text-gray-400'}>
          {value ? countryName(value) : (placeholder ?? 'Pick a country')}
        </span>
      </button>
      {open && (
        <div className="absolute z-10 mt-1 w-full bg-white border rounded shadow-lg max-h-72 overflow-auto">
          <input
            ref={inputRef}
            type="text"
            placeholder="Search countries"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setCursor((c) => Math.min(filtered.length - 1, c + 1));
              }
              if (e.key === 'ArrowUp') {
                e.preventDefault();
                setCursor((c) => Math.max(0, c - 1));
              }
              if (e.key === 'Enter') {
                e.preventDefault();
                const sel = filtered[cursor];
                if (sel) pick(sel.cca2);
              }
              if (e.key === 'Escape') {
                e.preventDefault();
                setOpen(false);
              }
            }}
            className="w-full px-3 py-2 border-b outline-none"
            autoFocus
          />
          <ul role="listbox" className="py-1">
            {filtered.length === 0 && (
              <li className="px-3 py-2 text-sm text-gray-500">No matches</li>
            )}
            {filtered.map((o, i) => (
              <li
                key={o.cca2}
                role="option"
                aria-selected={i === cursor}
                onMouseEnter={() => setCursor(i)}
                onClick={() => pick(o.cca2)}
                className={[
                  'flex items-center gap-2 px-3 py-1.5 cursor-pointer text-sm',
                  i === cursor ? 'bg-emerald-50' : 'hover:bg-gray-50',
                ].join(' ')}
              >
                <span className="text-lg leading-none">{o.flag}</span>
                <span className="flex-1">{o.name}</span>
                <span className="text-xs text-gray-400">{o.cca2}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
