import React, { useState, useEffect } from 'react';
import { fetchTechnicalIndicators } from '../services/api';

const AnalysisPanel = ({ cryptoId }) => {
  const [indicators, setIndicators] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTimeframe, setSelectedTimeframe] = useState('24h');

  useEffect(() => {
    const loadIndicators = async () => {
      if (!cryptoId) return;
      
      setLoading(true);
      try {
        const data = await fetchTechnicalIndicators(cryptoId, selectedTimeframe);
        setIndicators(data);
        setLoading(false);
      } catch (err) {
        console.error('Error loading technical indicators:', err);
        setError('Failed to load indicators');
        setLoading(false);
      }
    };
    
    loadIndicators();
  }, [cryptoId, selectedTimeframe]);

  const handleTimeframeChange = (e) => {
    setSelectedTimeframe(e.target.value);
  };

  // Генерирует цветовой класс в зависимости от значения RSI
  const getRSIColorClass = (value) => {
    if (value >= 70) return 'text-danger';
    if (value <= 30) return 'text-success';
    return 'text-secondary';
  };

  // Генерирует цветовой класс в зависимости от сигнала
  const getSignalColorClass = (signal) => {
    if (signal === 'buy' || signal === 'bullish') return 'text-success';
    if (signal === 'sell' || signal === 'bearish') return 'text-danger';
    return 'text-secondary';
  };

  // Преобразует технический сигнал в человекочитаемый текст
  const translateSignal = (signal) => {
    switch (signal) {
      case 'buy': return 'Buy';
      case 'sell': return 'Sell';
      case 'bullish': return 'Bullish';
      case 'bearish': return 'Bearish';
      case 'neutral': return 'Neutral';
      default: return signal || 'Neutral';
    }
  };

  if (loading) {
    return (
      <div className="card">
        <div className="card-header">
          <h5 className="mb-0">Technical Analysis</h5>
        </div>
        <div className="card-body text-center py-4">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-2">Loading indicators...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card">
        <div className="card-header">
          <h5 className="mb-0">Technical Analysis</h5>
        </div>
        <div className="card-body">
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        </div>
      </div>
    );
  }

  if (!indicators) {
    return (
      <div className="card">
        <div className="card-header">
          <h5 className="mb-0">Technical Analysis</h5>
        </div>
        <div className="card-body">
          <p className="text-center py-3">No indicator data available</p>
        </div>
      </div>
    );
  }

  // Определяем общий сигнал
  let overallSignal = 'neutral';
  let overallSignalClass = 'text-secondary';
  
  if (indicators.interpretation && indicators.interpretation.overall && indicators.interpretation.overall.signal) {
    overallSignal = indicators.interpretation.overall.signal;
    overallSignalClass = getSignalColorClass(overallSignal);
  }

  return (
    <div className="card">
      <div className="card-header d-flex justify-content-between align-items-center">
        <h5 className="mb-0">Technical Analysis</h5>
        <div>
          <select 
            className="form-select form-select-sm" 
            value={selectedTimeframe}
            onChange={handleTimeframeChange}
          >
            <option value="1h">1 Hour</option>
            <option value="4h">4 Hours</option>
            <option value="24h">24 Hours</option>
            <option value="7d">7 Days</option>
          </select>
        </div>
      </div>
      <div className="card-body">
        <div className="text-center mb-4">
          <h4 className={overallSignalClass}>
            Signal: {translateSignal(overallSignal).toUpperCase()}
          </h4>
          <p className="text-muted small">Based on multiple indicators</p>
        </div>

        <div className="row">
          {/* Блок с индикаторами */}
          <div className="col-md-6">
            <h6>Momentum Indicators</h6>
            <ul className="list-group mb-3">
              {indicators.indicators && indicators.indicators.rsi && (
                <li className="list-group-item d-flex justify-content-between align-items-center">
                  <span>RSI (14)</span>
                  <span className={getRSIColorClass(indicators.indicators.rsi.value)}>
                    {indicators.indicators.rsi.value ? indicators.indicators.rsi.value.toFixed(2) : 'N/A'}
                  </span>
                </li>
              )}
              
              {indicators.indicators && indicators.indicators.stochastic && (
                <li className="list-group-item d-flex justify-content-between align-items-center">
                  <span>Stochastic</span>
                  <span>
                    {indicators.indicators.stochastic.k ? indicators.indicators.stochastic.k.toFixed(2) : 'N/A'} / 
                    {indicators.indicators.stochastic.d ? indicators.indicators.stochastic.d.toFixed(2) : 'N/A'}
                  </span>
                </li>
              )}
              
              {indicators.indicators && indicators.indicators.macd && (
                <li className="list-group-item d-flex justify-content-between align-items-center">
                  <span>MACD</span>
                  <span>
                    {indicators.indicators.macd.macd ? indicators.indicators.macd.macd.toFixed(2) : 'N/A'} / 
                    {indicators.indicators.macd.signal ? indicators.indicators.macd.signal.toFixed(2) : 'N/A'}
                  </span>
                </li>
              )}
            </ul>
          </div>

          {/* Блок с интерпретациями сигналов */}
          <div className="col-md-6">
            <h6>Signal Interpretation</h6>
            <ul className="list-group mb-3">
              {indicators.interpretation && indicators.interpretation.sma && (
                <li className="list-group-item d-flex justify-content-between align-items-center">
                  <span>SMA Trend</span>
                  <span className={getSignalColorClass(indicators.interpretation.sma.crossover)}>
                    {translateSignal(indicators.interpretation.sma.crossover)}
                  </span>
                </li>
              )}
              
              {indicators.interpretation && indicators.interpretation.ema && (
                <li className="list-group-item d-flex justify-content-between align-items-center">
                  <span>EMA Trend</span>
                  <span className={getSignalColorClass(indicators.interpretation.ema.crossover)}>
                    {translateSignal(indicators.interpretation.ema.crossover)}
                  </span>
                </li>
              )}
              
              {indicators.interpretation && indicators.interpretation.macd && (
                <li className="list-group-item d-flex justify-content-between align-items-center">
                  <span>MACD Signal</span>
                  <span className={getSignalColorClass(indicators.interpretation.macd.signal)}>
                    {translateSignal(indicators.interpretation.macd.signal)}
                  </span>
                </li>
              )}
            </ul>
          </div>
        </div>

        {/* Блок с рекомендациями по торговле */}
        <div className="mt-4">
          <h6>Trading Recommendation</h6>
          <div className="alert alert-secondary">
            {indicators.recommendation ? indicators.recommendation : 
             `Based on the current ${selectedTimeframe} analysis, the overall signal is ${translateSignal(overallSignal).toLowerCase()}. 
             This indicates ${overallSignal === 'buy' ? 'potentially favorable conditions for entry' : 
                           overallSignal === 'sell' ? 'potentially unfavorable conditions, consider reducing exposure' : 
                           'neutral market conditions, exercise caution'}.`}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalysisPanel;