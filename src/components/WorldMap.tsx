import { useMemo, useState } from 'react';
import { geoEqualEarth, geoPath } from 'd3-geo';
import { feature } from 'topojson-client';
import type { Feature, FeatureCollection, Geometry } from 'geojson';
// world-atlas ships raw TopoJSON without TypeScript types; the shape is
// {objects: {countries: GeometryCollection}, ...}.
import rawTopology from 'world-atlas/countries-110m.json';
import { getCountryByCcn3 } from '../lib/countries';

interface Props {
  countsByCca2: Record<string, number>;
  selectedCca2: string | null;
  onSelect: (cca2: string | null) => void;
}

interface CountryFeatureProps {
  name: string;
}

const WIDTH = 960;
const HEIGHT = 500;

function bucket(count: number): 0 | 1 | 2 | 3 {
  if (count === 0) return 0;
  if (count === 1) return 1;
  if (count <= 4) return 2;
  return 3;
}

const FILLS = ['#e5e7eb', '#a7f3d0', '#34d399', '#059669'] as const;
const HOVER_FILLS = ['#d1d5db', '#6ee7b7', '#10b981', '#047857'] as const;

export default function WorldMap({ countsByCca2, selectedCca2, onSelect }: Props) {
  const [hover, setHover] = useState<{ cca2: string; x: number; y: number } | null>(null);

  const { features, pathFn } = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const topo = rawTopology as any;
    const collection = feature(topo, topo.objects.countries) as unknown as FeatureCollection<
      Geometry,
      CountryFeatureProps
    >;
    const filtered: FeatureCollection<Geometry, CountryFeatureProps> = {
      type: 'FeatureCollection',
      features: collection.features.filter((f) => String(f.id) !== '010'),
    };
    const projection = geoEqualEarth().fitSize([WIDTH, HEIGHT], filtered);
    const pathFn = geoPath(projection);
    return { features: filtered.features, pathFn };
  }, []);

  const items = useMemo(
    () =>
      features
        .map((f) => {
          const ccn3 = String(f.id).padStart(3, '0');
          const country = getCountryByCcn3(ccn3);
          const cca2 = country?.cca2;
          const count = cca2 ? (countsByCca2[cca2] ?? 0) : 0;
          const d = pathFn(f as Feature<Geometry, CountryFeatureProps>) ?? '';
          return { f, cca2, count, d, name: country?.name.common ?? f.properties.name };
        })
        .filter((item) => item.d),
    [features, pathFn, countsByCca2],
  );

  const hoverItem = hover ? items.find((i) => i.cca2 === hover.cca2) : null;

  return (
    <div className="relative w-full">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full h-auto bg-white rounded border"
        role="img"
        aria-label="World map"
      >
        <g>
          {items.map(({ f, cca2, count, d }) => {
            const b = bucket(count);
            const isSelected = cca2 && cca2 === selectedCca2;
            const isHovered = hover?.cca2 === cca2;
            const fill = isHovered ? HOVER_FILLS[b] : FILLS[b];
            return (
              <path
                key={String(f.id)}
                d={d}
                fill={fill}
                stroke={isSelected ? '#111827' : '#ffffff'}
                strokeWidth={isSelected ? 2 : 0.5}
                className={count > 0 ? 'cursor-pointer' : 'cursor-default'}
                onMouseEnter={(e) => {
                  if (!cca2) return;
                  const rect = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect();
                  setHover({
                    cca2,
                    x: e.clientX - rect.left,
                    y: e.clientY - rect.top,
                  });
                }}
                onMouseMove={(e) => {
                  if (!cca2) return;
                  const rect = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect();
                  setHover({
                    cca2,
                    x: e.clientX - rect.left,
                    y: e.clientY - rect.top,
                  });
                }}
                onMouseLeave={() => setHover(null)}
                onClick={() => {
                  if (!cca2) return;
                  onSelect(cca2 === selectedCca2 ? null : cca2);
                }}
              />
            );
          })}
        </g>
      </svg>

      {hoverItem && hover && (
        <div
          className="pointer-events-none absolute bg-white border rounded shadow px-2 py-1 text-xs"
          style={{ left: hover.x + 12, top: hover.y + 12 }}
        >
          <span className="mr-1">{hoverItem.cca2 ? '' : ''}</span>
          <span className="font-medium">{hoverItem.name}</span>
          <span className="text-gray-500 ml-2">
            {hoverItem.count} {hoverItem.count === 1 ? 'book' : 'books'}
          </span>
        </div>
      )}

      <Legend />
    </div>
  );
}

function Legend() {
  return (
    <div className="flex items-center gap-3 mt-2 text-xs text-gray-600">
      <span>Books from this country:</span>
      <span className="flex items-center gap-1">
        <span className="w-3 h-3 rounded-sm" style={{ background: FILLS[0] }} />
        0
      </span>
      <span className="flex items-center gap-1">
        <span className="w-3 h-3 rounded-sm" style={{ background: FILLS[1] }} />
        1
      </span>
      <span className="flex items-center gap-1">
        <span className="w-3 h-3 rounded-sm" style={{ background: FILLS[2] }} />
        2–4
      </span>
      <span className="flex items-center gap-1">
        <span className="w-3 h-3 rounded-sm" style={{ background: FILLS[3] }} />
        5+
      </span>
    </div>
  );
}
