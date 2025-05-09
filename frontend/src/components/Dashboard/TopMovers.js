import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { CryptoContext } from '../../context/CryptoContext';
import { formatCurrency, formatPercentage } from '../../services/formatter';

const TopMovers = () => {
  const { marketData, isLoading } = useContext(CryptoContext);
  const navigate = useNavigate();

  const handleCryptoClick = (cryptoId) => {
    navigate(`/crypto/${cryptoId}`);
  };

  if (isLoading) {
    return (
      <div className="card">
        <div className="card-header">
          <h5 className="mb-0">Top Movers</h5>
        </div>
        <div className="card-body text-center py-4">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  // Получаем топ 5 по росту
  const topGainers = [...marketData]
    .sort((a, b) => b.price_change_percentage_24h - a.price_change_percentage_24h)
    .slice(0, 5);

  // Получаем топ 5 по падению
  const topLosers = [...marketData]
    .sort((a, b) => a.price_change_percentage_24h - b.price_change_percentage_24h)
    .slice(0, 5);

  return (
    <div className="row">
      <div className="col-md-6 mb-4">
        <div className="card top-movers-card top-gainers">
          <div className="card-header">
            <h5 className="mb-0 text-success">Top Gainers (24h)</h5>
          </div>
          <div className="card-body p-0">
            <ul className="list-group list-group-flush">
              {topGainers.map(crypto => (
                <li 
                  key={crypto.id} 
                  className="list-group-item d-flex justify-content-between align-items-center" 
                  onClick={() => handleCryptoClick(crypto.id)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="d-flex align-items-center">
                    <img 
                      src={crypto.image} 
                      alt={crypto.name} 
                      style={{ height: '25px', marginRight: '10px' }} 
                    />
                    <span>{crypto.symbol.toUpperCase()}</span>
                  </div>
                  <div className="d-flex flex-column align-items-end">
                    <span>{formatCurrency(crypto.current_price)}</span>
                    <span className="text-success">
                      ▲ {formatPercentage(crypto.price_change_percentage_24h)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="col-md-6 mb-4">
        <div className="card top-movers-card top-losers">
          <div className="card-header">
            <h5 className="mb-0 text-danger">Top Losers (24h)</h5>
          </div>
          <div className="card-body p-0">
            <ul className="list-group list-group-flush">
              {topLosers.map(crypto => (
                <li 
                  key={crypto.id} 
                  className="list-group-item d-flex justify-content-between align-items-center" 
                  onClick={() => handleCryptoClick(crypto.id)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="d-flex align-items-center">
                    <img 
                      src={crypto.image} 
                      alt={crypto.name} 
                      style={{ height: '25px', marginRight: '10px' }} 
                    />
                    <span>{crypto.symbol.toUpperCase()}</span>
                  </div>
                  <div className="d-flex flex-column align-items-end">
                    <span>{formatCurrency(crypto.current_price)}</span>
                    <span className="text-danger">
                      ▼ {formatPercentage(Math.abs(crypto.price_change_percentage_24h))}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TopMovers;