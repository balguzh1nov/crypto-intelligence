import React, { useState, useEffect, useMemo } from 'react';
import { Bar } from 'react-chartjs-2';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  BarElement, 
  Title, 
  Tooltip, 
  Legend,
  TimeScale 
} from 'chart.js';
import 'chartjs-adapter-date-fns';
import { CHART_COLORS, CHART_TIMEFRAMES } from '../../utils/constants';
import { formatLargeNumber } from '../../services/formatter';

// Регистрируем необходимые компоненты Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
);

/**
 * Компонент для отображения графика объема торгов криптовалюты
 * @param {Object} props - Свойства компонента
 * @param {Array} props.volumeData - Данные об объеме торгов [[timestamp, volume], ...]
 * @param {string} props.cryptoName - Название криптовалюты
 * @param {string} props.cryptoSymbol - Символ криптовалюты
 * @param {string} props.defaultTimeframe - Таймфрейм по умолчанию
 * @param {boolean} props.allowTimeframeChange - Флаг, разрешающий изменение таймфрейма
 * @param {Function} props.onTimeframeChange - Callback при изменении таймфрейма
 * @param {boolean} props.showAverage - Флаг для отображения средней линии объема
 */
const VolumeChart = ({ 
  volumeData = [], 
  cryptoName = 'Cryptocurrency', 
  cryptoSymbol = '',
  defaultTimeframe = CHART_TIMEFRAMES.ONE_WEEK,
  allowTimeframeChange = true,
  onTimeframeChange = null,
  showAverage = true
}) => {
  const [timeframe, setTimeframe] = useState(defaultTimeframe);

  useEffect(() => {
    if (onTimeframeChange) {
      onTimeframeChange(timeframe);
    }
  }, [timeframe, onTimeframeChange]);

  const handleTimeframeChange = (e) => {
    setTimeframe(e.target.value);
  };

  // Преобразуем данные для отображения на графике
  const chartData = useMemo(() => {
    if (!volumeData || !volumeData.length) {
      return {
        datasets: []
      };
    }

    // Форматируем данные объема
    const volumes = volumeData.map(item => ({
      x: new Date(item[0]),
      y: item[1]
    }));

    // Формируем цвета для столбцов
    // Используем зеленый для дней с ростом объема и красный для дней с падением
    const backgroundColors = volumes.map((volume, index) => {
      if (index === 0) return CHART_COLORS.PRIMARY_LIGHT;
      
      return volume.y >= volumes[index - 1].y 
        ? 'rgba(75, 192, 192, 0.6)' // зеленый для роста
        : 'rgba(255, 99, 132, 0.6)'; // красный для падения
    });

    const datasets = [
      {
        label: 'Volume',
        data: volumes,
        backgroundColor: backgroundColors,
        borderColor: 'rgba(0, 0, 0, 0.1)',
        borderWidth: 1
      }
    ];

    // Добавляем линию среднего объема, если нужно
    if (showAverage && volumes.length > 0) {
      // Рассчитываем средний объем
      const totalVolume = volumes.reduce((sum, volume) => sum + volume.y, 0);
      const averageVolume = totalVolume / volumes.length;

      datasets.push({
        label: 'Average Volume',
        data: volumes.map(volume => ({
          x: volume.x,
          y: averageVolume
        })),
        type: 'line',
        borderColor: CHART_COLORS.SECONDARY,
        borderWidth: 2,
        borderDash: [5, 5],
        fill: false,
        pointRadius: 0
      });
    }

    return {
      datasets
    };
  }, [volumeData, showAverage]);

  // Опции для графика
  const chartOptions = useMemo(() => {
    return {
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
                  'month'
          },
          title: {
            display: true,
            text: 'Date/Time'
          }
        },
        y: {
          title: {
            display: true,
            text: 'Volume (USD)'
          },
          ticks: {
            callback: function(value) {
              return formatLargeNumber(value);
            }
          }
        }
      },
      plugins: {
        legend: {
          position: 'top',
        },
        title: {
          display: true,
          text: `${cryptoName} ${cryptoSymbol ? `(${cryptoSymbol.toUpperCase()})` : ''} Trading Volume`
        },
        tooltip: {
          mode: 'index',
          intersect: false,
          callbacks: {
            label: function(context) {
              let label = context.dataset.label || '';
              if (label) {
                label += ': ';
              }
              if (context.parsed.y !== null) {
                label += new Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency: 'USD',
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0
                }).format(context.parsed.y);
              }
              return label;
            }
          }
        }
      }
    };
  }, [timeframe, cryptoName, cryptoSymbol]);

  // Статистика объемов
  const volumeStats = useMemo(() => {
    if (!volumeData || volumeData.length === 0) return {};
    
    // Текущий объем (последний в наборе данных)
    const currentVolume = volumeData[volumeData.length - 1][1];
    
    // Вычисляем среднее значение
    let totalVolume = 0;
    for (const item of volumeData) {
      totalVolume += item[1];
    }
    const averageVolume = totalVolume / volumeData.length;
    
    // Находим максимальный объем
    let maxVolume = 0;
    let maxVolumeDate = null;
    for (const item of volumeData) {
      if (item[1] > maxVolume) {
        maxVolume = item[1];
        maxVolumeDate = new Date(item[0]);
      }
    }
    
    // Вычисляем изменение объема (текущий относительно среднего)
    const volumeChangePercentage = ((currentVolume - averageVolume) / averageVolume) * 100;
    
    return {
      currentVolume,
      averageVolume,
      maxVolume,
      maxVolumeDate,
      volumeChangePercentage
    };
  }, [volumeData]);

  return (
    <div className="volume-chart">
      {allowTimeframeChange && (
        <div className="mb-3 d-flex justify-content-end">
          <select 
            className="form-select form-select-sm" 
            style={{ width: 'auto' }}
            value={timeframe}
            onChange={handleTimeframeChange}
          >
            <option value={CHART_TIMEFRAMES.ONE_DAY}>24 Hours</option>
            <option value={CHART_TIMEFRAMES.ONE_WEEK}>7 Days</option>
            <option value={CHART_TIMEFRAMES.ONE_MONTH}>30 Days</option>
            <option value={CHART_TIMEFRAMES.THREE_MONTHS}>90 Days</option>
            <option value={CHART_TIMEFRAMES.ONE_YEAR}>1 Year</option>
          </select>
        </div>
      )}
      
      <div className="chart-container" style={{ height: '400px' }}>
        {volumeData && volumeData.length > 0 ? (
          <Bar data={chartData} options={chartOptions} />
        ) : (
          <div className="d-flex justify-content-center align-items-center h-100">
            <p className="text-muted">No volume data available</p>
          </div>
        )}
      </div>
      
      {/* Информация о торговых объемах */}
      {volumeStats.currentVolume && (
        <div className="row mt-3">
          <div className="col-md-3">
            <div className="stat-card">
              <div className="stat-title">Current Volume (24h)</div>
              <div className="stat-value">
                {formatLargeNumber(volumeStats.currentVolume)}
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="stat-card">
              <div className="stat-title">Average Volume</div>
              <div className="stat-value">
                {formatLargeNumber(volumeStats.averageVolume)}
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="stat-card">
              <div className="stat-title">Max Volume</div>
              <div className="stat-value">
                {formatLargeNumber(volumeStats.maxVolume)}
                <div className="small text-muted">
                  {volumeStats.maxVolumeDate?.toLocaleDateString()}
                </div>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="stat-card">
              <div className="stat-title">Volume vs Average</div>
              <div className={`stat-value ${volumeStats.volumeChangePercentage >= 0 ? 'text-success' : 'text-danger'}`}>
                {volumeStats.volumeChangePercentage >= 0 ? '+' : ''}
                {volumeStats.volumeChangePercentage.toFixed(2)}%
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VolumeChart;