import React, { useContext } from 'react';
import { CryptoContext } from '../../context/CryptoContext';
import { formatCurrency, formatLargeNumber, formatPercentage } from '../../services/formatter';

const MarketOverview = () => {
  const { marketData, lastUpdated, isLoading } = useContext(CryptoContext);

  // Расчет общей рыночной капитализации
  const calculateTotalMarketCap = () => {
    if (!marketData || marketData.length === 0) return 0;
    
    return marketData.reduce((total, crypto) => {
      return total + (crypto.market_cap || 0);
    }, 0);
  };

  // Расчет общего объема торгов за 24 часа
  const calculateTotal24hVolume = () => {
    if (!marketData || marketData.length === 0) return 0;
    
    return marketData.reduce((total, crypto) => {
      return total + (crypto.total_volume || 0);
    }, 0);
  };

  // Расчет средних изменений цены за 24 часа
  const calculateAverage24hChange = () => {
    if (!marketData || marketData.length === 0) return 0;
    
    const sum = marketData.reduce((total, crypto) => {
      return total + (crypto.price_change_percentage_24h || 0);
    }, 0);
    
    return sum / marketData.length;
  };

  // Расчет доминирования Bitcoin на рынке (в процентах)
  const calculateBTCDominance = () => {
    if (!marketData || marketData.length === 0) return 0;
    
    const totalMarketCap = calculateTotalMarketCap();
    const bitcoin = marketData.find(crypto => crypto.id === 'bitcoin');
    
    if (!bitcoin || !bitcoin.market_cap || totalMarketCap === 0) return 0;
    
    return (bitcoin.market_cap / totalMarketCap) * 100;
  };

  if (isLoading) {
    return (
      <div className="card">
        <div className="card-header">
          <h5 className="mb-0">Market Overview</h5>
        </div>
        <div className="card-body text-center py-4">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-2">Loading market data...</p>
        </div>
      </div>
    );
  }

  // Рассчитываем значения
  const totalMarketCap = calculateTotalMarketCap();
  const total24hVolume = calculateTotal24hVolume();
  const average24hChange = calculateAverage24hChange();
  const btcDominance = calculateBTCDominance();

  return (
    <div className="card mb-4">
      <div className="card-header d-flex justify-content-between align-items-center">
        <h5 className="mb-0">Market Overview</h5>
        {lastUpdated && (
          <small className="text-muted">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </small>
        )}
      </div>
      <div className="card-body">
        <div className="market-stats">
          <div className="market-stat-item">
            <h6>Total Market Cap</h6>
            <div className="value">{formatLargeNumber(totalMarketCap)}</div>
          </div>
          
          <div className="market-stat-item">
            <h6>24h Volume</h6>
            <div className="value">{formatLargeNumber(total24hVolume)}</div>
          </div>
          
          <div className="market-stat-item">
            <h6>Avg. 24h Change</h6>
            <div className={`value ${average24hChange >= 0 ? 'text-success' : 'text-danger'}`}>
              {average24hChange >= 0 ? '▲' : '▼'} {formatPercentage(Math.abs(average24hChange))}
            </div>
          </div>
          
          <div className="market-stat-item">
            <h6>BTC Dominance</h6>
            <div className="value">{formatPercentage(btcDominance)}</div>
          </div>
          
          <div className="market-stat-item">
            <h6>Cryptocurrencies</h6>
            <div className="value">{marketData.length}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MarketOverview;