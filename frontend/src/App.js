import "./App.css";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";

import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import VerifyEmail from "./pages/VerifyEmail";
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
import { About, Blog, Career, Press, Help, FAQ, Contact } from "./pages/InfoPages";

const Gated = ({ children }) => (
  <ProtectedRoute>
    <Layout>{children}</Layout>
  </ProtectedRoute>
);

function Root() {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen bg-[#F7F9FC]" />;
  return user ? <Navigate to="/dashboard" replace /> : <Landing />;
}

function AppRouter() {
  const location = useLocation();
  if (location.hash?.includes("session_id=")) return <AuthCallback />;
  return (
    <Routes>
      <Route path="/" element={<Root />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/verify-email" element={<VerifyEmail />} />

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
      <Route path="/admin" element={<ProtectedRoute adminOnly><Layout><Admin /></Layout></ProtectedRoute>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRouter />
        <LiveActivity />
        <Toaster theme="light" position="top-right" richColors closeButton />
      </BrowserRouter>
    </AuthProvider>
  );
}
