import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import AdminDashboard from './pages/AdminDashboard';
import EvenementsPage from './pages/EvenementsPage';
import ParticipantView from './pages/ParticipantView';
import PublicConsultation from './pages/PublicConsultation';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/benevoles" replace />} />
        <Route path="/benevoles" element={<PublicConsultation />} />
        <Route path="/participant" element={<ParticipantView />} />
        <Route path="/admin" element={<EvenementsPage />} />
        <Route path="/admin/:slug" element={<AdminDashboard />} />
      </Routes>
    </BrowserRouter>
  );
}
