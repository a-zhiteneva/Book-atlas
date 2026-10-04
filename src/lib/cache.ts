const PREFIX = 'bookatlas:cache:';
const TTL_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_ENTRIES = 200;

interface Entry {
  savedAt: number;
  value: unknown;
}

function key(url: string): string {
  return PREFIX + url;
}

export function cacheGet<T>(url: string, now: number = Date.now()): T | undefined {
  const raw = localStorage.getItem(key(url));
  if (!raw) return undefined;
  try {
    const parsed = JSON.parse(raw) as Entry;
    if (now - parsed.savedAt > TTL_MS) {
      localStorage.removeItem(key(url));
      return undefined;
    }
    return parsed.value as T;
  } catch {
    localStorage.removeItem(key(url));
    return undefined;
  }
}

export function cacheSet(url: string, value: unknown, now: number = Date.now()): void {
  evictIfFull();
  const entry: Entry = { savedAt: now, value };
  try {
    localStorage.setItem(key(url), JSON.stringify(entry));
  } catch {
    evictOldest(50);
    try {
      localStorage.setItem(key(url), JSON.stringify(entry));
    } catch {
      /* give up quietly */
    }
  }
}

export function cacheClear(): void {
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith(PREFIX)) keys.push(k);
  }
  keys.forEach((k) => localStorage.removeItem(k));
}

export function cacheSize(): number {
  let n = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith(PREFIX)) n++;
  }
  return n;
}

function evictIfFull(): void {
  if (cacheSize() >= MAX_ENTRIES) evictOldest(Math.max(1, Math.floor(MAX_ENTRIES / 10)));
}

function evictOldest(count: number): void {
  const entries: Array<{ k: string; savedAt: number }> = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (!k || !k.startsWith(PREFIX)) continue;
    try {
      const parsed = JSON.parse(localStorage.getItem(k) ?? 'null') as Entry | null;
      entries.push({ k, savedAt: parsed?.savedAt ?? 0 });
    } catch {
      entries.push({ k, savedAt: 0 });
    }
  }
  entries.sort((a, b) => a.savedAt - b.savedAt);
  entries.slice(0, count).forEach((e) => localStorage.removeItem(e.k));
}
