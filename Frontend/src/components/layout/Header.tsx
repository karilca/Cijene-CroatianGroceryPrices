// Header component with logo

import { Link } from 'react-router-dom';

export function Header() {
  return (
    <header className="bg-white shadow-sm border-b">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center flex-shrink-0">
            <img src="/logo.svg" alt="Cijene" className="h-12 md:h-16 lg:h-20 object-contain" />
            <span className="sr-only">Cijene</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
