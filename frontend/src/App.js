import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// Компоненты
import Header from './components/common/Header';
import Dashboard from './components/Dashboard/Dashboard';
import CryptoDetail from './components/CryptoDetail/CryptoDetail';
import AlertsPage from './components/Alerts/AlertsPage';
import ComparisonPage from './components/Analysis/ComparisonPage';
import NotificationManager from './components/Notifications/NotificationManager';

// Контекст
import { CryptoProvider } from './context/CryptoContext';

function App() {
  return (
    <CryptoProvider>
      <Router>
        <div className="app">
          <Header />
          <main className="container mt-4">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/crypto/:id" element={<CryptoDetail />} />
              <Route path="/alerts" element={<AlertsPage />} />
              <Route path="/comparison" element={<ComparisonPage />} />
            </Routes>
          </main>
          {/* Менеджер уведомлений */}
          <NotificationManager />
        </div>
      </Router>
    </CryptoProvider>
  );
}

export default App;