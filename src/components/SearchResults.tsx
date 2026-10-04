import { coverUrl } from '../lib/openLibrary';
import type { SearchHit } from '../lib/openLibrary';

interface Props {
  hits: SearchHit[];
  onPick: (hit: SearchHit) => void;
  loading?: boolean;
}

export default function SearchResults({ hits, onPick, loading }: Props) {
  if (loading) return <div className="text-sm text-gray-500">Searching…</div>;
  if (hits.length === 0) return <div className="text-sm text-gray-500">No matches.</div>;

  return (
    <ul className="divide-y border rounded bg-white">
      {hits.map((h) => {
        const cover = coverUrl(h.coverId, 'S');
        return (
          <li key={h.workKey}>
            <button
              type="button"
              onClick={() => onPick(h)}
              className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 text-left"
            >
              <div className="w-10 h-14 flex-shrink-0 bg-gray-100 rounded overflow-hidden">
                {cover && <img src={cover} alt="" className="w-full h-full object-cover" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{h.title}</div>
                <div className="text-sm text-gray-600 truncate">
                  {h.authorNames.join(', ') || 'Unknown author'}
                </div>
                {h.firstPublishYear && (
                  <div className="text-xs text-gray-400">{h.firstPublishYear}</div>
                )}
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
