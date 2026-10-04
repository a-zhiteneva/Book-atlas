import { KeyboardEvent, useRef } from 'react';
import type { Rating } from '../state/schema';

interface Props {
  value?: Rating;
  onChange: (next: Rating | undefined) => void;
  size?: 'sm' | 'md' | 'lg';
}

export default function RatingInput({ value, onChange, size = 'md' }: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const starClass =
    size === 'sm' ? 'text-base' : size === 'lg' ? 'text-3xl' : 'text-xl';

  const set = (next: Rating | undefined) => onChange(next);

  const handleKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const current = value ?? 0;
    if (e.key >= '1' && e.key <= '5') {
      e.preventDefault();
      set(Number(e.key) as Rating);
      return;
    }
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault();
      const next = Math.min(5, current + 1);
      if (next > 0) set(next as Rating);
    }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault();
      if (current <= 1) {
        set(undefined);
      } else {
        set((current - 1) as Rating);
      }
    }
    if (e.key === 'Backspace' || e.key === 'Delete') {
      e.preventDefault();
      set(undefined);
    }
  };

  return (
    <div
      ref={ref}
      role="radiogroup"
      aria-label="Rating"
      tabIndex={0}
      onKeyDown={handleKey}
      className="inline-flex items-center gap-1 outline-none focus:ring-2 focus:ring-emerald-300 rounded"
    >
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = (value ?? 0) >= n;
        return (
          <button
            type="button"
            key={n}
            role="radio"
            aria-checked={value === n}
            onClick={() => set(value === n ? undefined : (n as Rating))}
            className={[
              starClass,
              'leading-none transition-colors',
              filled ? 'text-emerald-500' : 'text-gray-300 hover:text-gray-400',
            ].join(' ')}
          >
            ★
          </button>
        );
      })}
    </div>
  );
}
