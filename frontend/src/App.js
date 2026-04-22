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
import AuthCallback from "./pages/AuthCallback";
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

const Gated = ({ children }) => (
  <ProtectedRoute>
    <Layout>{children}</Layout>
  </ProtectedRoute>
);

function Root() {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen bg-[#070A0F]" />;
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
        <Toaster theme="dark" position="top-right" richColors closeButton />
      </BrowserRouter>
    </AuthProvider>
  );
}
