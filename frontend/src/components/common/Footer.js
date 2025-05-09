import React, { useContext } from 'react';
import { CryptoContext } from '../context/CryptoContext';

/**
 * Компонент футера приложения
 */
const Footer = () => {
  const { lastUpdated, isConnected } = useContext(CryptoContext);
  
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="footer mt-auto py-3 bg-light">
      <div className="container">
        <div className="row">
          <div className="col-md-4">
            <h6>Crypto Intelligence</h6>
            <p className="text-muted small mb-0">
              Real-time cryptocurrency tracking and analysis platform
            </p>
            <p className="text-muted small mb-0">
              © {currentYear} Crypto Intelligence. All rights reserved.
            </p>
          </div>
          
          <div className="col-md-4 text-center">
            <div className="mb-2">
              <div className="d-flex justify-content-center">
                <span className="me-2">Server Status:</span>
                <span className={isConnected ? 'text-success' : 'text-danger'}>
                  {isConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
              {lastUpdated && (
                <div className="text-muted small">
                  Last updated: {lastUpdated.toLocaleTimeString()}
                </div>
              )}
            </div>
            <div className="text-muted small">
              Data provided by CoinGecko API
            </div>
          </div>
          
          <div className="col-md-4 text-md-end">
            <h6>Quick Links</h6>
            <ul className="list-unstyled">
              <li><a href="/" className="text-decoration-none">Dashboard</a></li>
              <li><a href="/alerts" className="text-decoration-none">Alerts</a></li>
              <li><a href="/settings" className="text-decoration-none">Settings</a></li>
              <li><a href="/help" className="text-decoration-none">Help</a></li>
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
};

/**
 * Упрощенная версия футера для использования в компактных представлениях
 */
export const SimpleFooter = () => {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="footer mt-auto py-2 bg-light">
      <div className="container">
        <div className="d-flex justify-content-between align-items-center">
          <p className="text-muted small mb-0">
            © {currentYear} Crypto Intelligence
          </p>
          <p className="text-muted small mb-0">
            Data provided by CoinGecko API
          </p>
        </div>
      </div>
    </footer>
  );
};

/**
 * Компонент мини-футера для мобильных устройств
 */
export const MobileFooter = () => {
  const { isConnected } = useContext(CryptoContext);
  
  return (
    <footer className="footer mt-auto py-2 bg-light d-md-none">
      <div className="container">
        <div className="d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center">
            <span className={`status-indicator ${isConnected ? 'bg-success' : 'bg-danger'}`}></span>
            <span className="ms-1 text-muted small">
              {isConnected ? 'Live' : 'Offline'}
            </span>
          </div>
          <span className="text-muted small">Crypto Intelligence</span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;