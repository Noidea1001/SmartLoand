import { BrowserRouter, Route, Routes } from "react-router-dom";
import AppLayout from "./components/layout/AppLayout";
import ProtectedRoute from "./components/layout/ProtectedRoute";
import { AuthProvider } from "./context/AuthContext";
import { ToastProvider } from "./context/ToastContext";
import { ConfirmProvider } from "./context/ConfirmContext";
import { BrandingProvider } from "./context/BrandingContext";
import Login from "./features/auth/Login";
import Dashboard from "./features/dashboard/Dashboard";
import ClientList from "./features/clients/ClientList";
import ProductList from "./features/products/ProductList";
import LoanList from "./features/loans/LoanList";
import LoanDetail from "./features/loans/LoanDetail";
import RepaymentList from "./features/repayments/RepaymentList";
import PendingApprovals from "./features/loans/PendingApprovals";
import MyRequests from "./features/loans/MyRequests";
import RoleList from "./features/roles/RoleList";
import Settings from "./features/settings/Settings";
import ActivityLog from "./features/activity-log/ActivityLog";

export default function App() {
  return (
    <BrowserRouter>
      <BrandingProvider>
        <ToastProvider>
          <ConfirmProvider>
            <AuthProvider>
            <Routes>
              <Route path="/login" element={<Login />} />

              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <AppLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Dashboard />} />
                <Route path="loans" element={<LoanList />} />
                <Route path="repayments" element={<RepaymentList />} />
                <Route path="loans/pending-approval" element={<PendingApprovals />} />
                <Route path="loans/my-requests" element={<MyRequests />} />
                <Route path="loans/:id" element={<LoanDetail />} />
                <Route path="clients" element={<ClientList />} />
                <Route path="products" element={<ProductList />} />
                <Route path="roles" element={<RoleList />} />
                <Route path="activity-log" element={<ActivityLog />} />
                <Route path="settings" element={<Settings />} />
              </Route>
            </Routes>
          </AuthProvider>
        </ConfirmProvider>
      </ToastProvider>
      </BrandingProvider>
    </BrowserRouter>
  );
}
