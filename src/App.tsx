/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { FinanceProvider } from "./context/FinanceContext";
import Dashboard from "./pages/Dashboard";
import Transactions from "./pages/Transactions";
import BudgetPage from "./pages/Budget";
import GoalsPage from "./pages/Goals";
import Reports, { ReportRoleFilter } from "./pages/Reports";
import PurchasesPage from "./pages/Purchases";
import FamilyPage from "./pages/Family";
import Settings from "./pages/Settings";
import { Modal } from "./components/Modal";
import { TransactionForm } from "./components/TransactionForm";
import { LoginPage } from "./pages/Login";
import { OfflineIndicator } from "./components/OfflineIndicator";
import { FamilyRole } from "./types";

function AppContent() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [reportRole, setReportRole] = useState<ReportRoleFilter>("self");
  const { user } = useAuth();

  if (!user) {
    return <LoginPage />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return <Dashboard setActiveTab={setActiveTab} />;
      case "transactions":
        return <Transactions setActiveTab={setActiveTab} />;
      case "budget":
        return <BudgetPage setActiveTab={setActiveTab} />;
      case "goals":
        return <GoalsPage setActiveTab={setActiveTab} />;
      case "reports":
        return (
          <Reports
            setActiveTab={setActiveTab}
            selectedRole={reportRole}
            onSelectedRoleChange={setReportRole}
          />
        );
      case "settings":
        return <Settings setActiveTab={setActiveTab} />;
      case "purchases":
        return <PurchasesPage setActiveTab={setActiveTab} />;
      case "family":
        return (
          <FamilyPage
            setActiveTab={setActiveTab}
            onOpenRoleReport={(role: FamilyRole) => {
              setReportRole(role);
              setActiveTab("reports");
            }}
          />
        );
      case "add_transaction":
        return (
          <Dashboard setActiveTab={setActiveTab}>
            <Modal isOpen={true} onClose={() => setActiveTab("dashboard")} title="Transaksi Baru">
              <TransactionForm onClose={() => setActiveTab("dashboard")} />
            </Modal>
          </Dashboard>
        );
      default:
        return <Dashboard setActiveTab={setActiveTab} />;
    }
  };

  return (
    <FinanceProvider>
      {renderContent()}
    </FinanceProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
      <OfflineIndicator />
    </AuthProvider>
  );
}

