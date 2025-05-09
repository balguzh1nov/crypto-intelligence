import React, { useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { CryptoContext } from '../../context/CryptoContext';
import { formatCurrency, formatPercentage } from '../../services/formatter';

// Стилизованные компоненты
const DashboardContainer = styled.div`
  margin-bottom: 2rem;
`;

const DashboardCard = styled.div`
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  overflow: hidden;
  transition: all 0.3s ease;
  margin-bottom: 1.5rem;
`;

const CardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.2rem 1.5rem;
  background: linear-gradient(90deg, #f8f9fa 0%, #e9ecef 100%);
  border-bottom: 1px solid #dee2e6;
`;

const CardTitle = styled.h5`
  margin: 0;
  font-weight: 600;
  color: #212529;
  font-size: 1.1rem;
`;

const SortSelect = styled.select`
  padding: 0.4rem 0.8rem;
  border-radius: 6px;
  border: 1px solid #ced4da;
  font-size: 0.85rem;
  background-color: #fff;
  cursor: pointer;
  transition: all 0.2s;
  
  &:focus {
    outline: none;
    box-shadow: 0 0 0 3px rgba(76, 201, 240, 0.25);
    border-color: #4cc9f0;
  }
`;

const CardBody = styled.div`
  padding: 1.5rem;
`;

const CryptoGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1.2rem;
  
  @media (max-width: 768px) {
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 0.8rem;
  }
`;

const CryptoCard = styled.div`
  position: relative;
  background: #ffffff;
  border-radius: 10px;
  padding: 1.2rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  cursor: pointer;
  transition: all 0.25s ease;
  border: 1px solid #e9ecef;
  text-align: center;
  
  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
  }
`;

const CryptoLogo = styled.img`
  height: 50px;
  width: auto;
  margin-bottom: 0.8rem;
  border-radius: 50%;
  padding: 0.3rem;
  background: #f8f9fa;
`;

const CryptoSymbol = styled.h6`
  font-weight: 600;
  margin-bottom: 0.6rem;
  color: #212529;
`;

const CryptoPrice = styled.p`
  font-size: 1.1rem;
  font-weight: 500;
  margin-bottom: 0.4rem;
  color: #495057;
`;

const PriceChange = styled.p`
  font-size: 0.95rem;
  font-weight: 500;
  margin: 0;
  color: ${props => props.$isPositive ? '#10b981' : '#ef4444'};
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.2rem;
`;

const AlertBadge = styled.div`
  position: absolute;
  top: -8px;
  right: -8px;
  width: 24px;
  height: 24px;
  background-color: #ef4444;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 600;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
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

const Dashboard = () => {
  const { marketData, alerts, isLoading } = useContext(CryptoContext);
  const [sortOption, setSortOption] = useState('rank');
  const navigate = useNavigate();

  const handleCryptoClick = (cryptoId) => {
    navigate(`/crypto/${cryptoId}`);
  };

  if (isLoading) {
    return (
      <LoadingContainer>
        <Spinner />
        <LoadingText>Загрузка данных рынка...</LoadingText>
      </LoadingContainer>
    );
  }

  // Сортировка данных
  const sortedData = [...marketData];
  
  switch (sortOption) {
    case 'priceChangeDesc':
      sortedData.sort((a, b) => b.price_change_percentage_24h - a.price_change_percentage_24h);
      break;
    case 'priceChangeAsc':
      sortedData.sort((a, b) => a.price_change_percentage_24h - b.price_change_percentage_24h);
      break;
    case 'volumeDesc':
      sortedData.sort((a, b) => b.total_volume - a.total_volume);
      break;
    default: // rank
      sortedData.sort((a, b) => a.market_cap_rank - b.market_cap_rank);
      break;
  }

  // Ограничиваем количество отображаемых криптовалют
  const displayData = sortedData.slice(0, 18);

  return (
    <DashboardContainer>
      <DashboardCard>
        <CardHeader>
          <CardTitle>Обзор рынка</CardTitle>
          <SortSelect 
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value)}
          >
            <option value="rank">По рейтингу</option>
            <option value="priceChangeDesc">Максимальный рост</option>
            <option value="priceChangeAsc">Максимальное падение</option>
            <option value="volumeDesc">Наибольший объем</option>
          </SortSelect>
        </CardHeader>
        <CardBody>
          <CryptoGrid>
            {displayData.map(crypto => {
              const priceChangeIsPositive = crypto.price_change_percentage_24h >= 0;
              const priceChangeIcon = priceChangeIsPositive ? '▲' : '▼';
              
              // Проверяем, есть ли оповещения для этой криптовалюты
              const cryptoAlerts = alerts.filter(alert => alert.crypto_id === crypto.id);
              const hasAlerts = cryptoAlerts.length > 0;
              
              return (
                <CryptoCard 
                  key={crypto.id} 
                  onClick={() => handleCryptoClick(crypto.id)}
                >
                  {hasAlerts && (
                    <AlertBadge>{cryptoAlerts.length}</AlertBadge>
                  )}
                  <CryptoLogo 
                    src={crypto.image} 
                    alt={crypto.name} 
                  />
                  <CryptoSymbol>{crypto.symbol.toUpperCase()}</CryptoSymbol>
                  <CryptoPrice>{formatCurrency(crypto.current_price)}</CryptoPrice>
                  <PriceChange $isPositive={priceChangeIsPositive}>
                    {priceChangeIcon} {formatPercentage(crypto.price_change_percentage_24h)}
                  </PriceChange>
                </CryptoCard>
              );
            })}
          </CryptoGrid>
        </CardBody>
      </DashboardCard>
    </DashboardContainer>
  );
};

export default Dashboard;