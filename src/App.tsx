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
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import { Modal } from "./components/Modal";
import { TransactionForm } from "./components/TransactionForm";
import { LoginPage } from "./pages/Login";

function AppContent() {
  const [activeTab, setActiveTab] = useState("dashboard");
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
        return <Reports setActiveTab={setActiveTab} />;
      case "settings":
        return <Settings setActiveTab={setActiveTab} />;
      case "recurring":
        return <div className="p-8 text-center text-slate-500">Fitur Transaksi Berulang sedang dalam pengembangan.</div>;
      case "notifications":
        return <div className="p-8 text-center text-slate-500">Halaman Notifikasi sedang dalam pengembangan.</div>;
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
    </AuthProvider>
  );
}

