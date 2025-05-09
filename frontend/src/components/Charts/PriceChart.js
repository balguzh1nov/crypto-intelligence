import React, { useState, useEffect, useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import styled from 'styled-components';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  PointElement, 
  LineElement, 
  Title, 
  Tooltip, 
  Legend,
  TimeScale,
  Filler
} from 'chart.js';
import 'chartjs-adapter-date-fns';
import { ru } from 'date-fns/locale';
import { CHART_COLORS, CHART_TIMEFRAMES } from '../../utils/constants';
import { formatCurrency } from '../../services/formatter';

// Регистрируем необходимые компоненты Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
  Filler
);

// Стилизованные компоненты
const ChartContainer = styled.div`
  width: 100%;
  position: relative;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  border-radius: 12px;
  background: #ffffff;
  padding: 20px;
  margin-bottom: 24px;
`;

const ChartHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
`;

const ChartTitle = styled.h4`
  margin: 0;
  font-weight: 600;
  color: #1a1a2e;
  font-size: 1.1rem;
`;

const TimeframeSelector = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
`;

const TimeframeButton = styled.button`
  padding: 6px 12px;
  border-radius: 20px;
  border: 1px solid ${props => props.active ? '#4cc9f0' : '#e9ecef'};
  background: ${props => props.active ? 'rgba(76, 201, 240, 0.1)' : '#fff'};
  color: ${props => props.active ? '#4cc9f0' : '#6c757d'};
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: ${props => props.active ? 'rgba(76, 201, 240, 0.15)' : '#f8f9fa'};
  }
  
  &:focus {
    outline: none;
    box-shadow: 0 0 0 2px rgba(76, 201, 240, 0.25);
  }
`;

const ChartCanvas = styled.div`
  height: 350px;
  width: 100%;
  position: relative;
`;

const LoadingOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.8);
  z-index: 10;
  border-radius: 12px;
`;

const Spinner = styled.div`
  width: 40px;
  height: 40px;
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
  margin-top: 12px;
  font-size: 0.9rem;
  color: #6c757d;
