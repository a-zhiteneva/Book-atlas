import { useMemo, useState } from 'react';
import { geoEqualEarth, geoPath } from 'd3-geo';
import { feature } from 'topojson-client';
import type { Feature, FeatureCollection, Geometry } from 'geojson';
// world-atlas ships raw TopoJSON without TypeScript types; the shape is
// {objects: {countries: GeometryCollection}, ...}.
import rawTopology from 'world-atlas/countries-110m.json';
import { getCountryByCcn3 } from '../lib/countries';
import {
  CONTINENT_LABEL,
  CONTINENT_ORDER,
  CONTINENT_PALETTE,
  Continent,
  NEUTRAL_FILL,
  bucket,
  continentFor,
} from '../lib/continents';

interface Props {
  countsByCca2: Record<string, number>;
  stripedCca2: ReadonlySet<string>;
  selectedCca2: string | null;
  onSelect: (cca2: string | null) => void;
}

function patternId(continent: Continent): string {
  return `stripes-${continent}`;
}

interface CountryFeatureProps {
  name: string;
}

const WIDTH = 960;
const HEIGHT = 500;

function fillFor(continent: Continent | null, count: number, striped: boolean): string {
  if (count > 0 && continent) return CONTINENT_PALETTE[continent][bucket(count)];
  if (striped && continent) return `url(#${patternId(continent)})`;
  if (continent) return CONTINENT_PALETTE[continent][0];
  return NEUTRAL_FILL;
}

function hoverFillFor(continent: Continent | null, count: number, striped: boolean): string {
  if (count > 0 && continent) {
    const idx = Math.min(3, bucket(count) + 1);
    return CONTINENT_PALETTE[continent][idx];
  }
  if (striped && continent) return `url(#${patternId(continent)})`;
  if (continent) return CONTINENT_PALETTE[continent][1];
  return '#d1d5db';
}

export default function WorldMap({
  countsByCca2,
  stripedCca2,
  selectedCca2,
  onSelect,
}: Props) {
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
          const striped = cca2 ? stripedCca2.has(cca2) : false;
          const continent = cca2 ? continentFor(cca2) : null;
          const d = pathFn(f as Feature<Geometry, CountryFeatureProps>) ?? '';
          return {
            f,
            cca2,
            count,
            striped,
            continent,
            d,
            name: country?.name.common ?? f.properties.name,
          };
        })
        .filter((item) => item.d),
    [features, pathFn, countsByCca2, stripedCca2],
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
        <defs>
          {CONTINENT_ORDER.map((c) => {
            const [bg, , mid] = CONTINENT_PALETTE[c];
            return (
              <pattern
                key={c}
                id={patternId(c)}
                patternUnits="userSpaceOnUse"
                width={6}
                height={6}
                patternTransform="rotate(45)"
              >
                <rect width={6} height={6} fill={bg} />
                <line x1={3} y1={0} x2={3} y2={6} stroke={mid} strokeWidth={2} />
              </pattern>
            );
          })}
        </defs>
        <g>
          {items.map(({ f, cca2, count, striped, continent, d }) => {
            const isSelected = cca2 && cca2 === selectedCca2;
            const isHovered = hover?.cca2 === cca2;
            const fill = isHovered
              ? hoverFillFor(continent, count, striped)
              : fillFor(continent, count, striped);
            return (
              <path
                key={String(f.id)}
                d={d}
                fill={fill}
                stroke={isSelected ? '#111827' : '#ffffff'}
                strokeWidth={isSelected ? 2 : 0.5}
                className="cursor-pointer"
                onMouseEnter={(e) => {
                  if (!cca2) return;
                  const rect = (
                    e.currentTarget.ownerSVGElement as SVGSVGElement
                  ).getBoundingClientRect();
                  setHover({ cca2, x: e.clientX - rect.left, y: e.clientY - rect.top });
                }}
                onMouseMove={(e) => {
                  if (!cca2) return;
                  const rect = (
                    e.currentTarget.ownerSVGElement as SVGSVGElement
                  ).getBoundingClientRect();
                  setHover({ cca2, x: e.clientX - rect.left, y: e.clientY - rect.top });
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
    <div className="mt-3 text-xs text-gray-600 space-y-2">
      <div className="flex flex-wrap gap-3">
        {CONTINENT_ORDER.map((c) => (
          <span key={c} className="flex items-center gap-1">
            <span className="flex rounded-sm overflow-hidden">
              {[0, 1, 2, 3].map((b) => (
                <span
                  key={b}
                  className="w-2.5 h-3"
                  style={{ background: CONTINENT_PALETTE[c][b] }}
                />
              ))}
            </span>
            <span>{CONTINENT_LABEL[c]}</span>
          </span>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-4 text-gray-500">
        <span className="flex items-center gap-2">
          <span className="inline-flex rounded-sm overflow-hidden">
            <span className="w-3 h-3 bg-emerald-100" />
            <span className="w-3 h-3 bg-emerald-300" />
            <span className="w-3 h-3 bg-emerald-500" />
            <span className="w-3 h-3 bg-emerald-700" />
          </span>
          <span>Solid = finished books (0, 1, 2–4, 5+)</span>
        </span>
        <span className="flex items-center gap-2">
          <svg width="14" height="14" aria-hidden>
            <defs>
              <pattern
                id="legend-stripes"
                patternUnits="userSpaceOnUse"
                width={6}
                height={6}
                patternTransform="rotate(45)"
              >
                <rect width={6} height={6} fill="#d1fae5" />
                <line x1={3} y1={0} x2={3} y2={6} stroke="#10b981" strokeWidth={2} />
              </pattern>
            </defs>
            <rect width="14" height="14" fill="url(#legend-stripes)" />
          </svg>
          <span>Stripes = owned or reading, nothing finished yet</span>
        </span>
      </div>
    </div>
  );
}
