import { ChangeEvent, useRef, useState } from 'react';
import pkg from '../../package.json';
import { useBooks } from '../state/booksContext';
import { ImportError, parseLibrary } from '../lib/importValidator';
import { cacheClear, cacheSize } from '../lib/cache';
import type { Library } from '../state/schema';

export default function Settings() {
  const { library, replaceLibrary, mergeLibrary, clearLibrary } = useBooks();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [pendingImport, setPendingImport] = useState<Library | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [confirmText, setConfirmText] = useState('');
  const [cacheN, setCacheN] = useState(() => cacheSize());

  const exportLibrary = () => {
    const date = new Date().toISOString().slice(0, 10);
    const blob = new Blob([JSON.stringify(library, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `book-atlas-${date}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    setImportError(null);
    setPendingImport(null);
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = parseLibrary(JSON.parse(text));
      setPendingImport(parsed);
    } catch (err) {
      if (err instanceof ImportError) setImportError(err.message);
      else setImportError('Not a valid JSON file.');
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const doReplace = () => {
    if (!pendingImport) return;
    replaceLibrary(pendingImport);
    setPendingImport(null);
  };

  const doMerge = () => {
    if (!pendingImport) return;
    mergeLibrary(pendingImport);
    setPendingImport(null);
  };

  const canClear = confirmText === 'DELETE';
  const doClear = () => {
    if (!canClear) return;
    clearLibrary();
    setConfirmText('');
  };

  const doClearCache = () => {
    cacheClear();
    setCacheN(cacheSize());
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <h1 className="text-2xl font-semibold">Settings</h1>

      <section className="space-y-2">
        <h2 className="font-medium">Export</h2>
        <p className="text-sm text-gray-600">
          Download the whole library ({library.books.length} books) as JSON.
        </p>
        <button
          type="button"
          onClick={exportLibrary}
          className="px-3 py-1.5 bg-emerald-600 text-white rounded text-sm hover:bg-emerald-700"
        >
          Export JSON
        </button>
      </section>

      <section className="space-y-2">
        <h2 className="font-medium">Import</h2>
        <p className="text-sm text-gray-600">
          Pick a JSON file previously exported from Book Atlas.
        </p>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          onChange={onFile}
          className="text-sm"
        />
        {importError && (
          <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
            {importError}
          </div>
        )}
        {pendingImport && (
          <div className="bg-gray-50 border rounded px-3 py-2 flex items-center gap-3 flex-wrap">
            <span className="text-sm">
              Loaded {pendingImport.books.length} books. How should this be applied?
            </span>
            <button
              type="button"
              onClick={doReplace}
              className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
            >
              Replace library
            </button>
            <button
              type="button"
              onClick={doMerge}
              className="px-3 py-1 bg-emerald-600 text-white rounded text-sm hover:bg-emerald-700"
            >
              Merge (incoming wins)
            </button>
            <button
              type="button"
              onClick={() => setPendingImport(null)}
              className="px-3 py-1 border rounded text-sm"
            >
              Cancel
            </button>
          </div>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="font-medium">Clear library</h2>
        <p className="text-sm text-gray-600">
          Delete every book. Export first if you want a backup. Type{' '}
          <code className="bg-gray-100 px-1 rounded">DELETE</code> to confirm.
        </p>
        <div className="flex gap-2 items-center">
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="DELETE"
            className="border rounded px-3 py-1.5 text-sm"
          />
          <button
            type="button"
            disabled={!canClear}
            onClick={doClear}
            className={[
              'px-3 py-1.5 rounded text-sm',
              canClear
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-gray-200 text-gray-500 cursor-not-allowed',
            ].join(' ')}
          >
            Clear library
          </button>
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="font-medium">API cache</h2>
        <p className="text-sm text-gray-600">
          {cacheN} entries cached from Open Library and Wikidata (30-day TTL,
          up to 200 entries).
        </p>
        <button
          type="button"
          onClick={doClearCache}
          className="px-3 py-1.5 border rounded text-sm hover:bg-gray-50"
        >
          Clear cache
        </button>
      </section>

      <section className="text-xs text-gray-400 pt-4 border-t">
        Book Atlas v{pkg.version}
      </section>
    </div>
  );
}
