import React, { useState, useEffect } from 'react';
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
import { ru } from 'date-fns/locale';

import { fetchHistoricalData } from '../../services/api';
import { CHART_TIMEFRAMES, CHART_COLORS } from '../../utils/constants';
import { formatCurrency } from '../../services/formatter';

// Стилизованные компоненты
const ChartCard = styled.div`
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  overflow: hidden;
  margin-bottom: 1.5rem;
`;

const CardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  background-color: #f8f9fa;
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

const ChartContainer = styled.div`
  height: 350px;
  position: relative;
`;

const TimeframeSelector = styled.select`
  padding: 0.375rem 2rem 0.375rem 0.75rem;
  font-size: 0.875rem;
  font-weight: 400;
  line-height: 1.5;
  color: #1a1a2e;
  background-color: #fff;
  border: 1px solid #ced4da;
  border-radius: 0.25rem;
  appearance: none;
  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='none' stroke='%23343a40' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M2 5l6 6 6-6'/%3e%3c/svg%3e");
  background-repeat: no-repeat;
  background-position: right 0.75rem center;
  background-size: 16px 12px;
  transition: border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;
  
  &:focus {
    border-color: #4361ee;
    outline: 0;
    box-shadow: 0 0 0 0.2rem rgba(67, 97, 238, 0.25);
  }
`;

const StatsRow = styled.div`
  display: flex;
  gap: 1rem;
  margin-top: 1.5rem;
  
  @media (max-width: 768px) {
    flex-direction: column;
  }
`;

const StatCard = styled.div`
  flex: 1;
  background: #f8fafc;
  border-radius: 8px;
  padding: 1rem;
  text-align: center;
  border: 1px solid #e9ecef;
`;

const StatTitle = styled.h6`
  margin: 0 0 0.5rem 0;
  font-size: 0.875rem;
  color: #6b7280;
  font-weight: 500;
`;

const StatValue = styled.p`
  margin: 0;
  font-weight: 600;
  font-size: 1.1rem;
  color: ${props => {
    if (props.type === 'change') {
      return props.isPositive ? '#10b981' : '#ef4444';
    }
    return '#1a1a2e';
  }};
`;

const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
`;

const Spinner = styled.div`
  width: 40px;
  height: 40px;
  border: 3px solid rgba(76, 201, 240, 0.2);
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

const ErrorMessage = styled.div`
  padding: 1rem;
  background-color: #fef2f2;
  color: #b91c1c;
  border-radius: 8px;
  font-size: 0.9rem;
`;

