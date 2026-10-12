import { useAuth } from '../hooks/useAuth.jsx';
import { Link, useRouter } from '../lib/router.jsx';

export default function Header() {
  const { isAuthenticated, logout } = useAuth();
  const { navigate } = useRouter();
  return (
    <header className="site-header">
      <div className="wrap header-inner">
        <Link to="/" className="brand">
          <span className="brand-mark" aria-hidden="true">M3</span>
          <span>MDO3D <span className="brand-sub">Leads</span></span>
        </Link>
        <nav aria-label="Primary">
          <ul className="nav-list">
            <li><Link to="/" className="nav-link">Search</Link></li>
            <li><Link to="/saved" className="nav-link">Saved</Link></li>
            <li><Link to="/account" className="nav-link">Plan</Link></li>
            <li>
              {isAuthenticated ? (
                <button type="button" className="nav-link nav-button" onClick={async () => { await logout(); navigate('/'); }}>
                  Sign out
                </button>
              ) : (
                <Link to="/signin" className="nav-link">Sign in</Link>
              )}
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}
