import React, { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import { DialogProvider } from './context/DialogContext';

// Page Components
import DashboardPage from './pages/DashboardPage';
import CollectionPage from './pages/CollectionPage';
import InventoryPage from './pages/InventoryPage';
import SuppliersPage from './pages/SuppliersPage';
import AnalyticsPage from './pages/AnalyticsPage';
import SettingsPage from './pages/SettingsPage';

export default function App() {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <DialogProvider>
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex font-sans antialiased selection:bg-white selection:text-black">
        {/* Sidebar Navigation */}
        <Sidebar />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          <Navbar
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
          />

          <main className="flex-1 overflow-y-auto">
            <Routes>
              {/* Default Route: Dashboard */}
              <Route path="/" element={<DashboardPage />} />

              {/* Medicine Collection Page */}
              <Route path="/collection" element={<CollectionPage searchQuery={searchQuery} />} />

              {/* Medicine Stock Page */}
              <Route path="/inventory" element={<InventoryPage />} />

              {/* Pharma Suppliers Page */}
              <Route path="/suppliers" element={<SuppliersPage />} />

              {/* Tax & Analytics Page */}
              <Route path="/analytics" element={<AnalyticsPage />} />

              {/* System Preferences Page */}
              <Route path="/settings" element={<SettingsPage />} />

              {/* Fallback Route */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </div>
    </DialogProvider>
  );
}