`;

/**
 * Компонент для отображения графика цены криптовалюты
 * @param {Object} props - Свойства компонента
 * @param {Array} props.priceData - Данные о ценах
 * @param {string} props.cryptoName - Название криптовалюты
 * @param {string} props.cryptoSymbol - Символ криптовалюты
 * @param {boolean} props.showVolume - Флаг для отображения объема торгов
 * @param {string} props.defaultTimeframe - Таймфрейм по умолчанию
 * @param {boolean} props.allowTimeframeChange - Флаг, разрешающий изменение таймфрейма
 * @param {Function} props.onTimeframeChange - Callback при изменении таймфрейма
 * @param {boolean} props.isLoading - Флаг загрузки данных
 */
const PriceChart = ({ 
  priceData = [], 
  cryptoName = 'Криптовалюта', 
  cryptoSymbol = '', 
  showVolume = false,
  defaultTimeframe = CHART_TIMEFRAMES.ONE_WEEK,
  allowTimeframeChange = true,
  onTimeframeChange = null,
  isLoading = false
}) => {
  const [timeframe, setTimeframe] = useState(defaultTimeframe);

  useEffect(() => {
    if (onTimeframeChange) {
      onTimeframeChange(timeframe);
    }
  }, [timeframe, onTimeframeChange]);

  const handleTimeframeChange = (newTimeframe) => {
    setTimeframe(newTimeframe);
  };

  // Форматирование текстов для временных промежутков
  const timeframeLabels = {
    [CHART_TIMEFRAMES.ONE_DAY]: '24 часа',
    [CHART_TIMEFRAMES.ONE_WEEK]: '7 дней',
    [CHART_TIMEFRAMES.ONE_MONTH]: '30 дней',
    [CHART_TIMEFRAMES.THREE_MONTHS]: '3 месяца',
    [CHART_TIMEFRAMES.ONE_YEAR]: '1 год',
    [CHART_TIMEFRAMES.MAX]: 'Макс.'
  };

  // Преобразуем данные для отображения на графике
  const chartData = useMemo(() => {
    if (!priceData || !priceData.length) {
      return {
        datasets: []
      };
    }

    const datasets = [];
    
    // Данные цены
    const pricePoints = priceData.map(item => ({
      x: new Date(item[0]),
      y: item[1]
    }));

    datasets.push({
      label: `${cryptoName} ${cryptoSymbol ? `(${cryptoSymbol.toUpperCase()})` : ''} Цена`,
      data: pricePoints,
      borderColor: CHART_COLORS.PRIMARY,
      backgroundColor: 'rgba(76, 201, 240, 0.1)',
      borderWidth: 2,
      tension: 0.4,
      pointRadius: timeframe === CHART_TIMEFRAMES.ONE_DAY ? 2 : 0,
      pointHoverRadius: 5,
      yAxisID: 'y',
      fill: true
    });

    // Данные объема (если они предоставлены и нужно отображать)
    if (showVolume && priceData[0] && priceData[0].length > 2) {
      const volumePoints = priceData.map(item => ({
        x: new Date(item[0]),
        y: item[2] || 0
      }));

      datasets.push({
        label: 'Объем торгов',
        data: volumePoints,
        borderColor: CHART_COLORS.SECONDARY,
        backgroundColor: 'rgba(100, 116, 139, 0.2)',
        borderWidth: 1,
        tension: 0,
        pointRadius: 0,
        type: 'bar',
        yAxisID: 'y1'
      });
    }

    return {
      datasets
    };
  }, [priceData, cryptoName, cryptoSymbol, showVolume, timeframe]);

  // Опции для графика
  const chartOptions = useMemo(() => {
    return {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false
      },
      elements: {
        line: {
          borderJoinStyle: 'round'
        }
      },
      scales: {
        x: {
          type: 'time',
          time: {
            unit: timeframe === CHART_TIMEFRAMES.ONE_DAY ? 'hour' : 
                  timeframe === CHART_TIMEFRAMES.ONE_WEEK ? 'day' : 
                  timeframe === CHART_TIMEFRAMES.ONE_MONTH ? 'day' : 
                  timeframe === CHART_TIMEFRAMES.THREE_MONTHS ? 'week' : 
                  'month',
            displayFormats: {
              hour: 'HH:mm',
              day: 'd MMM',
              week: 'd MMM',
              month: 'MMM yyyy'
            },
            tooltipFormat: timeframe === CHART_TIMEFRAMES.ONE_DAY ? 'd MMM, HH:mm' : 'd MMM yyyy',
            adapters: {
              date: {
                locale: ru
              }
            }
          },
          grid: {
            display: false,
            drawBorder: false
          },
          ticks: {
            color: '#64748b'
          },
          title: {
            display: true,
            text: 'Дата/Время',
            color: '#64748b'
          }
        },
        y: {
          type: 'linear',
          display: true,
          position: 'left',
          title: {
            display: true,
            text: 'Цена (USD)',
            color: '#64748b'
          },
          ticks: {
            color: '#64748b',
            callback: function(value) {
              return formatCurrency(value, 'ru-RU', 'USD');
            }
          },
          grid: {
            color: 'rgba(100, 116, 139, 0.1)'
          }
        },
        ...(showVolume ? {
          y1: {
            type: 'linear',
            display: true,
            position: 'right',
            title: {
              display: true,
              text: 'Объем торгов',
              color: '#64748b'
            },
            ticks: {
              color: '#64748b'
            },
            grid: {
              drawOnChartArea: false
            }
          }
        } : {})
      },
      plugins: {
        legend: {
          position: 'top',
          labels: {
            color: '#334155',
            usePointStyle: true,
            padding: 20,
            font: {
              size: 12
            }
          }
        },
        title: {
          display: false
        },
        tooltip: {
          enabled: true,
          mode: 'index',
          intersect: false,
          backgroundColor: 'rgba(30, 41, 59, 0.8)',
          titleColor: '#fff',
          bodyColor: '#f8fafc',
          padding: 12,
          cornerRadius: 8,
          callbacks: {
            label: function(context) {
              let label = context.dataset.label || '';
              if (label) {
                label += ': ';
              }
              if (context.parsed.y !== null) {
                if (context.dataset.yAxisID === 'y') {
                  label += formatCurrency(context.parsed.y, 'ru-RU', 'USD');
                } else {
                  label += new Intl.NumberFormat('ru-RU').format(context.parsed.y);
                }
              }
              return label;
            }
          }
        }
      }
    };
  }, [timeframe, cryptoName, cryptoSymbol, showVolume]);

  return (
    <ChartContainer>
      <ChartHeader>
        <ChartTitle>{`${cryptoName} ${cryptoSymbol ? `(${cryptoSymbol.toUpperCase()})` : ''}`}</ChartTitle>
        
        {allowTimeframeChange && (
          <TimeframeSelector>
            {Object.entries(timeframeLabels).map(([key, label]) => (
              <TimeframeButton 
                key={key}
                active={timeframe === key}
                onClick={() => handleTimeframeChange(key)}
              >
                {label}
              </TimeframeButton>
            ))}
          </TimeframeSelector>
        )}
      </ChartHeader>
      
      <ChartCanvas>
        {isLoading && (
          <LoadingOverlay>
            <Spinner />
            <LoadingText>Загрузка данных...</LoadingText>
          </LoadingOverlay>
        )}
        
        {(!priceData || priceData.length === 0) && !isLoading ? (
          <LoadingOverlay>
            <p>Нет доступных данных для отображения</p>
          </LoadingOverlay>
        ) : (
          <Line data={chartData} options={chartOptions} />
        )}
      </ChartCanvas>
    </ChartContainer>
  );
};

export default PriceChart;