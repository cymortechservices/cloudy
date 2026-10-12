import { Route, Routes } from 'react-router-dom';
import { Protected, PublicOnly } from './Auth';
import { AppLayout } from '../components/Layout';
import Landing from '../pages/Landing';
import { Login, Signup, Forgot, Reset, VerifyEmail } from '../pages/AuthPages';
import Dashboard from '../pages/Dashboard';
import Files from '../pages/Files';
import SettingsPage from '../pages/Settings';
import { About, Privacy, Terms, Contact } from '../pages/Static';

export default function App() {
  return <Routes>
    <Route path="/" element={<Landing />} />
    <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
    <Route path="/signup" element={<PublicOnly><Signup /></PublicOnly>} />
    <Route path="/forgot-password" element={<Forgot />} />
    <Route path="/reset-password" element={<Reset />} />
    <Route path="/verify-email" element={<VerifyEmail />} />
    <Route path="/about" element={<About />} /><Route path="/privacy" element={<Privacy />} /><Route path="/terms" element={<Terms />} /><Route path="/contact" element={<Contact />} />
    <Route element={<Protected><AppLayout /></Protected>}>
      <Route path="/dashboard" element={<Dashboard />} /><Route path="/files" element={<Files />} /><Route path="/settings" element={<SettingsPage />} />
    </Route>
    <Route path="*" element={<div className="p-10 text-center">Page not found.</div>} />
  </Routes>;
}
