import React, { useState, useEffect, useContext } from 'react';
import styled from 'styled-components';
import { Line } from 'react-chartjs-2';
import { CryptoContext } from '../../context/CryptoContext';
import { fetchHistoricalData } from '../../services/api';
import { formatCurrency, formatPercentage } from '../../services/formatter';

// Стилизованные компоненты
const ComparisonContainer = styled.div`
  padding: 1.5rem;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  margin-bottom: 1.5rem;
`;

const Title = styled.h2`
  color: #1a1a2e;
  font-size: 1.5rem;
  margin-bottom: 1.5rem;
  font-weight: 600;
`;

const ControlPanel = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  margin-bottom: 1.5rem;
  align-items: center;
  
  @media (max-width: 768px) {
    flex-direction: column;
    align-items: stretch;
  }
`;

const SelectContainer = styled.div`
  flex: 1;
  min-width: 200px;
`;

const SelectLabel = styled.label`
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: #4b5563;
`;

const Select = styled.select`
  width: 100%;
  padding: 0.5rem 1rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.9rem;
  transition: all 0.2s;
  
  &:focus {
    border-color: #4361ee;
    outline: none;
    box-shadow: 0 0 0 3px rgba(67, 97, 238, 0.3);
  }
`;

const TimeframeSelector = styled.div`
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
`;

const TimeframeButton = styled.button`
  background: ${props => props.active ? '#4361ee' : 'white'};
  color: ${props => props.active ? 'white' : '#4361ee'};
  border: 1px solid #4361ee;
  border-radius: 6px;
  padding: 0.5rem 0.75rem;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    background: ${props => props.active ? '#3651d4' : '#f8fafc'};
  }
`;

const ChartContainer = styled.div`
  height: 400px;
  margin-bottom: 1.5rem;
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 1rem;
  margin-top: 1.5rem;
`;

const StatCard = styled.div`
  background: #f8fafc;
  border-radius: 8px;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  border-left: 3px solid ${props => props.color || '#4361ee'};
`;

const StatTitle = styled.h4`
  font-size: 0.9rem;
  color: #6b7280;
  margin: 0 0 0.5rem 0;
  font-weight: 500;
`;

const StatValue = styled.div`
  font-size: 1.1rem;
  font-weight: 600;
  color: #1a1a2e;
`;

const StatRow = styled.div`
  display: flex;
  justify-content: space-between;
  margin-top: 0.25rem;
  font-size: 0.85rem;
`;

const ChangeValue = styled.span`
  color: ${props => props.value >= 0 ? '#10b981' : '#ef4444'};
  font-weight: 500;
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  text-align: center;
  color: #6b7280;
`;

const LoadingIndicator = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
`;

