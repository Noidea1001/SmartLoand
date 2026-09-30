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
import ReportsCenter from "./features/reports/ReportsCenter";
import CollateralVault from "./features/collaterals/CollateralVault";
import ReminderCenter from "./features/reminders/ReminderCenter";
import CashierClosing from "./features/cashier/CashierClosing";
import OfficerAnalytics from "./features/officers/OfficerAnalytics";
import GuarantorRegistry from "./features/guarantors/GuarantorRegistry";
import CbcExportCenter from "./features/cbc/CbcExportCenter";
import EarlyWarningSystem from "./features/early-warning/EarlyWarningSystem";
import DocumentVault from "./features/documents/DocumentVault";
import BranchManagement from "./features/branches/BranchManagement";
import RestructureSimulator from "./features/restructure/RestructureSimulator";
import LoanCalculator from "./features/calculator/LoanCalculator";
import FieldCollectionSheet from "./features/field-collection/FieldCollectionSheet";
import EodProcessing from "./features/eod/EodProcessing";
import RiskWatchlist from "./features/watchlist/RiskWatchlist";
import NbcProvisioning from "./features/nbc/NbcProvisioning";
import WriteOffTracker from "./features/writeoffs/WriteOffTracker";
import FxExchangeDrawer from "./features/fx/FxExchangeDrawer";
import TelegramBotDispatcher from "./features/telegram/TelegramBotDispatcher";
import LoanIntakeLeads from "./features/leads/LoanIntakeLeads";
import PublicLoanApply from "./features/leads/PublicLoanApply";
import BakongKhqrHub from "./features/bakong/BakongKhqrHub";
import CreditScoringMatrix from "./features/scoring/CreditScoringMatrix";
import GeneralLedger from "./features/accounting/GeneralLedger";

export default function App() {
  return (
    <BrowserRouter>
      <BrandingProvider>
        <ToastProvider>
          <ConfirmProvider>
            <AuthProvider>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/apply" element={<PublicLoanApply />} />

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
                <Route path="reports" element={<ReportsCenter />} />
                <Route path="nbc-provisioning" element={<NbcProvisioning />} />
                <Route path="write-offs" element={<WriteOffTracker />} />
                <Route path="fx-exchange" element={<FxExchangeDrawer />} />
                <Route path="telegram-bot" element={<TelegramBotDispatcher />} />
                <Route path="bakong-khqr" element={<BakongKhqrHub />} />
                <Route path="credit-scoring" element={<CreditScoringMatrix />} />
                <Route path="general-ledger" element={<GeneralLedger />} />
                <Route path="loan-intake" element={<LoanIntakeLeads />} />
                <Route path="collaterals" element={<CollateralVault />} />
                <Route path="reminders" element={<ReminderCenter />} />
                <Route path="cashier-closing" element={<CashierClosing />} />
                <Route path="officers" element={<OfficerAnalytics />} />
                <Route path="guarantors" element={<GuarantorRegistry />} />
                <Route path="cbc" element={<CbcExportCenter />} />
                <Route path="early-warning" element={<EarlyWarningSystem />} />
                <Route path="documents" element={<DocumentVault />} />
                <Route path="branches" element={<BranchManagement />} />
                <Route path="restructure-simulator" element={<RestructureSimulator />} />
                <Route path="loan-calculator" element={<LoanCalculator />} />
                <Route path="field-collection" element={<FieldCollectionSheet />} />
                <Route path="eod-processing" element={<EodProcessing />} />
                <Route path="risk-watchlist" element={<RiskWatchlist />} />
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
