import { BrowserRouter, Route, Routes } from 'react-router-dom';
import AdminDashboard from './pages/AdminDashboard';
import PublicConsultation from './pages/PublicConsultation';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<PublicConsultation />} />
        <Route path="/admin" element={<AdminDashboard />} />
      </Routes>
    </BrowserRouter>
  );
}
