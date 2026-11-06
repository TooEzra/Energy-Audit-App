import { NavLink } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';

const WORKFLOW = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/buildings', label: 'Buildings' },
  { to: '/energy', label: 'Energy Records' },
  { to: '/equipment', label: 'Equipment' },
  { to: '/audit', label: 'Audit' },
  { to: '/recommendations', label: 'Recommendations' },
  { to: '/reports', label: 'Reports' },
];
const ADMIN = [{ to: '/users', label: 'Users' }, { to: '/settings', label: 'Settings' }];

/** Follows the audit workflow. Users and Settings are shown to admins only (RoleRoute also blocks them). */
export default function SideNav() {
  const { isAdmin } = useAuth();
  const link = (i) => <li key={i.to}><NavLink to={i.to} end={i.end}>{i.label}</NavLink></li>;
  return (
    <nav className="sidenav no-print" aria-label="Main">
      <ul>{WORKFLOW.map(link)}</ul>
      {isAdmin && (<>
        <div className="nav-sep">Administration</div>
        <ul>{ADMIN.map(link)}</ul>
      </>)}
    </nav>
  );
}