const Spinner = styled.div`
  width: 40px;
  height: 40px;
  border: 3px solid rgba(67, 97, 238, 0.2);
  border-top-color: #4361ee;
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

// Константы
const TIMEFRAMES = {
  '7D': 7,
  '14D': 14, 
  '30D': 30,
  '90D': 90,
  '180D': 180,
  '1Y': 365
};

// Компонент сравнения криптовалют
const CryptoComparison = () => {
  const { marketData } = useContext(CryptoContext);
  
  const [selectedCryptos, setSelectedCryptos] = useState([]);
  const [availableCryptos, setAvailableCryptos] = useState([]);
  const [timeframe, setTimeframe] = useState('30D');
  const [chartData, setChartData] = useState(null);
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(false);
  const [normalizedView, setNormalizedView] = useState(true);
  
  // Цвета для графиков
  const chartColors = [
    { borderColor: 'rgba(67, 97, 238, 1)', backgroundColor: 'rgba(67, 97, 238, 0.1)' },
    { borderColor: 'rgba(234, 88, 12, 1)', backgroundColor: 'rgba(234, 88, 12, 0.1)' },
    { borderColor: 'rgba(16, 185, 129, 1)', backgroundColor: 'rgba(16, 185, 129, 0.1)' },
    { borderColor: 'rgba(139, 92, 246, 1)', backgroundColor: 'rgba(139, 92, 246, 0.1)' },
    { borderColor: 'rgba(245, 158, 11, 1)', backgroundColor: 'rgba(245, 158, 11, 0.1)' }
  ];
  
  // Инициализация доступных криптовалют
  useEffect(() => {
    if (marketData && marketData.length > 0) {
      setAvailableCryptos(marketData.slice(0, 50)); // Берем первые 50 криптовалют для выбора
    }
  }, [marketData]);
  
  // Добавление криптовалюты для сравнения
  const addCrypto = (e) => {
    const cryptoId = e.target.value;
    if (cryptoId && !selectedCryptos.find(c => c.id === cryptoId)) {
      const selected = availableCryptos.find(c => c.id === cryptoId);
      if (selected && selectedCryptos.length < 5) { // Ограничиваем до 5 криптовалют
        setSelectedCryptos([...selectedCryptos, selected]);
      }
    }
    e.target.value = '';
  };
  
  // Удаление криптовалюты из сравнения
  const removeCrypto = (cryptoId) => {
    setSelectedCryptos(selectedCryptos.filter(c => c.id !== cryptoId));
  };
  
  // Смена таймфрейма
  const changeTimeframe = (newTimeframe) => {
    setTimeframe(newTimeframe);
  };
  
  // Переключение между абсолютным и нормализованным видом
  const toggleNormalizedView = () => {
    setNormalizedView(!normalizedView);
  };
  
  // Получение исторических данных для выбранных криптовалют
  useEffect(() => {
    const fetchData = async () => {
      if (selectedCryptos.length === 0) {
        setChartData(null);
        setStats([]);
        return;
      }
      
      setLoading(true);
      
      try {
        const days = TIMEFRAMES[timeframe];
        
        // Получаем исторические данные для каждой выбранной криптовалюты
        const promises = selectedCryptos.map(crypto => 
          fetchHistoricalData(crypto.id, days)
        );
        
        const results = await Promise.all(promises);
        
        // Подготавливаем данные для графика
        const datasets = [];
        const cryptoStats = [];
        
        // Для нормализации нам нужно найти первую цену каждой криптовалюты
        const initialPrices = results.map(result => {
          if (result && result.prices && result.prices.length > 0) {
            return result.prices[0][1];
          }
          return null;
        });
        
        results.forEach((result, index) => {
          if (result && result.prices && result.prices.length > 0) {
            const crypto = selectedCryptos[index];
            const color = chartColors[index % chartColors.length];
            const initialValue = initialPrices[index];
            
            let data;
            if (normalizedView && initialValue) {
              // Нормализуем данные относительно начальной цены (в процентах)
              data = result.prices.map(item => ({
                x: new Date(item[0]),
                y: (item[1] / initialValue) * 100
              }));
            } else {
              data = result.prices.map(item => ({
                x: new Date(item[0]),
                y: item[1]
              }));
            }
            
            datasets.push({
              label: crypto.name,
              data: data,
              borderColor: color.borderColor,
              backgroundColor: color.backgroundColor,
              borderWidth: 2,
              pointRadius: 0,
              pointHoverRadius: 4,
              tension: 0.3
            });
            
            // Рассчитываем статистику
            const prices = result.prices.map(p => p[1]);
            const firstPrice = prices[0];
            const lastPrice = prices[prices.length - 1];
            const minPrice = Math.min(...prices);
            const maxPrice = Math.max(...prices);
            const percentChange = ((lastPrice - firstPrice) / firstPrice) * 100;
            
            // Рассчитываем волатильность как стандартное отклонение дневных изменений
            let volatility = 0;
            if (prices.length > 1) {
              const dailyReturns = [];
              for (let i = 1; i < prices.length; i++) {
                dailyReturns.push((prices[i] - prices[i-1]) / prices[i-1]);
              }
              
              const mean = dailyReturns.reduce((sum, val) => sum + val, 0) / dailyReturns.length;
              const squaredDiffs = dailyReturns.map(val => Math.pow(val - mean, 2));
              const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / squaredDiffs.length;
              volatility = Math.sqrt(variance) * 100; // В процентах
            }
            
            cryptoStats.push({
              id: crypto.id,
              name: crypto.name,
              symbol: crypto.symbol,
              color: color.borderColor,
              current: lastPrice,
              min: minPrice,
              max: maxPrice,
              change: percentChange,
              volatility: volatility
            });
          }
        });
        
        setChartData({
          datasets: datasets
        });
        
        setStats(cryptoStats);
      } catch (error) {
        console.error('Ошибка при получении исторических данных:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [selectedCryptos, timeframe, normalizedView]);
  
  // Настройки графика
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        type: 'time',
        time: {
          unit: timeframe === '7D' || timeframe === '14D' ? 'day' :
                timeframe === '30D' ? 'week' :
                timeframe === '90D' ? 'week' :
                'month',
          tooltipFormat: 'dd.MM.yyyy'
        },
        grid: {
          display: false
        },
        ticks: {
          font: {
            size: 10
          }
        }
      },
      y: {
        grid: {
          color: 'rgba(0, 0, 0, 0.05)'
        },
        title: {
          display: true,
          text: normalizedView ? 'Изменение в % от начальной цены' : 'Цена (USD)'
        },
        ticks: {
          callback: function(value) {
            if (normalizedView) {
              return `${value.toFixed(2)}%`;
            } else {
              return formatCurrency(value, 'compact');
            }
          }
        }
      }
    },
    plugins: {
      tooltip: {
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        titleColor: '#1a1a2e',
        bodyColor: '#1a1a2e',
        borderColor: 'rgba(0, 0, 0, 0.1)',
        borderWidth: 1,
        cornerRadius: 6,
        callbacks: {
          label: function(context) {
            const label = context.dataset.label || '';
            if (normalizedView) {
              return `${label}: ${context.parsed.y.toFixed(2)}%`;
            } else {
              return `${label}: ${formatCurrency(context.parsed.y)}`;
            }
          }
        }
      },
      legend: {
        position: 'top',
        labels: {
          boxWidth: 12,
          usePointStyle: true,
          pointStyle: 'circle'
        }
      }
    },
    interaction: {
      mode: 'index',
      intersect: false
    }
  };
  
  return (
    <ComparisonContainer>
      <Title>Сравнительный анализ криптовалют</Title>
      
      <ControlPanel>
        <SelectContainer>
          <SelectLabel>Добавить криптовалюту</SelectLabel>
          <Select onChange={addCrypto} defaultValue="">
            <option value="" disabled>Выберите криптовалюту</option>
            {availableCryptos.map(crypto => (
              <option 
                key={crypto.id} 
                value={crypto.id}
                disabled={selectedCryptos.some(c => c.id === crypto.id)}
              >
                {crypto.name} ({crypto.symbol.toUpperCase()})
              </option>
            ))}
          </Select>
        </SelectContainer>
        
        <TimeframeSelector>
          <SelectLabel>Период</SelectLabel>
          <div>
            {Object.keys(TIMEFRAMES).map(tf => (
              <TimeframeButton 
                key={tf}
                active={timeframe === tf}
                onClick={() => changeTimeframe(tf)}
              >
                {tf}
              </TimeframeButton>
            ))}
          </div>
        </TimeframeSelector>
        
        <TimeframeButton
          active={normalizedView}
          onClick={toggleNormalizedView}
        >
          {normalizedView ? 'Показать цены' : 'Нормализовать %'}
        </TimeframeButton>
      </ControlPanel>
      
      {selectedCryptos.length > 0 ? (
        <div>
          <div style={{ marginBottom: '1rem' }}>
            Выбранные криптовалюты:
            {selectedCryptos.map(crypto => (
              <TimeframeButton 
                key={crypto.id}
                onClick={() => removeCrypto(crypto.id)}
                style={{ marginLeft: '0.5rem' }}
              >
                {crypto.symbol.toUpperCase()} ✕
              </TimeframeButton>
            ))}
          </div>
          
          {loading ? (
            <LoadingIndicator>
              <Spinner />
              <SpinnerText>Загрузка данных...</SpinnerText>
            </LoadingIndicator>
          ) : chartData && chartData.datasets.length > 0 ? (
            <>
              <ChartContainer>
                <Line data={chartData} options={chartOptions} />
              </ChartContainer>
              
              <StatsGrid>
                {stats.map(stat => (
                  <StatCard key={stat.id} color={stat.color}>
                    <StatTitle>{stat.name} ({stat.symbol.toUpperCase()})</StatTitle>
                    
                    <StatRow>
                      <span>Текущая цена:</span>
                      <StatValue>{formatCurrency(stat.current)}</StatValue>
                    </StatRow>
                    
                    <StatRow>
                      <span>Изменение за период:</span>
                      <ChangeValue value={stat.change}>
                        {stat.change >= 0 ? '▲' : '▼'} {formatPercentage(Math.abs(stat.change))}
                      </ChangeValue>
                    </StatRow>
                    
                    <StatRow>
                      <span>Мин./Макс. цена:</span>
                      <span>{formatCurrency(stat.min)} / {formatCurrency(stat.max)}</span>
                    </StatRow>
                    
                    <StatRow>
                      <span>Волатильность:</span>
                      <span>{stat.volatility.toFixed(2)}%</span>
                    </StatRow>
                  </StatCard>
                ))}
              </StatsGrid>
            </>
          ) : (
            <EmptyState>
              Данные не доступны. Попробуйте другие криптовалюты или период.
            </EmptyState>
          )}
        </div>
      ) : (
        <EmptyState>
          Выберите минимум одну криптовалюту для анализа
        </EmptyState>
      )}
    </ComparisonContainer>
  );
};

export default CryptoComparison;
