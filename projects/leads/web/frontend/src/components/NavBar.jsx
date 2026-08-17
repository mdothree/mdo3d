import { useState } from 'react';

const LINKS = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'leads',     label: 'Leads'     },
  { key: 'pipeline',  label: 'Pipeline'  },
  { key: 'billing',   label: 'Billing'   },
  { key: 'settings',  label: 'Settings'  },
];

export default function NavBar({ page, setPage, onLogout, user }) {
  const [open, setOpen] = useState(false);
  const go = k => { setPage(k); setOpen(false); };

  return (
    <>
      <nav className="nav">
        <button className="nav-logo" onClick={() => go('dashboard')}>MDO3D LEADS</button>
        <ul className="nav-links">
          {LINKS.map(l => (
            <li key={l.key}>
              <button
                className={`nav-link ${page === l.key ? 'active' : ''}`}
                onClick={() => go(l.key)}
              >
                {l.label}
              </button>
            </li>
          ))}
          <li>
            <button className="nav-cta" onClick={() => go('pipeline')}>Run Pipeline</button>
          </li>
          {onLogout && (
            <li>
              <button className="nav-link" onClick={onLogout} title={user?.email}>
                Logout
              </button>
            </li>
          )}
        </ul>
        <button className="nav-hamburger" onClick={() => setOpen(o => !o)}>
          <span /><span /><span />
        </button>
      </nav>
      <div className={`nav-mobile ${open ? 'open' : ''}`}>
        {LINKS.map(l => (
          <button
            key={l.key}
            className={`nav-link ${page === l.key ? 'active' : ''}`}
            onClick={() => go(l.key)}
          >
            {l.label}
          </button>
        ))}
      </div>
    </>
  );
}
