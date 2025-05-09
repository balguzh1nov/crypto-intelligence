import React, { useMemo } from 'react';
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
  TimeScale,
  Filler
} from 'chart.js';
import 'chartjs-adapter-date-fns';
import { CHART_COLORS } from '../../utils/constants';

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

/**
 * Компонент для отображения технических индикаторов на графике
 * @param {Object} props - Свойства компонента
 * @param {Array} props.priceData - Данные о ценах [[timestamp, price], ...]
 * @param {Object} props.indicators - Объект с индикаторами
 * @param {string} props.cryptoName - Название криптовалюты
 * @param {string} props.cryptoSymbol - Символ криптовалюты
 * @param {Array} props.selectedIndicators - Массив выбранных для отображения индикаторов
 */
const TechnicalIndicators = ({ 
  priceData = [], 
  indicators = {}, 
  cryptoName = 'Cryptocurrency', 
  cryptoSymbol = '',
  selectedIndicators = ['price', 'sma', 'ema']
}) => {
  // Функция для вычисления SMA
  const calculateSMA = (data, period) => {
    const result = [];
    for (let i = 0; i < data.length; i++) {
      if (i < period - 1) {
        result.push(null);
        continue;
      }
      
      let sum = 0;
      for (let j = 0; j < period; j++) {
        sum += data[i - j][1];
      }
      result.push([data[i][0], sum / period]);
    }
    return result;
  };
  
  // Функция для вычисления EMA
  const calculateEMA = (data, period) => {
    const result = [];
    const k = 2 / (period + 1);
    
    // Первое значение - SMA
    let ema = 0;
    let startIdx = 0;
    
    for (let i = 0; i < period; i++) {
      ema += data[i][1];
    }
    ema /= period;
    
    // Устанавливаем начальное EMA
    result.push([data[period - 1][0], ema]);
    startIdx = period;
    
    // Вычисляем остальные EMA
    for (let i = startIdx; i < data.length; i++) {
      const price = data[i][1];
      ema = (price - ema) * k + ema;
      result.push([data[i][0], ema]);
    }
    
    // Добавляем null в начало для выравнивания с исходными данными
    for (let i = 0; i < period - 1; i++) {
      result.unshift([data[i][0], null]);
    }
    
    return result;
  };
  
  // Функция для вычисления полос Боллинджера
  const calculateBollingerBands = (data, period = 20, multiplier = 2) => {
    const result = [];
    
    // Вычисляем SMA
    const smaValues = calculateSMA(data, period);
    
    for (let i = 0; i < data.length; i++) {
      if (i < period - 1) {
        result.push({
          timestamp: data[i][0],
          middle: null,
          upper: null,
          lower: null
        });
        continue;
      }
      
      // Вычисляем стандартное отклонение
      let sum = 0;
      for (let j = 0; j < period; j++) {
        sum += Math.pow(data[i - j][1] - smaValues[i][1], 2);
      }
      const stdDev = Math.sqrt(sum / period);
      
      // Вычисляем верхнюю и нижнюю полосы
      const middle = smaValues[i][1];
      const upper = middle + (stdDev * multiplier);
      const lower = middle - (stdDev * multiplier);
      
      result.push({
        timestamp: data[i][0],
        middle,
        upper,
        lower
      });
    }
    
    return result;
  };
  
  // Функция для вычисления RSI
  const calculateRSI = (data, period = 14) => {
    if (data.length < period + 1) {
      return data.map(item => [item[0], null]);
    }
    
    const result = [];
    
    // Вычисляем изменения цены
    const changes = [];
    for (let i = 1; i < data.length; i++) {
      changes.push(data[i][1] - data[i-1][1]);
    }
    
    // Первые записи будут null
    for (let i = 0; i < period; i++) {
      result.push([data[i][0], null]);
    }
    
    // Вычисляем первый RSI
    let gains = 0;
    let losses = 0;
    
    for (let i = 0; i < period; i++) {
      if (changes[i] >= 0) {
        gains += changes[i];
      } else {
        losses += Math.abs(changes[i]);
      }
    }
    
    gains = gains / period;
    losses = losses / period;
    
    let rs = gains / losses;
    let rsi = 100 - (100 / (1 + rs));
    
    result.push([data[period][0], rsi]);
    
    // Вычисляем остальные RSI
    for (let i = period + 1; i < data.length; i++) {
      const change = changes[i - 1];
      let gain = 0;
      let loss = 0;
      
      if (change >= 0) {
        gain = change;
      } else {
        loss = Math.abs(change);
      }
      
      gains = (gains * (period - 1) + gain) / period;
      losses = (losses * (period - 1) + loss) / period;
      
      rs = gains / losses;
      rsi = 100 - (100 / (1 + rs));
      
      result.push([data[i][0], rsi]);
    }
    
    return result;
  };
  
  // Подготавливаем данные для графика
  const chartData = useMemo(() => {
    if (!priceData || priceData.length === 0) {
      return { datasets: [] };
    }
    
    // Здесь будут храниться все наборы данных для отображения
    const datasets = [];
    
    // Добавляем цену, если она выбрана
    if (selectedIndicators.includes('price')) {
      datasets.push({
        label: `${cryptoName} Price`,
        data: priceData.map(item => ({
          x: new Date(item[0]),
          y: item[1]
        })),
        borderColor: CHART_COLORS.PRIMARY,
        backgroundColor: 'transparent',
        borderWidth: 2,
        tension: 0.1,
        pointRadius: 0,
        pointHoverRadius: 5,
        yAxisID: 'y'
      });
    }
    
    // Добавляем SMA, если он выбран
    if (selectedIndicators.includes('sma')) {
      // Сначала проверяем, есть ли SMA в предоставленных индикаторах
      if (indicators.sma && Array.isArray(indicators.sma)) {
        datasets.push({
          label: 'SMA (20)',
          data: indicators.sma.map(item => ({
            x: new Date(item[0]),
            y: item[1]
          })),
          borderColor: CHART_COLORS.SUCCESS,
          backgroundColor: 'transparent',
          borderWidth: 2,
          tension: 0.1,
          pointRadius: 0,
          borderDash: [5, 5],
          yAxisID: 'y'
        });
      } else {
        // Если SMA не предоставлен, вычисляем его
        const smaData = calculateSMA(priceData, 20);
        datasets.push({
          label: 'SMA (20)',
          data: smaData.map(item => ({
            x: new Date(item[0]),
            y: item[1]
          })),
          borderColor: CHART_COLORS.SUCCESS,
          backgroundColor: 'transparent',
          borderWidth: 2,
          tension: 0.1,
          pointRadius: 0,
          borderDash: [5, 5],
          yAxisID: 'y'
        });
      }
    }
    
    // Добавляем EMA, если он выбран
    if (selectedIndicators.includes('ema')) {
      // Сначала проверяем, есть ли EMA в предоставленных индикаторах
      if (indicators.ema && Array.isArray(indicators.ema)) {
        datasets.push({
          label: 'EMA (20)',
          data: indicators.ema.map(item => ({
            x: new Date(item[0]),
            y: item[1]
          })),
          borderColor: CHART_COLORS.SECONDARY,
          backgroundColor: 'transparent',
          borderWidth: 2,
          tension: 0.1,
          pointRadius: 0,
          yAxisID: 'y'
        });
      } else {
        // Если EMA не предоставлен, вычисляем его
        const emaData = calculateEMA(priceData, 20);
        datasets.push({
          label: 'EMA (20)',
          data: emaData.map(item => ({
            x: new Date(item[0]),
            y: item[1]
          })),
          borderColor: CHART_COLORS.SECONDARY,
          backgroundColor: 'transparent',
          borderWidth: 2,
          tension: 0.1,
          pointRadius: 0,
          yAxisID: 'y'
        });
      }
    }
    
    // Добавляем полосы Боллинджера, если они выбраны
    if (selectedIndicators.includes('bollinger')) {
      // Сначала проверяем, есть ли полосы Боллинджера в предоставленных индикаторах
      if (indicators.bollinger) {
        // Средняя полоса
        datasets.push({
          label: 'Bollinger Middle',
          data: indicators.bollinger.map(item => ({
            x: new Date(item.timestamp),
            y: item.middle
          })),
          borderColor: 'rgba(100, 100, 100, 0.5)',
          backgroundColor: 'transparent',
          borderWidth: 1,
          tension: 0.1,
          pointRadius: 0,
          yAxisID: 'y'
        });
        
        // Верхняя полоса
        datasets.push({
          label: 'Bollinger Upper',
          data: indicators.bollinger.map(item => ({
            x: new Date(item.timestamp),
            y: item.upper
          })),
          borderColor: 'rgba(100, 100, 100, 0.5)',
          backgroundColor: 'transparent',
          borderWidth: 1,
          tension: 0.1,
          pointRadius: 0,
          borderDash: [5, 5],
          yAxisID: 'y'
        });
        
        // Нижняя полоса
        datasets.push({
          label: 'Bollinger Lower',
          data: indicators.bollinger.map(item => ({
            x: new Date(item.timestamp),
            y: item.lower
          })),
          borderColor: 'rgba(100, 100, 100, 0.5)',
          backgroundColor: 'transparent',
          borderWidth: 1,
          tension: 0.1,
          pointRadius: 0,
          borderDash: [5, 5],
          yAxisID: 'y'
        });
        
        // Заливка между полосами
        datasets.push({
          label: 'Bollinger Band',
          data: indicators.bollinger.map(item => ({
            x: new Date(item.timestamp),
            y: item.upper
          })),
          borderColor: 'transparent',
          pointRadius: 0,
          fill: '+1',
          backgroundColor: 'rgba(200, 200, 200, 0.2)',
          yAxisID: 'y'
        });
        
        datasets.push({
          label: 'Bollinger Lower',
          data: indicators.bollinger.map(item => ({
            x: new Date(item.timestamp),
            y: item.lower
          })),
          borderColor: 'transparent',
          pointRadius: 0,
          yAxisID: 'y',
          fill: false
        });
      } else {
        // Если полосы Боллинджера не предоставлены, вычисляем их
        const bbData = calculateBollingerBands(priceData);
        
        // Средняя полоса
        datasets.push({
          label: 'Bollinger Middle',
          data: bbData.map(item => ({
            x: new Date(item.timestamp),
            y: item.middle
          })),
          borderColor: 'rgba(100, 100, 100, 0.5)',
          backgroundColor: 'transparent',
          borderWidth: 1,
          tension: 0.1,
          pointRadius: 0,
          yAxisID: 'y'
        });
        
        // Верхняя полоса
        datasets.push({
          label: 'Bollinger Upper',
          data: bbData.map(item => ({
            x: new Date(item.timestamp),
            y: item.upper
          })),
          borderColor: 'rgba(100, 100, 100, 0.5)',
          backgroundColor: 'transparent',
          borderWidth: 1,
          tension: 0.1,
          pointRadius: 0,
          borderDash: [5, 5],
          yAxisID: 'y'
        });
        
        // Нижняя полоса
        datasets.push({
          label: 'Bollinger Lower',
          data: bbData.map(item => ({
            x: new Date(item.timestamp),
            y: item.lower
          })),
          borderColor: 'rgba(100, 100, 100, 0.5)',
          backgroundColor: 'transparent',
          borderWidth: 1,
          tension: 0.1,
          pointRadius: 0,
          borderDash: [5, 5],
          yAxisID: 'y'
        });
        
        // Заливка между полосами
        datasets.push({
          label: 'Bollinger Band',
          data: bbData.map(item => ({
            x: new Date(item.timestamp),
            y: item.upper
          })),
          borderColor: 'transparent',
          pointRadius: 0,
          fill: '+1',
          backgroundColor: 'rgba(200, 200, 200, 0.2)',
          yAxisID: 'y'
        });
        
        datasets.push({
          label: 'Bollinger Lower',
          data: bbData.map(item => ({
            x: new Date(item.timestamp),
            y: item.lower
          })),
          borderColor: 'transparent',
          pointRadius: 0,
          yAxisID: 'y',
          fill: false
        });
      }
    }
    
    // Добавляем RSI, если он выбран
    if (selectedIndicators.includes('rsi')) {
      // Сначала проверяем, есть ли RSI в предоставленных индикаторах
      if (indicators.rsi && Array.isArray(indicators.rsi)) {
        datasets.push({
          label: 'RSI (14)',
          data: indicators.rsi.map(item => ({
            x: new Date(item[0]),
            y: item[1]
          })),
          borderColor: CHART_COLORS.WARNING,
          backgroundColor: 'transparent',
          borderWidth: 2,
          tension: 0.1,
          pointRadius: 0,
          yAxisID: 'rsi'
        });
      } else {
        // Если RSI не предоставлен, вычисляем его
        const rsiData = calculateRSI(priceData);
        datasets.push({
          label: 'RSI (14)',
          data: rsiData.map(item => ({
            x: new Date(item[0]),
            y: item[1]
          })),
          borderColor: CHART_COLORS.WARNING,
          backgroundColor: 'transparent',
          borderWidth: 2,
          tension: 0.1,
          pointRadius: 0,
          yAxisID: 'rsi'
        });
      }
      
      // Добавляем линии перекупленности (70) и перепроданности (30)
      datasets.push({
        label: 'Overbought (70)',
        data: priceData.map(item => ({
          x: new Date(item[0]),
          y: 70
        })),
        borderColor: 'rgba(255, 0, 0, 0.3)',
        backgroundColor: 'transparent',
        borderWidth: 1,
        tension: 0,
        pointRadius: 0,
        borderDash: [3, 3],
        yAxisID: 'rsi'
      });
      
      datasets.push({
        label: 'Oversold (30)',
        data: priceData.map(item => ({
          x: new Date(item[0]),
          y: 30
        })),
        borderColor: 'rgba(0, 255, 0, 0.3)',
        backgroundColor: 'transparent',
        borderWidth: 1,
        tension: 0,
        pointRadius: 0,
        borderDash: [3, 3],
        yAxisID: 'rsi'
      });
    }
    
    return { datasets };
  }, [priceData, indicators, selectedIndicators, cryptoName]);
  
  // Опции для графика
  const chartOptions = useMemo(() => {
    const options = {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false
      },
      scales: {
        x: {
          type: 'time',
          time: {
            unit: 'day'
          },
          title: {
            display: true,
            text: 'Date/Time'
          }
        },
        y: {
          type: 'linear',
          display: true,
          position: 'left',
          title: {
            display: true,
            text: 'Price (USD)'
          },
          grid: {
            drawOnChartArea: true
          }
        }
      },
      plugins: {
        legend: {
          position: 'top',
          labels: {
            filter: function(item, chart) {
              // Скрываем некоторые элементы из легенды
              return !item.text.includes('Band') && 
                     !item.text.includes('Lower') && 
                     !item.text.includes('Upper') && 
                     !item.text.includes('Overbought') && 
                     !item.text.includes('Oversold');
            }
          }
        },
        title: {
          display: true,
          text: `${cryptoName} ${cryptoSymbol ? `(${cryptoSymbol.toUpperCase()})` : ''} Technical Indicators`
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
                if (context.dataset.yAxisID === 'rsi') {
                  label += context.parsed.y.toFixed(2);
                } else {
                  label += new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: 'USD'
                  }).format(context.parsed.y);
                }
              }
              return label;
            },
            filter: function(tooltipItem) {
              // Фильтруем элементы, которые не нужно показывать в тултипе
              return !tooltipItem.dataset.label.includes('Band') && 
                     !(tooltipItem.dataset.label.includes('Overbought')) && 
                     !(tooltipItem.dataset.label.includes('Oversold'));
            }
          }
        }
      }
    };
    
    // Добавляем ось для RSI, если он выбран
    if (selectedIndicators.includes('rsi')) {
      options.scales.rsi = {
        type: 'linear',
        display: true,
        position: 'right',
        min: 0,
        max: 100,
        title: {
          display: true,
          text: 'RSI'
        },
        grid: {
          drawOnChartArea: false
        }
      };
    }
    
    return options;
  }, [selectedIndicators, cryptoName, cryptoSymbol]);
  
  return (
    <div className="technical-indicators-chart">
      <div className="chart-container" style={{ height: '500px' }}>
        {priceData && priceData.length > 0 ? (
          <Line data={chartData} options={chartOptions} />
        ) : (
          <div className="d-flex justify-content-center align-items-center h-100">
            <p className="text-muted">No data available for technical indicators</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TechnicalIndicators;