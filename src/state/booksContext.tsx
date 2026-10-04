import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from 'react';
import { Book, Library, ReadingStatus, emptyLibrary } from './schema';
import { loadLibrary, saveLibrary } from './storage';

type Action =
  | { type: 'add'; book: Book }
  | { type: 'update'; id: string; patch: Partial<Book> }
  | { type: 'delete'; id: string }
  | { type: 'replace'; library: Library }
  | { type: 'merge'; library: Library }
  | { type: 'clear' };

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function applyStatusDefaults(book: Book, patch: Partial<Book>): Partial<Book> {
  if (!patch.status || patch.status === book.status) return patch;
  const next: Partial<Book> = { ...patch };
  const nextStatus = patch.status as ReadingStatus;
  if (nextStatus === 'reading' && !book.dateStarted && !patch.dateStarted) {
    next.dateStarted = today();
  }
  if (nextStatus === 'finished' && !book.dateFinished && !patch.dateFinished) {
    next.dateFinished = today();
  }
  return next;
}

function reducer(state: Library, action: Action): Library {
  switch (action.type) {
    case 'add':
      return { ...state, books: [...state.books, action.book] };
    case 'update': {
      const nowIso = new Date().toISOString();
      return {
        ...state,
        books: state.books.map((b) => {
          if (b.id !== action.id) return b;
          const patch = applyStatusDefaults(b, action.patch);
          return { ...b, ...patch, updatedAt: nowIso };
        }),
      };
    }
    case 'delete':
      return { ...state, books: state.books.filter((b) => b.id !== action.id) };
    case 'replace':
      return action.library;
    case 'merge': {
      const byId = new Map(state.books.map((b) => [b.id, b]));
      for (const incoming of action.library.books) byId.set(incoming.id, incoming);
      return { ...state, books: Array.from(byId.values()) };
    }
    case 'clear':
      return emptyLibrary();
    default:
      return state;
  }
}

export interface BooksContextShape {
  library: Library;
  addBook: (book: Book) => void;
  updateBook: (id: string, patch: Partial<Book>) => void;
  deleteBook: (id: string) => void;
  replaceLibrary: (library: Library) => void;
  mergeLibrary: (library: Library) => void;
  clearLibrary: () => void;
}

const BooksContext = createContext<BooksContextShape | null>(null);

const SAVE_DEBOUNCE_MS = 300;

export function BooksProvider({ children }: { children: ReactNode }) {
  const [library, dispatch] = useReducer(reducer, undefined, () => loadLibrary());
  const timerRef = useRef<number | null>(null);
  const firstRender = useRef(true);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      saveLibrary(library);
      timerRef.current = null;
    }, SAVE_DEBOUNCE_MS);
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, [library]);

  const addBook = useCallback((book: Book) => dispatch({ type: 'add', book }), []);
  const updateBook = useCallback(
    (id: string, patch: Partial<Book>) => dispatch({ type: 'update', id, patch }),
    [],
  );
  const deleteBook = useCallback((id: string) => dispatch({ type: 'delete', id }), []);
  const replaceLibrary = useCallback(
    (next: Library) => dispatch({ type: 'replace', library: next }),
    [],
  );
  const mergeLibrary = useCallback(
    (next: Library) => dispatch({ type: 'merge', library: next }),
    [],
  );
  const clearLibrary = useCallback(() => dispatch({ type: 'clear' }), []);

  const value = useMemo<BooksContextShape>(
    () => ({
      library,
      addBook,
      updateBook,
      deleteBook,
      replaceLibrary,
      mergeLibrary,
      clearLibrary,
    }),
    [library, addBook, updateBook, deleteBook, replaceLibrary, mergeLibrary, clearLibrary],
  );

  return <BooksContext.Provider value={value}>{children}</BooksContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useBooks(): BooksContextShape {
  const ctx = useContext(BooksContext);
  if (!ctx) throw new Error('useBooks must be used within BooksProvider');
  return ctx;
}
