import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { Line } from 'react-chartjs-2';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  PointElement, 
  LineElement, 
  Title, 
  Tooltip, 
  Legend,
  TimeScale
} from 'chart.js';
import 'chartjs-adapter-date-fns';

import { sendRequest } from '../../services/websocket';
import { fetchCryptoDetail, fetchHistoricalData, fetchTechnicalIndicators } from '../../services/api';
import { formatCurrency, formatPercentage, formatLargeNumber } from '../../services/formatter';
import PricePrediction from '../PricePrediction/PricePrediction';

// Стилизованные компоненты
const PageContainer = styled.div`
  padding: 1.5rem;
  max-width: 1200px;
  margin: 0 auto;
`;

const HeaderSection = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  
  @media (max-width: 768px) {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }
`;

const CryptoTitle = styled.h2`
  display: flex;
  align-items: center;
  font-weight: 600;
  color: #1a1a2e;
  font-size: 1.8rem;
  margin: 0;
`;

const CryptoIcon = styled.img`
  height: 40px;
  width: 40px;
  margin-right: 12px;
  border-radius: 50%;
  object-fit: contain;
`;

const BackButton = styled.button`
  background-color: transparent;
  color: #4361ee;
  border: 1px solid #4361ee;
  border-radius: 8px;
  padding: 0.5rem 1rem;
  font-weight: 500;
  transition: all 0.2s ease;
  cursor: pointer;
  
  &:hover {
    background-color: #4361ee;
    color: white;
  }
`;

const ContentRow = styled.div`
  display: flex;
  gap: 1.5rem;
  
  @media (max-width: 992px) {
    flex-direction: column;
  }
`;

const ChartSection = styled.div`
  flex: 2;
`;

const SidebarSection = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const Card = styled.div`
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  overflow: hidden;
`;

const CardHeader = styled.div`
  background-color: #f8f9fa;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid #e9ecef;
`;

const CardTitle = styled.h5`
  margin: 0;
  font-weight: 600;
  color: #1a1a2e;
`;

const CardBody = styled.div`
  padding: 1.5rem;
`;

const PriceDisplay = styled.div`
  margin-bottom: 1.5rem;
`;

const CurrentPrice = styled.h3`
  font-size: 1.8rem;
  font-weight: 600;
  color: #1a1a2e;
  margin-bottom: 0.5rem;
`;

const PriceChange = styled.p`
  font-weight: 500;
  color: ${props => props.isPositive ? '#10b981' : '#ef4444'};
  display: flex;
  align-items: center;
  gap: 4px;
`;

const StatsList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
`;

const StatsItem = styled.li`
  display: flex;
  justify-content: space-between;
  padding: 1rem 0;
  border-bottom: 1px solid #e9ecef;
  
  &:last-child {
    border-bottom: none;
  }
`;

const StatLabel = styled.span`
  color: #6b7280;
`;

const StatValue = styled.span`
  font-weight: 500;
  color: #1a1a2e;
`;

const SignalSection = styled.div`
  text-align: center;
  margin-bottom: 1.5rem;
`;

const SignalText = styled.h4`
  margin: 0 0 0.5rem;
  font-weight: 700;
  color: ${props => {
    switch (props.$signal) {
      case 'buy': return '#10b981';
      case 'sell': return '#ef4444';
      default: return '#6b7280';
    }
  }};
`;

const SignalNote = styled.p`
  color: #6b7280;
  font-size: 0.875rem;
  margin: 0;
`;

const IndicatorItem = styled.div`
  margin-bottom: 1rem;
  
  &:last-child {
    margin-bottom: 0;
  }
`;

const IndicatorName = styled.strong`
  color: #1a1a2e;
`;

const IndicatorValue = styled.span`
  color: ${props => {
    switch (props.type) {
      case 'good': return '#10b981';
      case 'bad': return '#ef4444';
      case 'neutral': return '#6b7280';
      default: return '#1a1a2e';
    }
  }};
  font-weight: ${props => props.$bold ? '600' : '400'};
  margin-left: 4px;
`;

const EmptyStateMessage = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  text-align: center;
  color: #6b7280;
  
  & button {
    margin-top: 1rem;
  }
`;

const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
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

const SpinnerText = styled.p`
  margin-top: 1rem;
  color: #6b7280;
