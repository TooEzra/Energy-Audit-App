import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './routes/ProtectedRoute.jsx';
import RoleRoute from './routes/RoleRoute.jsx';
import AppLayout from './components/layout/AppLayout.jsx';
import Register from './pages/Register.jsx';
import Login from './pages/Login.jsx';
import ChangePassword from './pages/ChangePassword.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Buildings from './pages/Buildings.jsx';
import EnergyRecords from './pages/EnergyRecords.jsx';
import Equipment from './pages/Equipment.jsx';
import Audit from './pages/Audit.jsx';
import Recommendations from './pages/Recommendations.jsx';
import Reports from './pages/Reports.jsx';
import Users from './pages/Users.jsx';
import Settings from './pages/Settings.jsx';
import NotFound from './pages/NotFound.jsx';

/** Route table. Public: /login, /register. Everything else needs a session; /users and /settings need the admin role. */
export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/change-password" element={<ChangePassword />} />
        <Route element={<AppLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="/dashboard" element={<Navigate to="/" replace />} />
          <Route path="/buildings" element={<Buildings />} />
          <Route path="/energy" element={<EnergyRecords />} />
          <Route path="/equipment" element={<Equipment />} />
          <Route path="/audit" element={<Audit />} />
          <Route path="/recommendations" element={<Recommendations />} />
          <Route path="/reports" element={<Reports />} />
          <Route element={<RoleRoute role="admin" />}>
            <Route path="/users" element={<Users />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Route>
      </Route>
    </Routes>
  );
}
