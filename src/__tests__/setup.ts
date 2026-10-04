import '@testing-library/jest-dom/vitest';

// Node >= 22 ships an experimental global `localStorage` that is a plain
// object with no Storage methods, and it shadows jsdom's window.localStorage
// inside Vitest. Replace it with a minimal Map-backed Storage so tests see
// real get/set/clear/removeItem semantics.
class MapStorage implements Storage {
  private store = new Map<string, string>();
  get length(): number {
    return this.store.size;
  }
  clear(): void {
    this.store.clear();
  }
  getItem(key: string): string | null {
    return this.store.has(key) ? (this.store.get(key) as string) : null;
  }
  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }
  removeItem(key: string): void {
    this.store.delete(key);
  }
  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }
}

const mapStorage = new MapStorage();
Object.defineProperty(globalThis, 'localStorage', {
  value: mapStorage,
  configurable: true,
  writable: true,
});
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'localStorage', {
    value: mapStorage,
    configurable: true,
    writable: true,
  });
}
