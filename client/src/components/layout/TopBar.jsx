import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';
import Button from '../ui/Button.jsx';

/** App name, institution name (always visible), user and logout. */
export default function TopBar() {
  const { user, institution, logout } = useAuth();
  const navigate = useNavigate();
  const onLogout = async () => { await logout(); navigate('/login', { replace: true }); };
  return (
    <header className="topbar no-print">
      <div className="row">
        <span className="brand">Energy Audit</span>
        <span className="institution" aria-label="Institution">{institution?.name}</span>
      </div>
      <div className="who">
        <span>{user?.name} ({user?.role})</span>
        <Link to="/change-password" className="btn secondary small">Change password</Link>
        <Button variant="secondary" size="small" onClick={onLogout}>Log out</Button>
      </div>
    </header>
  );
}