const EmptyMessage = styled.p`
  text-align: center;
  padding: 2rem;
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

const PriceHistory = ({ cryptoId, cryptoName, cryptoSymbol }) => {
  const [historicalData, setHistoricalData] = useState(null);
  const [timeframe, setTimeframe] = useState(CHART_TIMEFRAMES.ONE_WEEK);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadHistoricalData = async () => {
      if (!cryptoId) return;
      
      setLoading(true);
      try {
        // Конвертируем значение таймфрейма в количество дней
        let days = 7;
        
        switch (timeframe) {
          case CHART_TIMEFRAMES.ONE_DAY:
            days = 1;
            break;
          case CHART_TIMEFRAMES.ONE_MONTH:
            days = 30;
            break;
          case CHART_TIMEFRAMES.THREE_MONTHS:
            days = 90;
            break;
          case CHART_TIMEFRAMES.ONE_YEAR:
            days = 365;
            break;
          case CHART_TIMEFRAMES.MAX:
            days = 'max';
            break;
          default: // ONE_WEEK
            days = 7;
            break;
        }
        
        const data = await fetchHistoricalData(cryptoId, days);
        setHistoricalData(data);
        setLoading(false);
      } catch (err) {
        console.error('Error loading historical data:', err);
        setError('Не удалось загрузить историю цены');
        setLoading(false);
      }
    };
    
    loadHistoricalData();
  }, [cryptoId, timeframe]);

  const handleTimeframeChange = (e) => {
    setTimeframe(e.target.value);
  };

  // Подготавливаем данные для графика
  const prepareChartData = () => {
    if (!historicalData || !historicalData.prices || historicalData.prices.length === 0) {
      return {
        datasets: []
      };
    }
    
    const prices = historicalData.prices.map(item => ({
      x: new Date(item[0]),
      y: item[1]
    }));
    
    return {
      datasets: [
        {
          label: `Цена ${cryptoName || ''} (USD)`,
          data: prices,
          borderColor: '#4361ee',
          backgroundColor: 'rgba(67, 97, 238, 0.1)',
          borderWidth: 2,
          tension: 0.3,
          pointRadius: timeframe === CHART_TIMEFRAMES.ONE_DAY ? 2 : 0,
          pointHoverRadius: 4
        }
      ]
    };
  };

  // Настройки для графика
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        type: 'time',
        time: {
          unit: timeframe === CHART_TIMEFRAMES.ONE_DAY ? 'hour' : 
                timeframe === CHART_TIMEFRAMES.ONE_WEEK ? 'day' : 
                timeframe === CHART_TIMEFRAMES.ONE_MONTH ? 'day' : 
                timeframe === CHART_TIMEFRAMES.THREE_MONTHS ? 'week' : 
                'month',
          tooltipFormat: 'dd.MM.yyyy HH:mm',
          displayFormats: {
            hour: 'HH:mm',
            day: 'dd.MM',
            week: 'dd.MM',
            month: 'MM.yyyy'
          }
        },
        adapters: {
          date: {
            locale: ru
          }
        },
        grid: {
          display: false
        }
      },
      y: {
        title: {
          display: true,
          text: 'Цена (USD)'
        },
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
        text: `История цены ${cryptoName || ''} ${cryptoSymbol ? `(${cryptoSymbol.toUpperCase()})` : ''}`,
        font: {
          size: 16,
          weight: 'normal'
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
            let label = `Цена: ${formatCurrency(context.parsed.y)}`;
            return label;
          }
        }
      }
    }
  };

  // Получаем дополнительную статистику
  const getStatistics = () => {
    if (!historicalData || !historicalData.prices || historicalData.prices.length === 0) {
      return null;
    }
    
    const prices = historicalData.prices.map(p => p[1]);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const firstPrice = historicalData.prices[0][1];
    const lastPrice = historicalData.prices[historicalData.prices.length - 1][1];
    const change = ((lastPrice - firstPrice) / firstPrice) * 100;
    
    return {
      min: minPrice,
      max: maxPrice,
      change: change,
      isPositive: change >= 0
    };
  };

  // Получаем текст для выбранного периода
  const getTimeframeText = () => {
    switch (timeframe) {
      case CHART_TIMEFRAMES.ONE_DAY:
        return '24 часа';
      case CHART_TIMEFRAMES.ONE_WEEK:
        return '7 дней';
      case CHART_TIMEFRAMES.ONE_MONTH:
        return '30 дней';
      case CHART_TIMEFRAMES.THREE_MONTHS:
        return '90 дней';
      case CHART_TIMEFRAMES.ONE_YEAR:
        return '1 год';
      case CHART_TIMEFRAMES.MAX:
        return 'Максимум';
      default:
        return '7 дней';
    }
  };

  if (loading) {
    return (
      <ChartCard>
        <CardHeader>
          <CardTitle>История цены</CardTitle>
          <TimeframeSelector 
            value={timeframe}
            onChange={handleTimeframeChange}
            disabled
          >
            <option value={CHART_TIMEFRAMES.ONE_DAY}>24 часа</option>
            <option value={CHART_TIMEFRAMES.ONE_WEEK}>7 дней</option>
            <option value={CHART_TIMEFRAMES.ONE_MONTH}>30 дней</option>
            <option value={CHART_TIMEFRAMES.THREE_MONTHS}>90 дней</option>
            <option value={CHART_TIMEFRAMES.ONE_YEAR}>1 год</option>
            <option value={CHART_TIMEFRAMES.MAX}>Максимум</option>
          </TimeframeSelector>
        </CardHeader>
        <CardBody>
          <LoadingContainer>
            <Spinner />
            <SpinnerText>Загрузка данных о ценах...</SpinnerText>
          </LoadingContainer>
        </CardBody>
      </ChartCard>
    );
  }

  if (error) {
    return (
      <ChartCard>
        <CardHeader>
          <CardTitle>История цены</CardTitle>
        </CardHeader>
        <CardBody>
          <ErrorMessage>{error}</ErrorMessage>
        </CardBody>
      </ChartCard>
    );
  }

  if (!historicalData || !historicalData.prices || historicalData.prices.length === 0) {
    return (
      <ChartCard>
        <CardHeader>
          <CardTitle>История цены</CardTitle>
        </CardHeader>
        <CardBody>
          <EmptyMessage>Исторические данные недоступны</EmptyMessage>
        </CardBody>
      </ChartCard>
    );
  }

  const stats = getStatistics();

  return (
    <ChartCard>
      <CardHeader>
        <CardTitle>История цены ({getTimeframeText()})</CardTitle>
        <TimeframeSelector 
          value={timeframe}
          onChange={handleTimeframeChange}
        >
          <option value={CHART_TIMEFRAMES.ONE_DAY}>24 часа</option>
          <option value={CHART_TIMEFRAMES.ONE_WEEK}>7 дней</option>
          <option value={CHART_TIMEFRAMES.ONE_MONTH}>30 дней</option>
          <option value={CHART_TIMEFRAMES.THREE_MONTHS}>90 дней</option>
          <option value={CHART_TIMEFRAMES.ONE_YEAR}>1 год</option>
          <option value={CHART_TIMEFRAMES.MAX}>Максимум</option>
        </TimeframeSelector>
      </CardHeader>
      <CardBody>
        <ChartContainer>
          <Line data={prepareChartData()} options={chartOptions} />
        </ChartContainer>

        {stats && (
          <StatsRow>
            <StatCard>
              <StatTitle>Минимальная цена</StatTitle>
              <StatValue>{formatCurrency(stats.min)}</StatValue>
            </StatCard>
            
            <StatCard>
              <StatTitle>Максимальная цена</StatTitle>
              <StatValue>{formatCurrency(stats.max)}</StatValue>
            </StatCard>
            
            <StatCard>
              <StatTitle>Изменение цены</StatTitle>
              <StatValue type="change" isPositive={stats.isPositive}>
                {stats.isPositive ? '▲' : '▼'} {Math.abs(stats.change).toFixed(2)}%
              </StatValue>
            </StatCard>
          </StatsRow>
        )}
      </CardBody>
    </ChartCard>
  );
};

export default PriceHistory;