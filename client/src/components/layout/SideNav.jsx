import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';
import Button from '../ui/Button.jsx';

const WORKFLOW = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/buildings', label: 'Facilities' },
  { to: '/energy', label: 'Energy Records' },
  { to: '/equipment', label: 'Equipment' },
  { to: '/audit', label: 'Audit' },
  { to: '/recommendations', label: 'Recommendations' },
  { to: '/reports', label: 'Reports' },
];
const ADMIN = [{ to: '/users', label: 'Users' }, { to: '/settings', label: 'Settings' }];

/** Follows the audit workflow. Users and Settings are shown to admins only (RoleRoute also blocks them).
 *  On phones it slides in from the left (`open`) and also holds the account actions that the top bar hides. */
export default function SideNav({ open = false }) {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const onLogout = async () => { await logout(); navigate('/login', { replace: true }); };
  const link = (i) => <li key={i.to}><NavLink to={i.to} end={i.end}>{i.label}</NavLink></li>;
  return (
    <nav id="main-nav" className={`sidenav no-print${open ? ' open' : ''}`} aria-label="Main">
      <ul>{WORKFLOW.map(link)}</ul>
      {isAdmin && (<>
        <div className="nav-sep">Administration</div>
        <ul>{ADMIN.map(link)}</ul>
      </>)}
      <div className="nav-account">
        <div className="nav-sep">Account</div>
        <div className="nav-user">{user?.name} ({user?.role})</div>
        <div className="row nav-actions">
          <Link to="/change-password" className="btn secondary small">Change password</Link>
          <Button variant="secondary" size="small" onClick={onLogout}>Log out</Button>
        </div>
      </div>
    </nav>
  );
}
