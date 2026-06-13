import "./App.css";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { SettingsProvider, useSettings } from "./contexts/SettingsContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";

import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import VerifyEmail from "./pages/VerifyEmail";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import AuthCallback from "./pages/AuthCallback"; // kept for legacy stray links
import Dashboard from "./pages/Dashboard";
import Markets from "./pages/Markets";
import Trade from "./pages/Trade";
import Wallet from "./pages/Wallet";
import Deposit from "./pages/Deposit";
import Withdraw from "./pages/Withdraw";
import History from "./pages/History";
import KYC from "./pages/KYC";
import Profile from "./pages/Profile";
import Watchlist from "./pages/Watchlist";
import Admin from "./pages/Admin";
import Support from "./pages/Support";
import Transfer from "./pages/Transfer";
import LiveActivity from "./components/LiveActivity";
import SupportWidget from "./components/SupportWidget";
import {
  About, Blog, Career, Press, Help, FAQ, Contact,
  Security, Terms, Privacy, Risk, Fees, Announcements,
} from "./pages/InfoPages";

const Gated = ({ children }) => (
  <ProtectedRoute>
    <Layout>{children}</Layout>
  </ProtectedRoute>
);

function Root() {
  const { loading } = useAuth();
  if (loading) return <div className="min-h-screen bg-[#F7F9FC]" />;
  // Logged-in users may also browse the public landing page.
  return <Landing />;
}

function MaintenanceGate({ children }) {
  const { settings, loaded } = useSettings();
  const { user } = useAuth();
  if (!loaded) return null;
  if (settings.maintenance_mode && user?.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7F9FC] p-6 text-center">
        <div className="card-surface p-10 max-w-lg">
          <div className="w-12 h-12 rounded-xl bg-[#16A34A] text-white font-bold text-2xl flex items-center justify-center mx-auto">C</div>
          <h1 className="font-display text-3xl mt-5">{settings.site_name || "Coinberx"} bakım modunda</h1>
          <p className="text-[#64748B] mt-3">{settings.site_description || "Kısa süre içinde tekrar hizmetinizdeyiz."}</p>
          <p className="text-xs text-[#64748B] mt-6">İletişim: <a className="text-[#16A34A]" href={`mailto:${settings.contact_email}`}>{settings.contact_email}</a></p>
        </div>
      </div>
    );
  }
  return children;
}

function AppRouter() {
  const location = useLocation();
  const { settings } = useSettings();
  if (location.hash?.includes("session_id=")) return <AuthCallback />;
  return (
    <Routes>
      <Route path="/" element={<Root />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/verify-email" element={<VerifyEmail />} />
      {settings.forgot_password_enabled && <Route path="/forgot-password" element={<ForgotPassword />} />}
      <Route path="/reset-password" element={<ResetPassword />} />

      <Route path="/dashboard" element={<Gated><Dashboard /></Gated>} />
      <Route path="/markets" element={<Gated><Markets /></Gated>} />
      <Route path="/trade/:symbol" element={<Gated><Trade /></Gated>} />
      <Route path="/wallet" element={<Gated><Wallet /></Gated>} />
      <Route path="/deposit" element={<Gated><Deposit /></Gated>} />
      <Route path="/withdraw" element={<Gated><Withdraw /></Gated>} />
      <Route path="/history" element={<Gated><History /></Gated>} />
      <Route path="/kyc" element={<Gated><KYC /></Gated>} />
      <Route path="/profile" element={<Gated><Profile /></Gated>} />
      <Route path="/watchlist" element={<Gated><Watchlist /></Gated>} />
      <Route path="/support" element={<Gated><Support /></Gated>} />
      <Route path="/transfer" element={<Gated><Transfer /></Gated>} />
      <Route path="/about" element={<About />} />
      <Route path="/blog" element={<Blog />} />
      <Route path="/career" element={<Career />} />
      <Route path="/press" element={<Press />} />
      <Route path="/help" element={<Help />} />
      <Route path="/faq" element={<FAQ />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="/security" element={<Security />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/risk" element={<Risk />} />
      <Route path="/fees" element={<Fees />} />
      <Route path="/announcements" element={<Announcements />} />
      <Route path="/admin" element={<ProtectedRoute adminOnly><Layout><Admin /></Layout></ProtectedRoute>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function AppInner() {
  const { settings } = useSettings();
  return (
    <MaintenanceGate>
      <AppRouter />
      <LiveActivity />
      {settings.live_chat_enabled && <SupportWidget />}
      <Toaster theme="light" position="top-right" richColors closeButton />
    </MaintenanceGate>
  );
}

export default function App() {
  return (
    <SettingsProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppInner />
        </BrowserRouter>
      </AuthProvider>
    </SettingsProvider>
  );
}
