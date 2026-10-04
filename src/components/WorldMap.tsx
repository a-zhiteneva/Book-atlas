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
  selectedCca2: string | null;
  onSelect: (cca2: string | null) => void;
}

interface CountryFeatureProps {
  name: string;
}

const WIDTH = 960;
const HEIGHT = 500;
const NEUTRAL_HOVER = '#d1d5db';

function fillFor(continent: Continent | null, count: number): string {
  if (count > 0 && continent) return CONTINENT_PALETTE[continent][bucket(count)];
  return NEUTRAL_FILL;
}

function hoverFillFor(continent: Continent | null, count: number): string {
  if (count > 0 && continent) {
    const idx = Math.min(3, bucket(count) + 1);
    return CONTINENT_PALETTE[continent][idx];
  }
  return NEUTRAL_HOVER;
}

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
          const continent = cca2 ? continentFor(cca2) : null;
          const d = pathFn(f as Feature<Geometry, CountryFeatureProps>) ?? '';
          return {
            f,
            cca2,
            count,
            continent,
            d,
            name: country?.name.common ?? f.properties.name,
          };
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
          {items.map(({ f, cca2, count, continent, d }) => {
            const isSelected = cca2 && cca2 === selectedCca2;
            const isHovered = hover?.cca2 === cca2;
            const fill = isHovered ? hoverFillFor(continent, count) : fillFor(continent, count);
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
              {[1, 2, 3].map((b) => (
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
      <div className="text-gray-500">
        Shades = finished books (1, 2–4, 5+). Grey = nothing finished yet.
      </div>
    </div>
  );
}
