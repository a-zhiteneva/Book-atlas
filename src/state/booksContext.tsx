import { ReactNode, createContext, useContext } from 'react';

interface BooksContextShape {}
const BooksContext = createContext<BooksContextShape | null>(null);

export function BooksProvider({ children }: { children: ReactNode }) {
  return <BooksContext.Provider value={{}}>{children}</BooksContext.Provider>;
}

export function useBooks(): BooksContextShape {
  const ctx = useContext(BooksContext);
  if (!ctx) throw new Error('useBooks must be used within BooksProvider');
  return ctx;
}
