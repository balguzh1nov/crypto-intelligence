import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { CryptoContext } from '../../context/CryptoContext';
import { formatDateTime } from '../../services/formatter';

// Стилизованные компоненты
const PageContainer = styled.div`
  padding: 1.5rem;
  max-width: 1000px;
  margin: 0 auto;
`;

const PageTitle = styled.h2`
  font-weight: 600;
  color: #1a1a2e;
  margin-bottom: 1.5rem;
  font-size: 1.8rem;
`;

const AlertsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const AlertCard = styled.div`
  background: #ffffff;
  border-radius: 10px;
  padding: 1.2rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  cursor: pointer;
  transition: all 0.25s ease;
  border-left: 4px solid ${props => {
    switch (props.severity) {
      case 'high': return '#ef4444';
      case 'medium': return '#f59e0b';
      case 'low': return '#3b82f6';
      default: return '#9ca3af';
    }
  }};
  
  &:hover {
    transform: translateY(-3px);
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
  }
`;

const AlertHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
`;

const AlertTitle = styled.h5`
  margin: 0;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 1.1rem;
`;

const AlertType = styled.span`
  display: inline-block;
  padding: 0.3rem 0.6rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 500;
  background-color: ${props => {
    switch (props.severity) {
      case 'high': return '#fef2f2';
      case 'medium': return '#fffbeb';
      case 'low': return '#eff6ff';
      default: return '#f3f4f6';
    }
  }};
  color: ${props => {
    switch (props.severity) {
      case 'high': return '#ef4444';
      case 'medium': return '#f59e0b';
      case 'low': return '#3b82f6';
      default: return '#9ca3af';
    }
  }};
`;

const AlertSymbol = styled.span`
  color: #1a1a2e;
`;

const AlertTimestamp = styled.small`
  color: #6b7280;
  font-size: 0.85rem;
`;

const AlertMessage = styled.p`
  margin-bottom: 0.5rem;
  color: #374151;
  font-size: 0.95rem;
`;

const AlertDetails = styled.small`
  color: #6b7280;
  font-size: 0.85rem;
`;

const EmptyMessage = styled.div`
  background-color: #f3f4f6;
  border-radius: 10px;
  padding: 1.5rem;
  text-align: center;
  color: #6b7280;
  font-size: 1rem;
`;

const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  margin: 3rem 0;
`;

const Spinner = styled.div`
  width: 50px;
  height: 50px;
  border: 4px solid rgba(76, 201, 240, 0.2);
  border-top-color: #4cc9f0;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
`;

const LoadingText = styled.p`
  margin-top: 1rem;
  font-size: 1rem;
  color: #6c757d;
`;

const AlertsPage = () => {
  const { alerts, isLoading } = useContext(CryptoContext);
  const navigate = useNavigate();

  const handleAlertClick = (cryptoId) => {
    if (cryptoId) {
      navigate(`/crypto/${cryptoId}`);
    }
  };

  // Переводит тип оповещения на русский язык
  const translateAlertType = (alertType) => {
    switch (alertType) {
      case 'price_surge':
        return 'Резкий рост цены';
      case 'price_drop':
        return 'Резкое падение цены';
      case 'price_increase':
        return 'Повышение цены';
      case 'price_decrease':
        return 'Снижение цены';
      case 'volume_spike':
        return 'Всплеск объема';
      case 'volume_change':
        return 'Изменение объема';
      case 'rsi_overbought':
        return 'RSI перекуплен';
      case 'rsi_oversold':
        return 'RSI перепродан';
      case 'macd_bullish_cross':
        return 'MACD бычье пересечение';
      case 'macd_bearish_cross':
        return 'MACD медвежье пересечение';
      case 'sma_bullish_cross':
        return 'SMA бычье пересечение';
      case 'sma_bearish_cross':
        return 'SMA медвежье пересечение';
      case 'strong_buy_signal':
        return 'Сильный сигнал покупки';
      case 'strong_sell_signal':
        return 'Сильный сигнал продажи';
      default:
        return alertType;
    }
  };

  if (isLoading) {
    return (
      <LoadingContainer>
        <Spinner />
        <LoadingText>Загрузка оповещений...</LoadingText>
      </LoadingContainer>
    );
  }

  return (
    <PageContainer>
      <PageTitle>Рыночные оповещения</PageTitle>

      {alerts.length === 0 ? (
        <EmptyMessage>
          В данный момент оповещений нет. Оповещения появятся здесь, когда будут обнаружены значимые рыночные события.
        </EmptyMessage>
      ) : (
        <AlertsList>
          {alerts.map(alert => (
            <AlertCard 
              key={alert.id || `${alert.crypto_id}-${alert.timestamp}`} 
              onClick={() => handleAlertClick(alert.crypto_id)}
              severity={alert.severity}
            >
              <AlertHeader>
                <AlertTitle>
                  <AlertType severity={alert.severity}>
                    {translateAlertType(alert.alert_type)}
                  </AlertType>
                  <AlertSymbol>
                    {alert.crypto_symbol ? alert.crypto_symbol.toUpperCase() : ''}
                  </AlertSymbol>
                </AlertTitle>
                <AlertTimestamp>{formatDateTime(alert.timestamp)}</AlertTimestamp>
              </AlertHeader>
              <AlertMessage>{alert.message}</AlertMessage>
              {alert.percentage_change && (
                <AlertDetails>
                  Изменение: {alert.percentage_change.toFixed(2)}%
                </AlertDetails>
              )}
            </AlertCard>
          ))}
        </AlertsList>
      )}
    </PageContainer>
  );
};

export default AlertsPage;