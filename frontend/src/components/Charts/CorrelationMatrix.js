import React, { useMemo } from 'react';
import { Scatter } from 'react-chartjs-2';
import { 
  Chart as ChartJS, 
  LinearScale, 
  PointElement, 
  LineElement, 
  Tooltip, 
  Legend 
} from 'chart.js';
import { CHART_COLORS } from '../../utils/constants';

// Регистрируем необходимые компоненты Chart.js
ChartJS.register(
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend
);

/**
 * Компонент для отображения корреляционной матрицы между различными криптовалютами
 * @param {Object} props - Свойства компонента
 * @param {Array} props.correlationData - Данные о корреляции
 * @param {Array} props.selectedCryptos - Массив выбранных криптовалют для отображения
 */
const CorrelationMatrix = ({ 
  correlationData = [], 
  selectedCryptos = [] 
}) => {
  // Функция для вычисления коэффициента корреляции Пирсона
  const calculateCorrelation = (arr1, arr2) => {
    if (arr1.length !== arr2.length) {
      throw new Error('Arrays must have the same length');
    }
    
    const n = arr1.length;
    
    // Вычисляем средние значения
    const mean1 = arr1.reduce((sum, val) => sum + val, 0) / n;
    const mean2 = arr2.reduce((sum, val) => sum + val, 0) / n;
    
    // Вычисляем числитель и знаменатель для формулы корреляции
    let numerator = 0;
    let denom1 = 0;
    let denom2 = 0;
    
    for (let i = 0; i < n; i++) {
      const diff1 = arr1[i] - mean1;
      const diff2 = arr2[i] - mean2;
      
      numerator += diff1 * diff2;
      denom1 += diff1 * diff1;
      denom2 += diff2 * diff2;
    }
    
    // Вычисляем корреляцию
    const correlation = numerator / Math.sqrt(denom1 * denom2);
    
    return correlation;
  };
  
  // Подготавливаем данные для матрицы корреляции
  const correlationMatrix = useMemo(() => {
    if (!correlationData || correlationData.length === 0 || selectedCryptos.length < 2) {
      return [];
    }
    
    const matrix = [];
    
    // Для каждой пары криптовалют
    for (let i = 0; i < selectedCryptos.length; i++) {
      const crypto1 = selectedCryptos[i];
      
      for (let j = i + 1; j < selectedCryptos.length; j++) {
        const crypto2 = selectedCryptos[j];
        
        // Получаем данные о ценах для обеих криптовалют
        const crypto1Data = correlationData.find(data => data.id === crypto1.id);
        const crypto2Data = correlationData.find(data => data.id === crypto2.id);
        
        if (!crypto1Data || !crypto2Data) continue;
        
        // Собираем цены в массивы
        const prices1 = [];
        const prices2 = [];
        
        // Находим общие даты и соответствующие цены
        for (const timestamp in crypto1Data.prices) {
          if (crypto2Data.prices[timestamp]) {
            prices1.push(crypto1Data.prices[timestamp]);
            prices2.push(crypto2Data.prices[timestamp]);
          }
        }
        
        // Вычисляем корреляцию, если достаточно данных
        if (prices1.length > 5) {
          const correlation = calculateCorrelation(prices1, prices2);
          
          matrix.push({
            crypto1Id: crypto1.id,
            crypto2Id: crypto2.id,
            crypto1Name: crypto1.name,
            crypto2Name: crypto2.name,
            crypto1Symbol: crypto1.symbol,
            crypto2Symbol: crypto2.symbol,
            correlation: correlation,
            dataPoints: prices1.length
          });
        }
      }
    }
    
    return matrix;
  }, [correlationData, selectedCryptos]);
  
  // Подготавливаем данные для точечного графика корреляции
  const scatterData = useMemo(() => {
    if (!correlationData || correlationData.length === 0 || selectedCryptos.length < 2) {
      return { datasets: [] };
    }
    
    const datasets = [];
    
    // Создаем набор данных для каждой пары криптовалют
    for (const correlation of correlationMatrix) {
      // Получаем данные о ценах для обеих криптовалют
      const crypto1Data = correlationData.find(data => data.id === correlation.crypto1Id);
      const crypto2Data = correlationData.find(data => data.id === correlation.crypto2Id);
      
      if (!crypto1Data || !crypto2Data) continue;
      
      // Собираем точки для графика
      const points = [];
      
      // Находим общие даты и соответствующие цены
      for (const timestamp in crypto1Data.prices) {
        if (crypto2Data.prices[timestamp]) {
          points.push({
            x: crypto1Data.prices[timestamp],
            y: crypto2Data.prices[timestamp]
          });
        }
      }
      
      const baseColor = CHART_COLORS.PRIMARY;
      
      // Добавляем набор данных
      datasets.push({
        label: `${correlation.crypto1Symbol.toUpperCase()} vs ${correlation.crypto2Symbol.toUpperCase()} (r = ${correlation.correlation.toFixed(2)})`,
        data: points,
        backgroundColor: baseColor,
        pointRadius: 5,
        pointHoverRadius: 7
      });
    }
    
    return { datasets };
  }, [correlationMatrix, correlationData, selectedCryptos]);
  
  // Опции для точечного графика
  const scatterOptions = useMemo(() => {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
        },
        title: {
          display: true,
          text: 'Cryptocurrency Price Correlation'
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const label = context.dataset.label || '';
              const point = context.parsed;
              return `${label}: (${point.x.toFixed(2)}, ${point.y.toFixed(2)})`;
            }
          }
        }
      },
      scales: {
        x: {
          title: {
            display: true,
            text: selectedCryptos.length > 0 ? selectedCryptos[0].symbol.toUpperCase() : 'Crypto 1'
          }
        },
        y: {
          title: {
            display: true,
            text: selectedCryptos.length > 1 ? selectedCryptos[1].symbol.toUpperCase() : 'Crypto 2'
          }
        }
      }
    };
  }, [selectedCryptos]);
  
  // Создаем таблицу с коэффициентами корреляции
  const renderCorrelationTable = () => {
    return (
      <div className="table-responsive">
        <table className="table table-striped table-hover">
          <thead>
            <tr>
              <th>Crypto Pair</th>
              <th>Correlation</th>
              <th>Strength</th>
              <th>Data Points</th>
            </tr>
          </thead>
          <tbody>
            {correlationMatrix.map((correlation, index) => {
              // Определяем силу корреляции
              let strength = "Weak";
              let strengthClass = "text-muted";
              
              const absCorrelation = Math.abs(correlation.correlation);
              
              if (absCorrelation > 0.7) {
                strength = "Strong";
                strengthClass = correlation.correlation > 0 ? "text-success" : "text-danger";
              } else if (absCorrelation > 0.3) {
                strength = "Moderate";
                strengthClass = correlation.correlation > 0 ? "text-primary" : "text-warning";
              }
              
              return (
                <tr key={index}>
                  <td>
                    {correlation.crypto1Symbol.toUpperCase()} / {correlation.crypto2Symbol.toUpperCase()}
                  </td>
                  <td className={strengthClass}>{correlation.correlation.toFixed(3)}</td>
                  <td className={strengthClass}>{strength}</td>
                  <td>{correlation.dataPoints}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };
  
  return (
    <div className="correlation-matrix">
      {selectedCryptos.length < 2 ? (
        <div className="alert alert-info">
          Please select at least two cryptocurrencies to display correlation matrix.
        </div>
      ) : correlationMatrix.length === 0 ? (
        <div className="alert alert-warning">
          Not enough data to calculate correlations.
        </div>
      ) : (
        <div>
          <div className="row">
            <div className="col-md-8">
              <div className="chart-container" style={{ height: '400px' }}>
                <Scatter data={scatterData} options={scatterOptions} />
              </div>
            </div>
            <div className="col-md-4">
              <div className="card">
                <div className="card-header">
                  <h5 className="mb-0">Correlation Coefficients</h5>
                </div>
                <div className="card-body p-0">
                  {renderCorrelationTable()}
                </div>
                <div className="card-footer">
                  <small className="text-muted">
                    Correlation ranges from -1 (perfect negative) to 1 (perfect positive).
                    Values close to 0 indicate no correlation.
                  </small>
                </div>
              </div>
            </div>
          </div>
          
          <div className="row mt-4">
            <div className="col-12">
              <div className="card">
                <div className="card-header">
                  <h5 className="mb-0">Interpretation</h5>
                </div>
                <div className="card-body">
                  <p>
                    <strong>Positive Correlation (>0):</strong> Assets tend to move in the same direction. 
                    Higher values indicate stronger relationship.
                  </p>
                  <p>
                    <strong>Negative Correlation (&lt;0):</strong> Assets tend to move in opposite directions. 
                    Lower values indicate stronger inverse relationship.
                  </p>
                  <p>
                    <strong>No Correlation (≈0):</strong> Assets move independently of each other.
                  </p>
                  <p className="mb-0">
                    <strong>Note:</strong> Correlation does not imply causation, and relationships 
                    between assets can change over time.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CorrelationMatrix;