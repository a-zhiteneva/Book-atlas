import { NavLink, Route, Routes } from 'react-router-dom';
import Library from './routes/Library';
import AddBook from './routes/AddBook';
import BookDetail from './routes/BookDetail';
import MapPage from './routes/MapPage';
import Settings from './routes/Settings';
import { BooksProvider } from './state/booksContext';

const navLinks = [
  { to: '/', label: 'Map', end: true },
  { to: '/library', label: 'Library' },
  { to: '/add', label: 'Add' },
  { to: '/settings', label: 'Settings' },
];

function TopNav() {
  return (
    <nav className="hidden md:flex items-center gap-6 px-6 py-4 border-b border-gray-200 bg-white">
      <span className="font-semibold text-lg">Book Atlas</span>
      <div className="flex gap-4 ml-4">
        {navLinks.map(({ to, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              [
                'px-2 py-1 rounded text-sm',
                isActive ? 'text-emerald-700 font-medium' : 'text-gray-600 hover:text-gray-900',
              ].join(' ')
            }
          >
            {label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

function BottomNav() {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 flex justify-around py-2 border-t border-gray-200 bg-white">
      {navLinks.map(({ to, label, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            [
              'px-3 py-1 text-xs',
              isActive ? 'text-emerald-700 font-medium' : 'text-gray-600',
            ].join(' ')
          }
        >
          {label}
        </NavLink>
      ))}
    </nav>
  );
}

export default function App() {
  return (
    <BooksProvider>
      <div className="min-h-full pb-16 md:pb-0">
        <TopNav />
        <main className="max-w-6xl mx-auto px-4 md:px-6 py-6">
          <Routes>
            <Route path="/" element={<MapPage />} />
            <Route path="/library" element={<Library />} />
            <Route path="/add" element={<AddBook />} />
            <Route path="/book/:id" element={<BookDetail />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>
        <BottomNav />
      </div>
    </BooksProvider>
  );
}
