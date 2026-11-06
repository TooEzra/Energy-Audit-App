import { Link } from 'react-router-dom';
import EmptyState from '../components/ui/EmptyState.jsx';

export default function NotFound() {
  return <EmptyState title="Page not found" action={<Link to="/" className="btn">Go to the dashboard</Link>}>That page does not exist.</EmptyState>;
}
