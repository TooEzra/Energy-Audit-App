import { Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import Alert from '../components/ui/Alert.jsx';

/** Admin-only pages (Users, Settings). The server enforces this too; this just gives a clear message. */
export default function RoleRoute({ role = 'admin' }) {
  const { user } = useAuth();
  if (user?.role !== role) return <Alert variant="error">You do not have access to this page. It is available to administrators only.</Alert>;
  return <Outlet />;
}
