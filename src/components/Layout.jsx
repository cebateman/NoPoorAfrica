import { NavLink, Outlet } from 'react-router-dom';
import { BarChart3, Globe, DollarSign, Users, Upload } from 'lucide-react';

const navItems = [
  { to: '/', label: 'Executive Overview', icon: BarChart3 },
  { to: '/us', label: 'US Operations', icon: DollarSign },
  { to: '/mozambique', label: 'Mozambique Operations', icon: Globe },
  { to: '/upload', label: 'Upload Data', icon: Upload },
];

export default function Layout() {
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
      </header>
      <main className="main">
        <Outlet />
      </main>
      <footer className="footer">
        <p>No Poor Africa &middot; Financial Leadership Dashboard</p>
      </footer>
    </div>
  );
}
