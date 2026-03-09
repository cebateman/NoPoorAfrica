import { NavLink, Outlet } from 'react-router-dom';
import { BarChart3, Upload, Users, LogOut, Shield, User } from 'lucide-react';
import { useCurrency } from '../data/CurrencyContext';
import { useAuth } from '../data/AuthContext';

export default function Layout() {
  const { currency, toggle } = useCurrency();
  const { profile, isAdmin, logout, authEnabled } = useAuth();
  const allowedPages = profile?.allowedPages;
  const canView = (pageId) => isAdmin || !allowedPages || allowedPages.includes(pageId);

  return (
    <div className="layout">
      <header className="header">
        <div className="header-brand">
          <div className="header-brand__icon">
            {isAdmin ? <Shield size={28} /> : <User size={28} />}
          </div>
          <div>
            <h1>No Poor Africa</h1>
            <span className="header-subtitle">Financial Leadership Dashboard</span>
          </div>
        </div>
        <div className="header-right">
          <nav className="nav">
            {canView('dashboard') && (
              <NavLink
                to="/"
                end
                className={({ isActive }) =>
                  `nav-link ${isActive ? 'nav-link--active' : ''}`
                }
              >
                <BarChart3 size={16} />
                Dashboard
              </NavLink>
            )}
            {canView('donors') && (
              <NavLink
                to="/donors"
                className={({ isActive }) =>
                  `nav-link ${isActive ? 'nav-link--active' : ''}`
                }
              >
                <Users size={16} />
                Donors
              </NavLink>
            )}
            {isAdmin && (
              <NavLink
                to="/upload"
                className={({ isActive }) =>
                  `nav-link ${isActive ? 'nav-link--active' : ''}`
                }
              >
                <Upload size={16} />
                Upload Data
              </NavLink>
            )}
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
          {authEnabled && profile && (
            <div className="user-info">
              <span className="user-info__name" title={profile.email}>
                {profile.displayName || profile.email}
              </span>
              <span className={`user-info__role user-info__role--${profile.role}`}>
                {profile.role}
              </span>
              <button
                className="user-info__logout"
                onClick={logout}
                title="Sign out"
              >
                <LogOut size={14} />
              </button>
            </div>
          )}
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
