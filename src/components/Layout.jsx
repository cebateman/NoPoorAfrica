import { NavLink, Outlet } from 'react-router-dom';
import { BarChart3, Users, Upload } from 'lucide-react';
import { useCurrency } from '../data/CurrencyContext';

const navItems = [
  { to: '/', label: 'Dashboard', icon: BarChart3 },
  { to: '/upload', label: 'Upload Data', icon: Upload },
];

export default function Layout() {
  const { currency, toggle } = useCurrency();

  return (
    <div className="layout">
      <header className="header">
        <div className="header-brand">
          <Users size={28} />
          <div>
            <h1>No Poor Africa</h1>
            <span className="header-subtitle">Financial Leadership Dashboard</span>
          </div>
        </div>
        <div className="header-right">
          <nav className="nav">
            {navItems.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  `nav-link ${isActive ? 'nav-link--active' : ''}`
                }
              >
                <Icon size={16} />
                {label}
              </NavLink>
            ))}
          </nav>
          <button
            className="currency-toggle"
            onClick={toggle}
            title={`Switch to ${currency === 'USD' ? 'MZN' : 'USD'}`}
          >
            <span className={currency === 'USD' ? 'currency-toggle__active' : ''}>USD</span>
            <span className="currency-toggle__divider">/</span>
            <span className={currency === 'MZN' ? 'currency-toggle__active' : ''}>MZN</span>
          </button>
        </div>
      </header>
      <main className="main">
        <Outlet />
      </main>
      <footer className="footer">
        <p>No Poor Africa &middot; Financial Leadership Dashboard &middot; Exchange rate: 63 MZN = 1 USD</p>
      </footer>
    </div>
  );
}
