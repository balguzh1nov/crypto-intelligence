import React, { useContext, useState, useEffect } from 'react';
import { CryptoContext } from '../context/CryptoContext';
import { formatDateTime } from '../services/formatter';
import { ALERT_TYPES, ALERT_SEVERITY } from '../utils/constants';

/**
 * Компонент для отображения оповещений о рынке
 * @param {Object} props - Свойства компонента
 * @param {number} props.limit - Максимальное количество отображаемых оповещений
 * @param {boolean} props.showHeader - Флаг для отображения заголовка
 * @param {boolean} props.showClearButton - Флаг для отображения кнопки очистки
 * @param {function} props.onAlertClick - Обработчик клика по оповещению
 */
const Alert = ({ 
  limit = 5, 
  showHeader = true, 
  showClearButton = false,
  onAlertClick 
}) => {
  const { alerts, isLoading } = useContext(CryptoContext);
  const [visibleAlerts, setVisibleAlerts] = useState([]);

  // Обновляем список видимых оповещений при изменении входных данных
  useEffect(() => {
    if (!alerts) return;
    
    setVisibleAlerts(alerts.slice(0, limit));
  }, [alerts, limit]);

  // Обработчик клика по оповещению
  const handleAlertClick = (cryptoId) => {
    if (onAlertClick && cryptoId) {
      onAlertClick(cryptoId);
    }
  };

  // Очистка видимых оповещений
  const handleClearAlerts = () => {
    setVisibleAlerts([]);
  };

  // Переводит тип оповещения на более понятный язык
  const translateAlertType = (alertType) => {
    switch (alertType) {
      case ALERT_TYPES.PRICE_SURGE:
        return 'Price Surge';
      case ALERT_TYPES.PRICE_DROP:
        return 'Price Drop';
      case ALERT_TYPES.PRICE_INCREASE:
        return 'Price Increase';
      case ALERT_TYPES.PRICE_DECREASE:
        return 'Price Decrease';
      case ALERT_TYPES.VOLUME_SPIKE:
        return 'Volume Spike';
      case ALERT_TYPES.VOLUME_CHANGE:
        return 'Volume Change';
      case ALERT_TYPES.RSI_OVERBOUGHT:
        return 'RSI Overbought';
      case ALERT_TYPES.RSI_OVERSOLD:
        return 'RSI Oversold';
      case ALERT_TYPES.MACD_BULLISH_CROSS:
        return 'MACD Bullish Cross';
      case ALERT_TYPES.MACD_BEARISH_CROSS:
        return 'MACD Bearish Cross';
      case ALERT_TYPES.SMA_BULLISH_CROSS:
        return 'SMA Bullish Cross';
      case ALERT_TYPES.SMA_BEARISH_CROSS:
        return 'SMA Bearish Cross';
      case ALERT_TYPES.STRONG_BUY_SIGNAL:
        return 'Strong Buy Signal';
      case ALERT_TYPES.STRONG_SELL_SIGNAL:
        return 'Strong Sell Signal';
      default:
        return alertType;
    }
  };

  // Определяет класс для обозначения уровня важности
  const getSeverityClass = (severity) => {
    switch (severity) {
      case ALERT_SEVERITY.HIGH:
        return 'bg-danger';
      case ALERT_SEVERITY.MEDIUM:
        return 'bg-warning';
      case ALERT_SEVERITY.LOW:
        return 'bg-info';
      default:
        return 'bg-secondary';
    }
  };

  if (isLoading) {
    return (
      <div className="card">
        {showHeader && (
          <div className="card-header">
            <h5 className="mb-0">Market Alerts</h5>
          </div>
        )}
        <div className="card-body text-center py-4">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-2">Loading alerts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      {showHeader && (
        <div className="card-header d-flex justify-content-between align-items-center">
          <h5 className="mb-0">Market Alerts</h5>
          {showClearButton && visibleAlerts.length > 0 && (
            <button 
              className="btn btn-sm btn-outline-secondary"
              onClick={handleClearAlerts}
            >
              Clear
            </button>
          )}
        </div>
      )}
      <div className="card-body p-0">
        {visibleAlerts.length === 0 ? (
          <div className="text-center py-4">
            <p className="mb-0">No alerts at this time</p>
            <p className="text-muted small">
              Alerts will appear here when significant market events are detected
            </p>
          </div>
        ) : (
          <div className="list-group list-group-flush">
            {visibleAlerts.map(alert => (
              <div 
                key={alert.id || `${alert.crypto_id}-${alert.timestamp}`} 
                className="list-group-item list-group-item-action"
                onClick={() => handleAlertClick(alert.crypto_id)}
                style={{ cursor: onAlertClick ? 'pointer' : 'default' }}
              >
                <div className="d-flex w-100 justify-content-between">
                  <h6 className="mb-1">
                    <span className={`badge ${getSeverityClass(alert.severity)} me-2`}>
                      {translateAlertType(alert.alert_type)}
                    </span>
                    {alert.crypto_symbol ? alert.crypto_symbol.toUpperCase() : ''}
                  </h6>
                  <small className="text-muted">{formatDateTime(alert.timestamp)}</small>
                </div>
                <p className="mb-1 small">{alert.message}</p>
                {alert.percentage_change && (
                  <small className={alert.percentage_change >= 0 ? 'text-success' : 'text-danger'}>
                    Change: {alert.percentage_change >= 0 ? '+' : ''}{alert.percentage_change.toFixed(2)}%
                  </small>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Компонент для отображения всплывающих уведомлений о новых оповещениях
 */
export const AlertToast = ({ alert, onClose }) => {
  const [isVisible, setIsVisible] = useState(true);
  
  useEffect(() => {
    // Автоматически скрываем уведомление через 5 секунд
    const timer = setTimeout(() => {
      setIsVisible(false);
      if (onClose) onClose();
    }, 5000);
    
    return () => clearTimeout(timer);
  }, [onClose]);
  
  if (!alert || !isVisible) return null;
  
  const getSeverityClass = (severity) => {
    switch (severity) {
      case ALERT_SEVERITY.HIGH:
        return 'bg-danger';
      case ALERT_SEVERITY.MEDIUM:
        return 'bg-warning';
      case ALERT_SEVERITY.LOW:
        return 'bg-info';
      default:
        return 'bg-secondary';
    }
  };
  
  return (
    <div className="toast show" role="alert" aria-live="assertive" aria-atomic="true">
      <div className={`toast-header ${getSeverityClass(alert.severity)} text-white`}>
        <strong className="me-auto">
          {translateAlertType(alert.alert_type)}
        </strong>
        <small>{alert.crypto_symbol ? alert.crypto_symbol.toUpperCase() : ''}</small>
        <button 
          type="button" 
          className="btn-close" 
          data-bs-dismiss="toast" 
          aria-label="Close"
          onClick={() => {
            setIsVisible(false);
            if (onClose) onClose();
          }}
        ></button>
      </div>
      <div className="toast-body">
        {alert.message}
        {alert.percentage_change && (
          <div className="mt-1">
            <small className={alert.percentage_change >= 0 ? 'text-success' : 'text-danger'}>
              Change: {alert.percentage_change >= 0 ? '+' : ''}{alert.percentage_change.toFixed(2)}%
            </small>
          </div>
        )}
      </div>
    </div>
  );
};

export default Alert;