`;

// Регистрируем необходимые компоненты Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
);

const CryptoDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [crypto, setCrypto] = useState(null);
  const [historicalData, setHistoricalData] = useState(null);
  const [indicators, setIndicators] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        // Получаем детальную информацию о криптовалюте
        const cryptoData = await fetchCryptoDetail(id);
        setCrypto(cryptoData);
        
        // Получаем исторические данные
        const histData = await fetchHistoricalData(id, 14);
        console.log('Полученные исторические данные:', histData); // отладочная информация
        
        // Проверяем наличие данных и устанавливаем их даже если массив пустой
        // (бэкенд всегда вернет структуру с минимум пустыми массивами)
        if (histData && Array.isArray(histData.prices)) {
          setHistoricalData(histData);
        } else {
          console.warn('Исторические данные в неверном формате, создаем пустую структуру');
          // Создаем пустую структуру, если API вернуло неожиданный формат
          setHistoricalData({
            prices: [],
            market_caps: [],
            total_volumes: []
          });
        }
        
        // Получаем технические индикаторы
        const indicatorsData = await fetchTechnicalIndicators(id);
        setIndicators(indicatorsData);
        
        // Также запрашиваем данные через WebSocket
        sendRequest('getHistoricalData', { cryptoId: id, days: 14 });
        sendRequest('getTechnicalIndicators', { cryptoId: id });
        
        setLoading(false);
      } catch (err) {
        console.error('Error loading crypto details:', err);
        setError('Не удалось загрузить данные о криптовалюте');
        setLoading(false);
      }
    };
    
    loadData();
  }, [id]);

  // Обработчик возврата на дашборд
  const handleBack = () => {
    navigate('/');
  };

  if (loading) {
    return (
      <LoadingContainer>
        <Spinner />
        <SpinnerText>Загрузка данных о криптовалюте...</SpinnerText>
      </LoadingContainer>
    );
  }

  if (error) {
    return (
      <EmptyStateMessage>
        <div>{error}</div>
        <BackButton onClick={handleBack}>
          Вернуться на главную
        </BackButton>
      </EmptyStateMessage>
    );
  }

  if (!crypto) {
    return (
      <EmptyStateMessage>
        <div>Криптовалюта не найдена</div>
        <BackButton onClick={handleBack}>
          Вернуться на главную
        </BackButton>
      </EmptyStateMessage>
    );
  }

  // Подготовка данных для графика
  const chartData = {
    labels: [],
    datasets: [
      {
        label: 'Цена (USD)',
        data: [],
        borderColor: '#3861FB',
        backgroundColor: 'rgba(56, 97, 251, 0.1)',
        fill: true,
        tension: 0.4
      }
    ]
  };

  // Заполняем данные графика, если они доступны
  if (historicalData && Array.isArray(historicalData.prices)) {
    try {
      // Фильтруем точки, чтобы уменьшить количество данных
      const prices = historicalData.prices;
      const step = Math.max(1, Math.floor(prices.length / 50)); // Максимум 50 точек
      
      if (prices.length > 0) {
        const filteredPrices = prices.filter((_, index) => index % step === 0);
        
        chartData.labels = filteredPrices.map(price => new Date(price[0]));
        chartData.datasets[0].data = filteredPrices.map(price => price[1]);
      } else {
        console.info('Массив цен пуст, отображаем пустой график');
        // Создаем пустой график с последней неделей дат
        const today = new Date();
        for (let i = 6; i >= 0; i--) {
          const date = new Date();
          date.setDate(today.getDate() - i);
          chartData.labels.push(date);
          chartData.datasets[0].data.push(null); // null значения не будут отрисованы
        }
      }
    } catch (error) {
      console.error('Ошибка при подготовке данных графика:', error);
    }
  } else {
    console.warn('Исторические данные отсутствуют или в неверном формате для графика, создаем пустой график');
    // Создаем пустой график с последней неделей дат
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(today.getDate() - i);
      chartData.labels.push(date);
      chartData.datasets[0].data.push(null); // null значения не будут отрисованы
    }
  }

  // Опции для графика
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        type: 'time',
        time: {
          unit: 'day',
          tooltipFormat: 'dd.MM.yyyy'
        },
        grid: {
          display: false
        }
      },
      y: {
        grid: {
          color: 'rgba(0, 0, 0, 0.05)'
        }
      }
    },
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: `История цены ${crypto.name}`,
        font: {
          size: 16
        }
      },
      tooltip: {
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        titleColor: '#1a1a2e',
        bodyColor: '#1a1a2e',
        borderColor: 'rgba(0, 0, 0, 0.1)',
        borderWidth: 1,
        cornerRadius: 6,
        displayColors: false,
        callbacks: {
          label: function(context) {
            return `Цена: ${formatCurrency(context.parsed.y)}`;
          }
        }
      }
    }
  };

  // Интерпретация индикаторов
  let signalType = 'neutral';
  let signalText = 'НЕЙТРАЛЬНО';
  
  if (indicators && indicators.interpretation && indicators.interpretation.overall && indicators.interpretation.overall.signal) {
    if (indicators.interpretation.overall.signal === 'buy') {
      signalType = 'buy';
      signalText = 'ПОКУПАТЬ';
    } else if (indicators.interpretation.overall.signal === 'sell') {
      signalType = 'sell';
      signalText = 'ПРОДАВАТЬ';
    }
  }

  return (
    <PageContainer>
      <HeaderSection>
        <CryptoTitle>
          <CryptoIcon 
            src={crypto.image} 
            alt={crypto.name} 
          />
          {crypto.name} ({crypto.symbol.toUpperCase()})
        </CryptoTitle>
        <BackButton onClick={handleBack}>
          Вернуться на главную
        </BackButton>
      </HeaderSection>

      <ContentRow>
        <ChartSection>
          <Card>
            <CardHeader>
              <CardTitle>График цены</CardTitle>
            </CardHeader>
            <CardBody style={{ height: '400px' }}>
              {historicalData ? (
                <Line data={chartData} options={chartOptions} />
              ) : (
                <EmptyStateMessage>
                  <div>Исторические данные недоступны</div>
                </EmptyStateMessage>
              )}
            </CardBody>
          </Card>
        </ChartSection>

        <SidebarSection>
          <Card>
            <CardHeader>
              <CardTitle>Рыночные данные</CardTitle>
            </CardHeader>
            <CardBody>
              <PriceDisplay>
                <CurrentPrice>{formatCurrency(crypto.current_price)}</CurrentPrice>
                <PriceChange isPositive={crypto.price_change_percentage_24h >= 0}>
                  {crypto.price_change_percentage_24h >= 0 ? '▲' : '▼'} 
                  {formatPercentage(crypto.price_change_percentage_24h)} (24ч)
                </PriceChange>
              </PriceDisplay>

              <StatsList>
                <StatsItem>
                  <StatLabel>Рыночная капитализация:</StatLabel>
                  <StatValue>{formatLargeNumber(crypto.market_cap)}</StatValue>
                </StatsItem>
                <StatsItem>
                  <StatLabel>Объем (24ч):</StatLabel>
                  <StatValue>{formatLargeNumber(crypto.total_volume)}</StatValue>
                </StatsItem>
                <StatsItem>
                  <StatLabel>Место на рынке:</StatLabel>
                  <StatValue>#{crypto.market_cap_rank}</StatValue>
                </StatsItem>
                <StatsItem>
                  <StatLabel>В обращении:</StatLabel>
                  <StatValue>{crypto.circulating_supply ? crypto.circulating_supply.toLocaleString() : 'Н/Д'}</StatValue>
                </StatsItem>
              </StatsList>
            </CardBody>
          </Card>

          {indicators && (
            <Card>
              <CardHeader>
                <CardTitle>Технические индикаторы</CardTitle>
              </CardHeader>
              <CardBody>
                <SignalSection>
                  <SignalText $signal={indicators.interpretation?.overall?.signal || 'neutral'}>
                    СИГНАЛ: {signalText}
                  </SignalText>
                  <SignalNote>На основе анализа множества индикаторов</SignalNote>
                </SignalSection>
                
                {indicators.indicators && indicators.indicators.rsi && (
                  <IndicatorItem>
                    <IndicatorName>RSI (14):</IndicatorName>
                    <IndicatorValue 
                      type={
                        indicators.indicators.rsi.value >= 70 ? 'bad' : 
                        indicators.indicators.rsi.value <= 30 ? 'good' : 
                        'neutral'
                      }
                      $bold
                    >
                      {indicators.indicators.rsi.value ? indicators.indicators.rsi.value.toFixed(2) : 'Н/Д'}
                    </IndicatorValue>
                  </IndicatorItem>
                )}
                
                {indicators.interpretation && indicators.interpretation.sma && (
                  <IndicatorItem>
                    <IndicatorName>Тренд SMA:</IndicatorName>
                    <IndicatorValue 
                      type={
                        indicators.interpretation.sma.crossover === 'bullish' ? 'good' : 
                        indicators.interpretation.sma.crossover === 'bearish' ? 'bad' : 
                        'neutral'
                      }
                      $bold
                      className={
                        indicators.interpretation.sma.crossover === 'bullish' ? 'text-success' :
                        indicators.interpretation.sma.crossover === 'bearish' ? 'text-danger' : 
                        'text-secondary'
                      }
                    >
                      {indicators.interpretation.sma.crossover === 'bullish' ? 'Бычий' : 
                       indicators.interpretation.sma.crossover === 'bearish' ? 'Медвежий' : 
                       'Нейтральный'}
                    </IndicatorValue>
                  </IndicatorItem>
                )}
                
                {indicators.interpretation && indicators.interpretation.macd && (
                  <IndicatorItem>
                    <IndicatorName>Сигнал MACD:</IndicatorName>
                    <IndicatorValue 
                      type={
                        indicators.interpretation.macd.signal === 'buy' ? 'good' : 
                        indicators.interpretation.macd.signal === 'sell' ? 'bad' : 
                        'neutral'
                      }
                      $bold
                      className={
                        indicators.interpretation.macd.signal === 'buy' ? 'text-success' : 
                        indicators.interpretation.macd.signal === 'sell' ? 'text-danger' : 
                        'text-secondary'
                      }
                    >
                      {indicators.interpretation.macd.signal === 'buy' ? 'Покупать' : 
                       indicators.interpretation.macd.signal === 'sell' ? 'Продавать' : 
                       'Нейтральный'}
                    </IndicatorValue>
                  </IndicatorItem>
                )}
              </CardBody>
            </Card>
          )}
        </SidebarSection>
      </ContentRow>

      {/* Компонент прогнозирования цен с ML */}
      <ContentRow>
        <ChartSection>
          <PricePrediction 
            cryptoId={crypto.id} 
            cryptoName={crypto.name} 
            currentPrice={crypto.current_price}
          />
        </ChartSection>
      </ContentRow>
    </PageContainer>
  );
};

export default CryptoDetail;