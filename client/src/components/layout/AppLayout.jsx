import { Outlet } from 'react-router-dom';
import TopBar from './TopBar.jsx';
import SideNav from './SideNav.jsx';

export default function AppLayout() {
  return (
    <div className="app-shell">
      <TopBar />
      <SideNav />
      <main className="main" id="main"><Outlet /></main>
    </div>
  );
}
